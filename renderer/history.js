const $ = id => document.getElementById(id)
document.body.classList.add(api.platform === 'darwin' ? 'mac' : 'win')

const L = (key, vars) => window.t(settings ? settings.lang : 'en', key, vars)

let history = {}
let settings = null
let selected = todayKey()

function pad (n) { return String(n).padStart(2, '0') }
function keyOf (d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function todayKey () { return keyOf(new Date()) }

function shiftDay (key, days) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return keyOf(date)
}

function prettyDate (key) {
  const [y, m, d] = key.split('-').map(Number)
  const locale = window.localeOf(settings ? settings.lang : 'en')
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  }).format(new Date(y, m - 1, d))
}

function clockTime (ts) {
  const locale = window.localeOf(settings ? settings.lang : 'en')
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
}

// A single session, drawn as a donut whose arc covers minutes out of 60.
function ringSVG (minutes, color, track) {
  const r = 14
  const circumference = 2 * Math.PI * r
  const dash = Math.min(minutes, 60) / 60 * circumference
  return `<svg viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="${track}" stroke-width="7"/>
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="${color}" stroke-width="7"
            stroke-dasharray="${dash.toFixed(2)} ${circumference.toFixed(2)}"
            transform="rotate(-90 18 18)"/>
  </svg>`
}

function render () {
  if (!settings) return
  const scheme = window.findScheme(settings.schemeId, settings.customSchemes)
  document.documentElement.style.setProperty('--accent', scheme.sector)

  const sessions = history[selected] || []
  const total = sessions.reduce((sum, s) => sum + s.m, 0)

  window.applyDom(document, settings.lang)
  document.title = L('win.history')
  $('date').textContent = prettyDate(selected)
  $('next').disabled = selected >= todayKey()
  $('today').disabled = selected === todayKey()
  const key = sessions.length === 1 && window.t(settings.lang, 'summary.one') !== 'summary.one'
    ? 'summary.one' : 'summary'
  $('summary').innerHTML = sessions.length
    ? L(key, { n: `<b>${sessions.length}</b>`, m: `<b>${total}</b>` })
    : '\u3000'

  $('empty').hidden = sessions.length > 0
  $('rings').innerHTML = sessions.map(s => {
    return `<div class="ring" title="${clockTime(s.t)}　${L('unit.min', { m: s.m })}">
      ${ringSVG(s.m, scheme.sector, 'rgba(128,128,128,.18)')}
      <span class="mins">${s.m}</span>
    </div>`
  }).join('')

  renderHeat(scheme.sector)
}

function renderHeat (color) {
  const days = []
  for (let i = 29; i >= 0; i--) days.push(shiftDay(todayKey(), -i))
  const totals = days.map(k => (history[k] || []).reduce((sum, s) => sum + s.m, 0))
  const peak = Math.max(60, ...totals)

  $('heat').innerHTML = days.map((k, i) => {
    const mins = totals[i]
    const strength = mins ? 0.18 + 0.82 * Math.min(1, mins / peak) : 0
    const bg = mins ? `background:color-mix(in srgb, ${color} ${Math.round(strength * 100)}%, transparent)` : ''
    const classes = ['cell', k === todayKey() ? 'today' : '', k === selected ? 'sel' : ''].join(' ')
    return `<div class="${classes}" data-key="${k}" style="${bg}" title="${k}　${L('unit.min', { m: mins })}"></div>`
  }).join('')
}

$('prev').addEventListener('click', () => { selected = shiftDay(selected, -1); render() })
$('next').addEventListener('click', () => {
  if (selected < todayKey()) { selected = shiftDay(selected, 1); render() }
})
$('today').addEventListener('click', () => { selected = todayKey(); render() })
$('heat').addEventListener('click', e => {
  const cell = e.target.closest('.cell')
  if (cell) { selected = cell.dataset.key; render() }
})

api.onHistoryChanged(h => { history = h; render() })
api.onSettingsChanged(s => { settings = s; render() })

Promise.all([api.getHistory(), api.getSettings()]).then(([h, s]) => {
  history = h
  settings = s
  render()
})
