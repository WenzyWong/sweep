// Countdown state machine: idle -> running <-> paused -> finished -> idle
class Timer extends EventTarget {
  constructor () {
    super()
    this.state = 'idle'
    this.minutes = 25          // the dial setting, 1..60
    this.remainingMs = 25 * 60000
    this._endAt = 0
    this._tick = null
  }

  emit (name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }))
  }

  setMinutes (m) {
    const clamped = Math.max(1, Math.min(60, m))
    if (clamped === this.minutes && this.state === 'idle') return
    this.minutes = clamped
    if (this.state === 'running') {
      // dragging while running re-times the run, like turning the physical dial
      this.remainingMs = clamped * 60000
      this._endAt = Date.now() + this.remainingMs
    } else {
      this.remainingMs = clamped * 60000
    }
    this.emit('change')
  }

  // minutes still on the clock, as a float, for drawing the sector
  get displayMinutes () {
    return this.state === 'idle' ? this.minutes : this.remainingMs / 60000
  }

  start () {
    if (this.state === 'running') return
    if (this.state === 'finished') this.reset()
    if (this.remainingMs <= 0) this.remainingMs = this.minutes * 60000
    this._endAt = Date.now() + this.remainingMs
    this.state = 'running'
    this._loop()
    this.emit('change')
  }

  pause () {
    if (this.state !== 'running') return
    clearTimeout(this._tick)
    this.remainingMs = Math.max(0, this._endAt - Date.now())
    this.state = 'paused'
    this.emit('change')
  }

  toggle () {
    if (this.state === 'running') this.pause()
    else this.start()
  }

  reset () {
    clearTimeout(this._tick)
    this.state = 'idle'
    this.remainingMs = this.minutes * 60000
    this.emit('change')
  }

  _loop () {
    const step = () => {
      this.remainingMs = Math.max(0, this._endAt - Date.now())
      if (this.remainingMs <= 0) {
        clearTimeout(this._tick)
        this.state = 'finished'
        this.emit('change')
        this.emit('finished', { minutes: this.minutes })
        return
      }
      this.emit('change')
      // ~20fps is plenty for a sweeping sector and costs almost nothing
      this._tick = setTimeout(step, 50)
    }
    step()
  }
}

window.Timer = Timer
