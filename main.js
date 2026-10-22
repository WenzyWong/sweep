const { app, BrowserWindow, ipcMain, Menu, Notification, Tray, nativeImage, screen, nativeTheme, systemPreferences } = require('electron')
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
  menuBar: false,          // live in the menu bar / system tray instead of floating
  trayTime: true,          // macOS: show the time left beside the menu bar ring
  bounds: null
}

// ---------------------------------------------------------------- storage
const userDir = app.getPath('userData')
const settingsFile = path.join(userDir, 'settings.json')
const historyFile = path.join(userDir, 'history.json')
// A run in progress, so that a crash or a quit does not erase it silently.
const pendingFile = path.join(userDir, 'pending.json')

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

// If a run was in flight when the app last stopped and its clock has since run
// out, it is worth offering to log. One that had time left is simply gone.
let recoverable = null
try {
  const pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8'))
  if (pending && pending.endAt <= Date.now()) recoverable = pending
} catch { /* no run was in flight */ }
try { fs.unlinkSync(pendingFile) } catch { /* nothing to clear */ }

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
    show: false,               // shown once loaded, and not at all in the menu bar
    acceptFirstMouse: true,    // a click lands even when the window is not focused
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // In the menu bar this window is hidden but still runs the countdown, and
      // Chromium would otherwise slow a hidden page's timers to a crawl.
      backgroundThrottling: false
    }
  })

  timerWin.loadFile(path.join(__dirname, 'renderer', 'index.html'))

  // Float above everything. On macOS that extends to every Space, including
  // other apps' fullscreen Spaces; Windows has no equivalent for pinning a
  // window across virtual desktops, so there it stays on the desktop it opened.
  timerWin.setAlwaysOnTop(true, 'screen-saver')
  if (IS_MAC) timerWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  timerWin.once('ready-to-show', () => { if (!settings.menuBar) timerWin.showInactive() })

  const rememberBounds = () => {
    if (!timerWin || timerWin.isDestroyed()) return
    const b = timerWin.getBounds()
    settings.bounds = { x: b.x, y: b.y }
    persistSettings()
  }
  timerWin.on('moved', rememberBounds)

  // The countdown lives in this page, so if its renderer dies the run dies with
  // it, and the menu bar would sit frozen on its last reading. Reload it; the
  // new page picks the run back up from what the old one last reported.
  let crashes = []
  timerWin.webContents.on('render-process-gone', (_e, details) => {
    console.error('timer page gone:', details.reason, details.exitCode)
    if (details.reason === 'clean-exit' || !timerWin || timerWin.isDestroyed()) return
    const now = Date.now()
    crashes = crashes.filter(t => now - t < 60000)
    crashes.push(now)
    if (crashes.length > 3) return   // crashing on load; reloading again will not help
    timerWin.webContents.reload()
  })
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
  settingsWin.on('closed', () => {
    settingsWin = null
    broadcastPreview(null)
  })
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
  if ('menuBar' in patch) applyPlacement()
  if ('trayTime' in patch) paintTray()
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
  if (!timerWin || timerWin.isDestroyed() || settings.menuBar) return
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

// ---------------------------------------------------------------- crash recovery
ipcMain.on('run:started', (_e, { endAt, minutes }) => {
  writeJSON(pendingFile, { endAt, minutes })
})

ipcMain.on('run:cleared', () => {
  try { fs.unlinkSync(pendingFile) } catch { /* already gone */ }
})

ipcMain.handle('run:recoverable', () => recoverable)

ipcMain.handle('run:recover', (_e, accept) => {
  const pending = recoverable
  recoverable = null
  if (!accept || !pending) return history
  const key = dateKey(pending.endAt)
  if (!history[key]) history[key] = []
  history[key].push({ t: pending.endAt, m: pending.minutes })
  history[key].sort((a, b) => a.t - b.t)
  writeJSON(historyFile, history)
  broadcast('history:changed', history)
  return history
})

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

// A colourway being edited in the settings window, shown on the dial without
// being saved. Null puts the real scheme back.
function broadcastPreview (scheme) {
  if (timerWin && !timerWin.isDestroyed()) timerWin.webContents.send('preview:scheme', scheme)
}

