const { app, BrowserWindow, ipcMain, Menu, Notification, screen, nativeTheme } = require('electron')
const path = require('path')
const fs = require('fs')

const IS_MAC = process.platform === 'darwin'
const { LANGS, t, detectLang } = require('./renderer/i18n.js')

// ---------------------------------------------------------------- constants
const PAD = 18          // transparent margin around the body, room for CSS shadow
const NUB_RATIO = 0.10  // height of the top button strip, as a fraction of unit
const TIP_RATIO = 0.26  // reserved strip above the widget for the hover tooltip
const SIZE_PRESETS = { small: 140, medium: 200, large: 280, xlarge: 380 }

const DEFAULTS = {
  lang: null,              // resolved from the system locale on first launch
  mode: 'full',            // 'full' | 'dial'
  sizeUnit: 200,
  schemeId: 'blush',
  customSchemes: [],
  quote: 'One thing at a time.',
  label: 'Sweep',
  sound: true,
  clickSound: true,
  notify: true,
  idleFade: true,
  opacity: 1,
  idleOpacity: 0.4,
  lastMinutes: 25,
  bounds: null
}

// ---------------------------------------------------------------- storage
const userDir = app.getPath('userData')
const settingsFile = path.join(userDir, 'settings.json')
const historyFile = path.join(userDir, 'history.json')

function readJSON (file, fallback) {
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
  } catch {
    return { ...fallback }
  }
}

function writeJSON (file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('failed to write', file, err)
  }
}

// The app was called "Study Timer" before it was called Sweep, and the storage
// directory is derived from the app name — so bring the old files across once.
function migrateFromOldName () {
  const legacyDir = path.join(path.dirname(userDir), 'Study Timer')
  if (!fs.existsSync(legacyDir)) return
  for (const file of ['settings.json', 'history.json']) {
    const from = path.join(legacyDir, file)
    const to = path.join(userDir, file)
    if (fs.existsSync(from) && !fs.existsSync(to)) {
      try {
        fs.mkdirSync(userDir, { recursive: true })
        fs.copyFileSync(from, to)
      } catch (err) {
        console.warn('could not migrate', file, err)
      }
    }
  }
}
migrateFromOldName()

let settings = readJSON(settingsFile, DEFAULTS)
let history = readJSON(historyFile, {})

let saveTimer = null
function persistSettings () {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => writeJSON(settingsFile, settings), 300)
}

// ---------------------------------------------------------------- windows
let timerWin = null
let settingsWin = null
let historyWin = null

// The tooltip sits above the widget rather than over the dial, so the window
// carries a taller transparent strip on top than it does anywhere else.
function winSize (mode, unit) {
  const tip = Math.round(unit * TIP_RATIO)
  const body = mode === 'full' ? unit + unit * NUB_RATIO : unit
  return {
    width: Math.round(unit + PAD * 2),
    height: Math.round(tip + body + PAD)
  }
}

