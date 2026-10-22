let settings = null
let draft = null   // the four colours currently in the pickers

const $ = id => document.getElementById(id)
document.body.classList.add(api.platform === 'darwin' ? 'mac' : 'win')

const L = (key, vars) => window.t(settings ? settings.lang : 'en', key, vars)
const pickers = { body: $('c-body'), sector: $('c-sector'), knob: $('c-knob'), btn: $('c-btn') }

// ---------------------------------------------------------------- colour maths
function hexToRgb (hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix (hexA, hexB, weightA) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  return a.map((v, i) => Math.round(v * weightA + b[i] * (1 - weightA)))
}

function luminance (rgb) {
  const [r, g, b] = rgb.map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio (rgbA, rgbB) {
  const a = luminance(rgbA)
  const b = luminance(rgbB)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// The face is derived from the case colour the same way style.css derives it.
function faceOf (bodyHex) { return mix(bodyHex, '#ffffff', 0.13) }

function checkContrast () {
  const ratio = contrastRatio(hexToRgb(draft.sector), faceOf(draft.body))
  const box = $('contrast')
  if (ratio < 2.0) {
    box.hidden = false
    box.textContent = L('contrast.warn', { r: ratio.toFixed(2) })
  } else {
    box.hidden = true
  }
}

// ---------------------------------------------------------------- scheme cards
function rgbToHex (rgb) {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('')
}

function schemeThumb (s) {
  const face = rgbToHex(faceOf(s.body))
  return `<svg viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="19" fill="${face}"/>
    <path d="M 20 20 L 20 3 A 17 17 0 0 1 34.7 28.5 Z" fill="${s.sector}"/>
    <circle cx="20" cy="20" r="4.5" fill="${s.knob}"/>
  </svg>`
}

function renderSchemes () {
  const all = [...window.PRESETS, ...(settings.customSchemes || [])]
  $('schemes').innerHTML = all.map(s => `
    <div class="scheme ${s.id === settings.schemeId ? 'selected' : ''}" data-id="${s.id}">
      ${s.id.startsWith('custom-') ? `<button class="del" data-del="${s.id}" title="${L('scheme.delete')}">×</button>` : ''}
      <div class="chip" style="background:${s.body}">${schemeThumb(s)}</div>
      <div class="name">${s.name}</div>
    </div>`).join('')
}

$('schemes').addEventListener('click', async e => {
  const del = e.target.closest('[data-del]')
  if (del) {
    const id = del.dataset.del
    clearPreview()
    const custom = settings.customSchemes.filter(s => s.id !== id)
    const patch = { customSchemes: custom }
    if (settings.schemeId === id) patch.schemeId = 'blush'
    await api.setSettings(patch)
    return
  }
  const card = e.target.closest('.scheme')
  if (card) {
    clearPreview()                 // a chosen scheme replaces whatever was being tried
    await api.setSettings({ schemeId: card.dataset.id })
  }
})

$('save-scheme').addEventListener('click', async () => {
  const name = $('scheme-name').value.trim() || L('scheme.defaultName')
  const scheme = { id: 'custom-' + Date.now(), name, ...draft }
  await api.setSettings({
    customSchemes: [...(settings.customSchemes || []), scheme],
    schemeId: scheme.id
  })
  $('scheme-name').value = ''
  clearPreview()                   // saved, so the real scheme now matches
})

// The colour pickers fire continuously while a swatch is dragged, so the
// preview is coalesced to one send per frame.
let previewQueued = false
function sendPreview () {
  if (previewQueued) return
  previewQueued = true
  requestAnimationFrame(() => {
    previewQueued = false
    api.previewScheme({ ...draft })
  })
}

function clearPreview () {
  api.previewScheme(null)
}

for (const [key, el] of Object.entries(pickers)) {
  el.addEventListener('input', () => {
    draft[key] = el.value
    checkContrast()
    sendPreview()          // show it on the dial straight away, unsaved
  })
}

// The dial goes back to the saved scheme when this window is done with.
window.addEventListener('beforeunload', clearPreview)

// ---------------------------------------------------------------- other controls
$('mode-toggle').addEventListener('click', () =>
  api.setSettings({ mode: settings.mode === 'full' ? 'dial' : 'full' }))

$('menu-bar').addEventListener('change', e => api.setSettings({ menuBar: e.target.checked }))
$('tray-time').addEventListener('change', e => api.setSettings({ trayTime: e.target.checked }))

// Windows calls it the system tray, and its tray icons cannot carry text.
if (api.platform !== 'darwin') {
  $('tray-label').dataset.i18n = 'appearance.trayWin'
  $('tray-hint').dataset.i18n = 'appearance.trayHintWin'
  $('tray-time-row').remove()
}

$('size').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10)
  $('size-label').textContent = v + ' px'
  api.setSettings({ sizeUnit: v })
})