ipcMain.on('preview:scheme', (_e, scheme) => broadcastPreview(scheme))

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
    { label: L(IS_MAC ? 'menu.toTray' : 'menu.toTrayWin'), click: () => setMenuBar(true) },
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

// ---------------------------------------------------------------- menu bar
// The timer can live in the menu bar (the notification area on Windows) rather
// than float on the desktop. The floating window stays loaded, only hidden, so
// the countdown itself never changes hands: it reports its state here and the
// tray just draws it.
const TRAY_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60]
const ICON_PT = IS_MAC ? 18 : 16

let tray = null
let timerState = { state: 'idle', remainingMs: 0, minutes: settings.lastMinutes || 25, endAt: 0 }
let trayKey = ''          // what the icon last showed, so it is redrawn only on change
let blinkTimer = null
let blinkOn = false
let menuTimer = null      // a single click's menu, held back in case a second click follows

// The dial as a ring with the remaining sector inside it, rasterised by hand
// because the main process has no canvas. macOS gets a black template image and
// tints it to suit the menu bar; Windows has to pick black or white itself.
function trayTone () {
  if (IS_MAC) return 0
  const dark = nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ?? nativeTheme.shouldUseDarkColors
  return dark ? 255 : 0
}

function ringBitmap (minutes, alpha, scale) {
  const n = ICON_PT * scale
  const buf = Buffer.alloc(n * n * 4)
  const c = n / 2
  const ringW = 1.4 * scale
  const ringR = c - 1 * scale - ringW / 2
  const secR = ringR - ringW / 2 - 1.2 * scale
  const sweep = Math.max(0, Math.min(60, minutes)) * 6
  const tone = trayTone()
  const SS = 4            // samples per axis, for antialiasing
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let ring = 0
      let sec = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const dx = x + (sx + 0.5) / SS - c
          const dy = y + (sy + 0.5) / SS - c
          const r = Math.hypot(dx, dy)
          if (Math.abs(r - ringR) <= ringW / 2) ring++
          else if (r <= secR && sweep > 0) {
            // 0 at twelve o'clock, growing clockwise, like the dial
            const a = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
            if (sweep >= 360 || a < sweep) sec++
          }
        }
      }
      const a = Math.round(Math.min(1, (ring + sec * alpha) / (SS * SS)) * 255)
      const i = (y * n + x) * 4
      const v = Math.round(tone * a / 255)   // premultiplied
      buf[i] = v
      buf[i + 1] = v
      buf[i + 2] = v
      buf[i + 3] = a
    }
  }
  return buf
}

function ringImage (minutes, alpha) {
  const img = nativeImage.createFromBitmap(ringBitmap(minutes, alpha, 1),
    { width: ICON_PT, height: ICON_PT, scaleFactor: 1 })
  img.addRepresentation({
    scaleFactor: 2, width: ICON_PT * 2, height: ICON_PT * 2, buffer: ringBitmap(minutes, alpha, 2)
  })
  if (IS_MAC) img.setTemplateImage(true)
  return img
}