function createTimerWindow () {
  const { width, height } = winSize(settings.mode, settings.sizeUnit)
  const saved = settings.bounds

  timerWin = new BrowserWindow({
    width,
    height,
    x: saved ? saved.x : undefined,
    y: saved ? saved.y : undefined,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,          // shadow is drawn in CSS so it follows the round shape
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    acceptFirstMouse: true,    // a click lands even when the window is not focused
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  timerWin.loadFile(path.join(__dirname, 'renderer', 'index.html'))

  // Float above everything. On macOS that extends to every Space, including
  // other apps' fullscreen Spaces; Windows has no equivalent for pinning a
  // window across virtual desktops, so there it stays on the desktop it opened.
  timerWin.setAlwaysOnTop(true, 'screen-saver')
  if (IS_MAC) timerWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  timerWin.once('ready-to-show', () => timerWin.showInactive())

  const rememberBounds = () => {
    if (!timerWin || timerWin.isDestroyed()) return
    const b = timerWin.getBounds()
    settings.bounds = { x: b.x, y: b.y }
    persistSettings()
  }
  timerWin.on('moved', rememberBounds)
  timerWin.on('closed', () => { timerWin = null })
}

function createAuxWindow (ref, file, opts) {
  if (ref && !ref.isDestroyed()) {
    ref.show()
    ref.focus()
    return ref
  }
  const win = new BrowserWindow({
    width: opts.width,
    height: opts.height,
    minWidth: opts.minWidth || opts.width,
    minHeight: 360,
    title: opts.title,
    autoHideMenuBar: true,
    ...(IS_MAC
      ? { titleBarStyle: 'hiddenInset', transparent: true, vibrancy: 'sidebar', backgroundColor: '#00000000' }
      : { backgroundColor: nativeTheme.shouldUseDarkColors ? '#1f1f22' : '#f4f4f6' }),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.loadFile(path.join(__dirname, 'renderer', file))
  win.once('ready-to-show', () => {
    if (IS_MAC) app.focus({ steal: true })   // an accessory app has to ask for focus
    win.show()
  })
  return win
}

function openSettings () {
  settingsWin = createAuxWindow(settingsWin, 'settings.html', {
    width: 420, height: 640, title: t(settings.lang, 'win.settings')
  })
  settingsWin.on('closed', () => { settingsWin = null })
}

function openHistory () {
  historyWin = createAuxWindow(historyWin, 'history.html', {
    width: 520, height: 620, minWidth: 420, title: t(settings.lang, 'win.history')
  })
  historyWin.on('closed', () => { historyWin = null })
}

function broadcast (channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}

// ---------------------------------------------------------------- ipc
ipcMain.handle('settings:get', () => settings)

ipcMain.handle('settings:set', (_e, patch) => {
  const sizeChanged = ('sizeUnit' in patch && patch.sizeUnit !== settings.sizeUnit) ||
                      ('mode' in patch && patch.mode !== settings.mode)
  settings = { ...settings, ...patch }
  persistSettings()
  if (sizeChanged) applyWindowSize()
  if ('lang' in patch) applyLanguage()
  broadcast('settings:changed', settings)
  return settings
})

function applyWindowSize () {
  if (!timerWin || timerWin.isDestroyed()) return
  const { width, height } = winSize(settings.mode, settings.sizeUnit)
  const b = timerWin.getBounds()
  // keep the visual centre anchored so resizing does not walk the window across the screen
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  const disp = screen.getDisplayMatching(b).workArea
  let x = Math.round(cx - width / 2)
  let y = Math.round(cy - height / 2)
  x = Math.min(Math.max(x, disp.x), disp.x + disp.width - width)
  y = Math.min(Math.max(y, disp.y), disp.y + disp.height - height)
  timerWin.setBounds({ x, y, width, height })
}

ipcMain.on('window:move-by', (_e, dx, dy) => {
  if (!timerWin || timerWin.isDestroyed()) return
  const [x, y] = timerWin.getPosition()
  timerWin.setPosition(Math.round(x + dx), Math.round(y + dy))
})

let ignoring = false
ipcMain.on('window:ignore-mouse', (_e, ignore) => {
  if (!timerWin || timerWin.isDestroyed() || ignore === ignoring) return
  ignoring = ignore
  timerWin.setIgnoreMouseEvents(ignore, { forward: true })
})

ipcMain.on('window:raise', () => {
  if (!timerWin || timerWin.isDestroyed()) return
  timerWin.setAlwaysOnTop(true, 'screen-saver')
  timerWin.showInactive()
})

ipcMain.on('app:quit', () => app.quit())
ipcMain.on('settings:open', openSettings)
ipcMain.on('history:open', openHistory)

ipcMain.on('notify', (_e, { minutes }) => {
  if (!settings.notify || !Notification.isSupported()) return
  new Notification({
    title: t(settings.lang, 'notify.title'),
    body: t(settings.lang, 'notify.body', { m: minutes }),
    silent: true
  }).show()
})

// ---------------------------------------------------------------- history
function dateKey (ts) {
  const d = new Date(ts)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

ipcMain.handle('history:add', (_e, { minutes }) => {
  const now = Date.now()
  const key = dateKey(now)
  if (!history[key]) history[key] = []
  history[key].push({ t: now, m: minutes })
  writeJSON(historyFile, history)
  broadcast('history:changed', history)
  return history
})

ipcMain.handle('history:get', () => history)

// ---------------------------------------------------------------- context menu
function schemeMenu () {
  const { PRESETS } = require('./renderer/schemes.js')
  const all = [...PRESETS, ...(settings.customSchemes || [])]
  return all.map(s => ({
    label: s.name,
    type: 'radio',
    checked: settings.schemeId === s.id,
    click: () => {
      settings.schemeId = s.id
      persistSettings()
      broadcast('settings:changed', settings)
    }
  }))
}

function languageMenu () {
  return LANGS.map(l => ({
    label: l.name,
    type: 'radio',
    checked: settings.lang === l.id,
    click: () => {
      settings.lang = l.id
      persistSettings()
      applyLanguage()
      broadcast('settings:changed', settings)
    }
  }))
}

ipcMain.on('menu:show', () => {
  const L = key => t(settings.lang, key)
  const template = [
    {
      label: settings.mode === 'full' ? L('menu.toDial') : L('menu.toFull'),
      click: () => {
        settings.mode = settings.mode === 'full' ? 'dial' : 'full'
        persistSettings()
        applyWindowSize()
        broadcast('settings:changed', settings)
      }
    },
    { type: 'separator' },
    {
      label: L('menu.size'),
      submenu: Object.entries(SIZE_PRESETS).map(([key, unit]) => ({
        label: L('size.' + key),
        type: 'radio',
        checked: settings.sizeUnit === unit,
        click: () => {
          settings.sizeUnit = unit
          persistSettings()
          applyWindowSize()
          broadcast('settings:changed', settings)
        }
      }))
    },
    { label: L('menu.colors'), submenu: schemeMenu() },
    { label: L('menu.language'), submenu: languageMenu() },
    { type: 'separator' },
    { label: L('menu.history'), click: openHistory },
    { label: L('menu.settings'), accelerator: 'CommandOrControl+,', click: openSettings },
    { type: 'separator' },
    { label: L('menu.quit'), accelerator: 'CommandOrControl+Q', click: () => app.quit() }
  ]
  Menu.buildFromTemplate(template).popup({ window: timerWin })
})

// The app menu and the auxiliary window titles both need rebuilding when the
// language changes, since neither is a page we can just re-render.
function applyLanguage () {
  const L = key => t(settings.lang, key)
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Sweep',
      submenu: [
        { label: L('menu.settings'), accelerator: 'CommandOrControl+,', click: openSettings },
        { label: L('menu.history'), click: openHistory },
        { type: 'separator' },
        { role: 'quit', label: L('menu.quit') }
      ]
    },
    {
      label: L('menu.edit'),
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    }
  ]))
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.setTitle(L('win.settings'))
  if (historyWin && !historyWin.isDestroyed()) historyWin.setTitle(L('win.history'))
}

// ---------------------------------------------------------------- lifecycle
app.whenReady().then(() => {
  if (IS_MAC) app.dock.hide()
  // without this, Windows labels notifications with the executable's id
  app.setAppUserModelId('com.castalia.sweep')
  if (!settings.lang) {
    settings.lang = detectLang(app.getLocale())
    persistSettings()
  }
  applyLanguage()
  createTimerWindow()
})

app.on('window-all-closed', () => app.quit())
app.on('activate', () => { if (!timerWin) createTimerWindow() })
