// Every sound in the app is synthesised on the fly, so nothing ships as audio.
let ctx = null
let noiseBuf = null

function getCtx () {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// One second of white noise, built once and reused as the source for the
// percussive sounds below.
function noiseSource (ac) {
  if (!noiseBuf || noiseBuf.sampleRate !== ac.sampleRate) {
    const len = Math.ceil(ac.sampleRate)
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  return src
}

// A soft two-partial bell for the end of a countdown.
function playChime () {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    const out = ac.createGain()
    out.gain.value = 0.22
    out.connect(ac.destination)

    // fundamental plus a quieter, slightly detuned partial for a little warmth
    for (const [freq, level, decay] of [[880, 1, 1.6], [1320, 0.35, 1.1]]) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(level, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
      osc.connect(gain).connect(out)
      osc.start(now)
      osc.stop(now + decay + 0.05)
    }
  } catch (err) {
    console.warn('chime failed', err)
  }
}

// A short, dry mechanical click: a noise transient squeezed through a narrow
// band, gone in about 35ms. This is the sound of pressing a button.
function playClick (level = 0.13) {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    const src = noiseSource(ac)

    const band = ac.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 2400
    band.Q.value = 1.1

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(level, now + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)

    src.connect(band).connect(gain).connect(ac.destination)
    src.start(now)
    src.stop(now + 0.06)
  } catch (err) {
    console.warn('click failed', err)
  }
}

// Reset: the same click, then a band of noise sliding from bright to dark —
// the sound of the dial being wound back to where it started.
function playSweep () {
  try {
    playClick(0.10)

    const ac = getCtx()
    const now = ac.currentTime
    const src = noiseSource(ac)

    const band = ac.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 3.2
    band.frequency.setValueAtTime(4200, now)
    band.frequency.exponentialRampToValueAtTime(620, now + 0.20)

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26)

    src.connect(band).connect(gain).connect(ac.destination)
    src.start(now)
    src.stop(now + 0.3)
  } catch (err) {
    console.warn('sweep failed', err)
  }
}

Object.assign(window, { playChime, playClick, playSweep })
