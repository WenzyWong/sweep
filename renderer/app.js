// These two must stay in step with the same constants in main.js — they are
// what lets the renderer work out which pixels are the widget and which are
// see-through desktop.
const PAD = 18
const NUB_RATIO = 0.10

const stage = document.getElementById('stage')
const faceWrap = document.querySelector('.face-wrap')
const sector = document.querySelector('.sector')
const hand = document.querySelector('.hand')
const readout = document.querySelector('.readout')
const brand = document.querySelector('.brand')
const quoteL1 = document.querySelector('.quote-l1')
const quoteL2 = document.querySelector('.quote-l2')
const minuteInput = document.querySelector('.minute-input')
const againBtn = document.querySelector('.again')
const btnBar = document.querySelector('.btn-bar')
const btnRound = document.querySelector('.btn-round')
const lblToggle = document.getElementById('lbl-toggle')
const lblReset = document.getElementById('lbl-reset')

const L = (key, vars) => window.t(settings ? settings.lang : 'en', key, vars)

Dial.buildTicks(document.querySelector('.ticks'))
Dial.buildNumbers(document.querySelector('.numbers'))

const timer = new Timer()
let settings = null
let firstLoad = true
let flashTimer = null

// ---------------------------------------------------------------- settings
function splitQuote (text) {
  const t = (text || '').trim()
  if (!t) return ['', '']
  if (!/\s/.test(t)) {
    // CJK and other unspaced scripts: break in the middle if it is long
    return t.length > 9 ? [t.slice(0, Math.ceil(t.length / 2)), t.slice(Math.ceil(t.length / 2))] : [t, '']
  }
  const words = t.split(/\s+/)
  let best = words.length
  let bestDiff = Infinity
  for (let i = 1; i <= words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length)
    if (diff < bestDiff) { bestDiff = diff; best = i }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')]
}

function applySettings (s) {
  settings = s
  const sc = window.findScheme(s.schemeId, s.customSchemes)
  const root = document.documentElement.style
  root.setProperty('--body', sc.body)
  root.setProperty('--sector', sc.sector)
  root.setProperty('--knob', sc.knob)
  root.setProperty('--btn', sc.btn)
  root.setProperty('--unit', s.sizeUnit + 'px')
  root.setProperty('--btn-ink', window.inkFor(sc.btn))
  root.setProperty('--knob-ink', window.inkFor(sc.knob))

  stage.className = 'mode-' + s.mode + (stage.classList.contains('flashing') ? ' flashing' : '')
  document.body.classList.toggle('compact', s.sizeUnit < 165)
  document.body.classList.toggle('tiny', s.sizeUnit < 120)

  applyI18n()

  const [l1, l2] = splitQuote(s.quote)
  quoteL1.textContent = l1
  quoteL2.textContent = l2
  brand.textContent = s.label || ''

  if (firstLoad) {
    firstLoad = false
    timer.setMinutes(s.lastMinutes || 25)
  }
  render()
}

// Captions, tooltips and the replay button all come from the dictionary.
function applyI18n () {
  lblReset.textContent = L('btn.reset')
  btnBar.title = L('tip.startPause')
  btnRound.title = L('tip.reset')
  if (!againBtn.hidden) againBtn.textContent = L('again', { m: timer.minutes })
}

let persistMinutes = null
function rememberMinutes () {
  clearTimeout(persistMinutes)
  persistMinutes = setTimeout(() => api.setSettings({ lastMinutes: timer.minutes }), 600)
}

// ---------------------------------------------------------------- rendering
function fmt (ms) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function render () {
  const dm = timer.displayMinutes
  sector.setAttribute('d', Dial.sectorPath(dm))
  const [hx, hy] = Dial.polar(dm * 6, Dial.R_SECTOR)
  hand.setAttribute('x2', hx.toFixed(2))
  hand.setAttribute('y2', hy.toFixed(2))
  hand.style.opacity = dm > 0.02 ? '1' : '0'
  readout.textContent = fmt(timer.state === 'idle' ? timer.minutes * 60000 : timer.remainingMs)
  lblToggle.textContent = L(timer.state === 'running' ? 'btn.pause' : 'btn.start')
  document.body.classList.toggle('fade', !!settings && settings.idleFade && timer.state === 'idle')
}

timer.addEventListener('change', render)

// ---------------------------------------------------------------- finishing
function stopFlash () {
  clearTimeout(flashTimer)
  stage.classList.remove('flashing')
}