function fmt (ms) {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function paintTray () {
  if (!tray) return
  const { state, remainingMs, minutes } = timerState
  let shown
  if (state === 'finished') shown = blinkTimer && blinkOn ? 60 : 0
  else if (state === 'idle') shown = minutes
  else shown = remainingMs / 60000
  // a paused run keeps its sector but greys it out
  const alpha = state === 'paused' ? 0.4 : 1
  const key = `${Math.round(shown * 6)}|${alpha}|${trayTone()}`
  if (key !== trayKey) {
    trayKey = key
    tray.setImage(ringImage(shown, alpha))
  }
  // the same reading the floating dial shows: the set duration while idle
  const text = state === 'idle' ? fmt(minutes * 60000) : fmt(state === 'finished' ? 0 : remainingMs)
  if (IS_MAC) tray.setTitle(settings.trayTime ? text : '', { fontType: 'monospacedDigit' })
  tray.setToolTip(`Sweep  ${text}\n${t(settings.lang, 'tray.dblHint')}`)
}

// The floating dial flashes for ten seconds when a run ends; the ring does too.
function startBlink () {
  stopBlink()
  let n = 0
  blinkOn = true
  blinkTimer = setInterval(() => {
    blinkOn = !blinkOn
    if (++n >= 20) stopBlink()
    paintTray()
  }, 500)
}

function stopBlink () {
  clearInterval(blinkTimer)
  blinkTimer = null
}

function sendTimer (action, extra) {
  if (timerWin && !timerWin.isDestroyed()) timerWin.webContents.send('timer:command', { action, ...extra })
}

function trayMenu () {
  const L = (key, vars) => t(settings.lang, key, vars)
  const { state, minutes } = timerState
  const items = [
    { label: L(state === 'running' ? 'btn.pause' : 'btn.start'), click: () => sendTimer('toggle') },
    { label: L('btn.reset'), enabled: state !== 'idle', click: () => sendTimer('reset') },
    {
      label: L('tray.duration'),
      submenu: TRAY_PRESETS.map(m => ({
        label: L('unit.min', { m }),
        type: 'radio',
        checked: m === minutes,
        click: () => sendTimer('set', { minutes: m })
      }))
    },
    { type: 'separator' }
  ]
  // Windows tray icons cannot carry text, so there is nothing to switch there.
  if (IS_MAC) {
    items.push({
      label: L('tray.showTime'),
      type: 'checkbox',
      checked: !!settings.trayTime,
      click: () => {
        settings.trayTime = !settings.trayTime
        persistSettings()
        paintTray()
        broadcast('settings:changed', settings)
      }
    }, { type: 'separator' })
  }
  if (recoverable) {
    items.push({ label: L('recover', { m: recoverable.minutes }), click: () => sendTimer('recover') },
      { type: 'separator' })
  }
  items.push(
    { label: L('menu.toFloat'), click: () => setMenuBar(false) },
    { label: L('menu.history'), click: openHistory },
    { label: L('menu.settings'), click: openSettings },
    { type: 'separator' },
    { label: L('menu.quit'), click: () => app.quit() }
  )
  return Menu.buildFromTemplate(items)
}

// How long a single click waits to see whether it is half of a double-click.
// The system setting (0.5s by default on macOS) is honoured up to a point, past
// which waiting for the menu starts to feel like lag.
function doubleClickMs () {
  const sys = IS_MAC ? systemPreferences.getUserDefault('com.apple.mouse.doubleClickThreshold', 'double') : 0
  return Math.min(350, sys > 0 ? sys * 1000 : 350)
}

function createTray () {
  tray = new Tray(ringImage(timerState.minutes, 1))
  trayKey = ''
  const pop = () => { if (tray) tray.popUpContextMenu(trayMenu()) }
  // A double-click floats the timer again. The menu would swallow the second
  // click if it were already open, so a single click waits before opening it.
  tray.on('click', () => {
    clearTimeout(menuTimer)
    menuTimer = setTimeout(pop, doubleClickMs())
  })
  tray.on('double-click', () => {
    clearTimeout(menuTimer)
    setMenuBar(false)
  })
  tray.on('right-click', pop)
  paintTray()
}

function applyPlacement () {
  if (settings.menuBar) {
    if (!tray) createTray()
    if (timerWin && !timerWin.isDestroyed()) timerWin.hide()
  } else {
    clearTimeout(menuTimer)
    if (tray) {
      tray.destroy()
      tray = null
    }
    stopBlink()
    if (timerWin && !timerWin.isDestroyed()) timerWin.showInactive()
  }
}

function setMenuBar (on) {
  settings.menuBar = on
  persistSettings()
  applyPlacement()
  broadcast('settings:changed', settings)
}

// Only a run in progress is worth handing to a reloaded page.
ipcMain.handle('timer:get', () =>
  timerState.state === 'running' || timerState.state === 'paused' ? timerState : null)

ipcMain.on('timer:state', (_e, s) => {
  const justFinished = s.state === 'finished' && timerState.state !== 'finished'
  timerState = s
  if (justFinished && tray) startBlink()
  else if (s.state !== 'finished') stopBlink()
  paintTray()
})

// Windows draws the ring black or white to suit the taskbar, which can change.
nativeTheme.on('updated', paintTray)

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
  if (settings.menuBar) createTray()
})

app.on('window-all-closed', () => app.quit())
app.on('activate', () => { if (!timerWin) createTimerWindow() })
