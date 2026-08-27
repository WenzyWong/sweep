// The six colourways from the reference photo. Each scheme is four colours:
// the case, the sweep sector, the centre knob, and the buttons on top.
const PRESETS = [
  { id: 'blush',        name: 'Blush',         body: '#F2D3D3', sector: '#E8556D', knob: '#F5C544', btn: '#F2A7BE' },
  { id: 'cream-pine',   name: 'Cream Pine',    body: '#EDE4D8', sector: '#2F6B4F', knob: '#C9A227', btn: '#2F6B4F' },
  { id: 'lavender',     name: 'Lavender Mist', body: '#EFEFF4', sector: '#A28BD4', knob: '#E8E8EE', btn: '#A28BD4' },
  { id: 'sky',          name: 'Sky',           body: '#CBDAEC', sector: '#5B7FC7', knob: '#F5C544', btn: '#7FA8D9' },
  { id: 'mustard-navy', name: 'Mustard Navy',  body: '#E8D49B', sector: '#2E4A6B', knob: '#F0A93B', btn: '#4A6FA5' },
  { id: 'slate-ember',  name: 'Slate Ember',   body: '#7E9AA8', sector: '#D32F2F', knob: '#E8E0D0', btn: '#D32F2F' }
]

function findScheme (id, custom) {
  const all = [...PRESETS, ...(custom || [])]
  return all.find(s => s.id === id) || PRESETS[0]
}

if (typeof module !== 'undefined' && module.exports) module.exports = { PRESETS, findScheme }
if (typeof window !== 'undefined') { window.PRESETS = PRESETS; window.findScheme = findScheme }

function hexToRgb (hex) {
  const h = String(hex).replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function relLuminance (hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Button captions are white, as designed — but a few colourways use very pale
// buttons, where white would vanish. Those fall back to a soft dark ink.
function inkFor (hex) {
  return relLuminance(hex) > 0.45 ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.85)'
}

if (typeof module !== 'undefined' && module.exports) Object.assign(module.exports, { hexToRgb, relLuminance, inkFor })
if (typeof window !== 'undefined') Object.assign(window, { hexToRgb, relLuminance, inkFor })