timer.addEventListener('finished', async ev => {
  const m = ev.detail.minutes
  stage.classList.add('flashing')
  api.raise()
  if (settings && settings.sound) window.playChime()
  api.notify(m)
  api.addSession(m)

  againBtn.textContent = L('again', { m })
  againBtn.hidden = false

  clearTimeout(flashTimer)
  flashTimer = setTimeout(stopFlash, 10000)
})

againBtn.addEventListener('click', e => {
  e.stopPropagation()
  stopFlash()
  againBtn.hidden = true
  timer.setMinutes(timer.minutes)
  timer.reset()
  timer.start()
})

// ---------------------------------------------------------------- controls
document.querySelector('.btn-bar').addEventListener('click', e => {
  e.stopPropagation()
  stopFlash()
  againBtn.hidden = true
  timer.toggle()
})

document.querySelector('.btn-round').addEventListener('click', e => {
  e.stopPropagation()
  stopFlash()
  againBtn.hidden = true
  timer.reset()
})

document.querySelector('.hub').addEventListener('click', e => {
  e.stopPropagation()
  stopFlash()
  againBtn.hidden = true
  timer.toggle()
})

// ---------------------------------------------------------------- dragging
let drag = null

stage.addEventListener('mousedown', e => {
  if (e.button !== 0) return
  if (e.target.closest('.btn-bar, .btn-round, .again, .hub, .minute-input')) return
  if (stage.classList.contains('flashing')) stopFlash()

  const rect = faceWrap.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dist = Math.hypot(e.clientX - cx, e.clientY - cy)
  const onFace = dist <= 0.40 * rect.width && dist > 0.095 * rect.width

  if (!e.metaKey && onFace) {
    drag = { type: 'dial', rect, lastAngle: Dial.pointerAngle(e, rect), acc: timer.displayMinutes }
  } else {
    drag = { type: 'window', sx: e.screenX, sy: e.screenY }
  }
  e.preventDefault()
})

window.addEventListener('mousemove', e => {
  if (!drag) { updateHitTest(e); return }

  if (drag.type === 'window') {
    const dx = e.screenX - drag.sx
    const dy = e.screenY - drag.sy
    if (dx || dy) {
      api.moveBy(dx, dy)
      drag.sx = e.screenX
      drag.sy = e.screenY
    }
    return
  }

  const angle = Dial.pointerAngle(e, drag.rect)
  drag.acc = Math.max(1, Math.min(60, drag.acc + Dial.angleDelta(drag.lastAngle, angle) / 6))
  drag.lastAngle = angle
  timer.setMinutes(Math.round(drag.acc))
})

window.addEventListener('mouseup', () => {
  if (drag && drag.type === 'dial') rememberMinutes()
  drag = null
})

// ---------------------------------------------------------------- typing a duration
faceWrap.addEventListener('dblclick', e => {
  if (e.target.closest('.again')) return
  minuteInput.value = timer.minutes
  minuteInput.hidden = false
  minuteInput.focus()
  minuteInput.select()
})

function commitInput () {
  const v = parseInt(minuteInput.value, 10)
  if (Number.isFinite(v)) {
    timer.setMinutes(v)
    if (timer.state !== 'running') timer.reset()
    rememberMinutes()
  }
  minuteInput.hidden = true
}

minuteInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') commitInput()
  if (e.key === 'Escape') minuteInput.hidden = true
})
minuteInput.addEventListener('blur', () => { minuteInput.hidden = true })

// ---------------------------------------------------------------- click-through
// The window is a rectangle but the widget is not, so tell the main process to
// let clicks fall through wherever the pixels are transparent.
let lastOver = null
function updateHitTest (e) {
  if (!settings) return
  const unit = settings.sizeUnit
  let over
  if (settings.mode === 'dial') {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    over = Math.hypot(e.clientX - cx, e.clientY - cy) <= unit / 2 + 2
  } else {
    over = e.clientX >= PAD - 2 && e.clientX <= PAD + unit + 2 &&
           e.clientY >= PAD - 2 && e.clientY <= PAD + unit + unit * NUB_RATIO + 2
  }
  if (over !== lastOver) {
    lastOver = over
    api.setIgnoreMouse(!over)
  }
}

// ---------------------------------------------------------------- menu
window.addEventListener('contextmenu', e => {
  e.preventDefault()
  api.showMenu()
})

// ---------------------------------------------------------------- boot
api.onSettingsChanged(applySettings)
api.getSettings().then(applySettings)
