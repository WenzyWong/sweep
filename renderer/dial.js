// Dial geometry. The face lives in a 100x100 viewBox; 0 minutes sits at 12
// o'clock and time sweeps clockwise, exactly like the physical timer.
const R_FACE = 46
const R_SECTOR = 28
const R_TICK_OUT = 43
const R_NUM = 34

function polar (angleDeg, radius) {
  const a = (angleDeg - 90) * Math.PI / 180
  return [50 + radius * Math.cos(a), 50 + radius * Math.sin(a)]
}

function sectorPath (minutes) {
  const m = Math.max(0, Math.min(60, minutes))
  if (m <= 0.001) return ''
  if (m >= 59.999) {
    // a full sweep degenerates as a single arc, so draw it as two halves
    return `M 50 ${50 - R_SECTOR} A ${R_SECTOR} ${R_SECTOR} 0 1 1 50 ${50 + R_SECTOR}` +
           ` A ${R_SECTOR} ${R_SECTOR} 0 1 1 50 ${50 - R_SECTOR} Z`
  }
  const [x, y] = polar(m * 6, R_SECTOR)
  const large = m * 6 > 180 ? 1 : 0
  return `M 50 50 L 50 ${50 - R_SECTOR} A ${R_SECTOR} ${R_SECTOR} 0 ${large} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`
}

function buildTicks (g) {
  const parts = []
  for (let m = 0; m < 60; m++) {
    const major = m % 5 === 0
    const len = major ? 4 : 2
    const [x1, y1] = polar(m * 6, R_TICK_OUT)
    const [x2, y2] = polar(m * 6, R_TICK_OUT - len)
    parts.push(
      `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"` +
      ` class="tick ${major ? 'major' : 'minor'}"/>`
    )
  }
  g.innerHTML = parts.join('')
}

function buildNumbers (g) {
  const parts = []
  for (let m = 0; m < 60; m += 10) {
    const label = m === 0 ? '60' : String(m)
    const [x, y] = polar(m * 6, R_NUM)
    parts.push(
      `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" class="num"` +
      ` text-anchor="middle" dominant-baseline="central">${label}</text>`
    )
  }
  g.innerHTML = parts.join('')
}

// Angle of a pointer event relative to the dial centre, 0 at 12 o'clock,
// increasing clockwise, normalised to [0, 360).
function pointerAngle (event, rect) {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const deg = Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI + 90
  return (deg % 360 + 360) % 360
}

// Shortest signed difference between two angles, in (-180, 180].
function angleDelta (from, to) {
  let d = (to - from) % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

window.Dial = { sectorPath, buildTicks, buildNumbers, pointerAngle, angleDelta, polar, R_SECTOR }