function bindOpacity (id, labelId, key) {
  $(id).addEventListener('input', e => {
    const pct = parseInt(e.target.value, 10)
    $(labelId).textContent = pct + '%'
    api.setSettings({ [key]: pct / 100 })
  })
}
bindOpacity('opacity', 'opacity-label', 'opacity')
bindOpacity('idle-opacity', 'idle-opacity-label', 'idleOpacity')

$('quote').addEventListener('input', e => api.setSettings({ quote: e.target.value }))
$('label').addEventListener('input', e => api.setSettings({ label: e.target.value }))
$('sound').addEventListener('change', e => api.setSettings({ sound: e.target.checked }))
$('click-sound').addEventListener('change', e => api.setSettings({ clickSound: e.target.checked }))
$('notify').addEventListener('change', e => api.setSettings({ notify: e.target.checked }))
$('idle-fade').addEventListener('change', e => api.setSettings({ idleFade: e.target.checked }))
$('open-history').addEventListener('click', () => api.openHistory())

$('lang').addEventListener('change', e => api.setSettings({ lang: e.target.value }))

function buildLangOptions () {
  $('lang').innerHTML = window.LANGS
    .map(l => `<option value="${l.id}">${l.name}</option>`).join('')
}
buildLangOptions()

// ---------------------------------------------------------------- sync
let lastSchemeId = null

function apply (s) {
  settings = s
  window.applyDom(document, s.lang)
  document.title = L('win.settings')
  $('lang').value = s.lang
  const active = window.findScheme(s.schemeId, s.customSchemes)
  // Only reload the pickers when the selected scheme actually changed. Doing it
  // on every settings change would wipe an in-progress edit the moment the size
  // slider or any other control moved.
  if (s.schemeId !== lastSchemeId) {
    lastSchemeId = s.schemeId
    draft = { body: active.body, sector: active.sector, knob: active.knob, btn: active.btn }
    for (const [key, el] of Object.entries(pickers)) el.value = draft[key]
  }
  document.documentElement.style.setProperty('--accent', active.sector)

  renderSchemes()
  checkContrast()

  $('mode-toggle').textContent = L(s.mode === 'full' ? 'mode.full' : 'mode.dial')
  $('menu-bar').checked = !!s.menuBar
  if ($('tray-time')) {
    $('tray-time').checked = !!s.trayTime
    $('tray-time').disabled = !s.menuBar
  }
  $('size').value = s.sizeUnit
  $('size-label').textContent = s.sizeUnit + ' px'
  if (document.activeElement !== $('quote')) $('quote').value = s.quote || ''
  if (document.activeElement !== $('label')) $('label').value = s.label || ''
  $('sound').checked = !!s.sound
  $('click-sound').checked = !!s.clickSound
  $('notify').checked = !!s.notify
  $('idle-fade').checked = !!s.idleFade

  for (const [id, labelId, value] of [['opacity', 'opacity-label', s.opacity],
                                      ['idle-opacity', 'idle-opacity-label', s.idleOpacity]]) {
    const pct = Math.round(value * 100)
    if (document.activeElement !== $(id)) $(id).value = pct
    $(labelId).textContent = pct + '%'
  }
  // the idle slider means nothing when idle fading is switched off
  $('idle-opacity').disabled = !s.idleFade
}

api.onSettingsChanged(apply)
api.getSettings().then(apply)
