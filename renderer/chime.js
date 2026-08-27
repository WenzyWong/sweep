// A soft two-partial bell, synthesised on the fly so the app ships no audio file.
let ctx = null

function playChime () {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime
    const out = ctx.createGain()
    out.gain.value = 0.22
    out.connect(ctx.destination)

    // fundamental plus a quieter, slightly detuned partial for a little warmth
    for (const [freq, level, decay] of [[880, 1, 1.6], [1320, 0.35, 1.1]]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
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

window.playChime = playChime
