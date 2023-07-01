const Pitch_Detector = {
  buffer_size: 2048,
  buffer: new Float32Array(2048),
  audio_context: Tone.context,
  init: async function () {
    let stream = await navigator.mediaDevices.getUserMedia({"audio": {
      "mandatory": {
        "googEchoCancellation": "false",
        "googAutoGainControl": "false",
        "googNoiseSuppression": "false",
        "googHighpassFilter": "false"
      }, "optional": []
    }})
    this.analyser = this.audio_context.createAnalyser()
    this.analyser.fftSize = this.buffer_size
    this.audio_context.createMediaStreamSource(stream).connect(this.analyser)
    this.has_init = true
  },
  start: function (params) {
    if (this.running) return false
    this.running = true
    Object.assign(this, params)
    if (!this.has_init) this.init()
    this.interval = setInterval(() => this.update(), 100)
  },
  stop: function () {
    clearInterval(this.interval)
    this.running = false
  },
  update: function () {
    if (!this.has_init) return false
    this.analyser.getFloatTimeDomainData(this.buffer)
    let res = this.autoCorrelate(this.buffer, this.audio_context.sampleRate)
    if (res > 0) {
      tmp_octave = this.get_octave(res)
      if (!this.octave || Math.random() < 0.05) this.octave = tmp_octave
      if (Math.abs(tmp_octave - this.octave) < 0.5) {
        this.pitch = res
        this.onNote(Tone.Frequency(this.pitch).toNote())  
      }
    } else this.onPause()
  },
  autoCorrelate: function (buf, sampleRate) {
    // Implements the ACF2+ algorithm
    var SIZE = buf.length
    var rms = 0
    for (var i = 0; i < SIZE; i++) {
      var val = buf[i]
      rms += val * val
    }
    rms = Math.sqrt(rms / SIZE)
    if (rms < 0.01) // not enough signal
      return -1
    var r1 = 0,
      r2 = SIZE - 1,
      thres = 0.2
    for (var i = 0; i < SIZE / 2; i++)
      if (Math.abs(buf[i]) < thres) {
        r1 = i;
        break;
      }
    for (var i = 1; i < SIZE / 2; i++)
      if (Math.abs(buf[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    buf = buf.slice(r1, r2)
    SIZE = buf.length
    var c = new Array(SIZE).fill(0)
    for (var i = 0; i < SIZE; i++)
      for (var j = 0; j < SIZE - i; j++)
        c[i] = c[i] + buf[j] * buf[j + i]
    var d = 0;
    while (c[d] > c[d + 1]) d++
    var maxval = -1,
      maxpos = -1
    for (var i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i]
        maxpos = i
      }
    }
    var T0 = maxpos
    var x1 = c[T0 - 1],
      x2 = c[T0],
      x3 = c[T0 + 1]
    a = (x1 + x3 - 2 * x2) / 2
    b = (x3 - x1) / 2
    if (a) T0 = T0 - b / (2 * a)
    return sampleRate / T0
  },
  get_octave: function (frequency) {
    const CONCERT_PITCH = 440
    const A = 2 ** (1 / 12)
    const C0_PITCH = 16.35
    const N = Math.round(12 * Math.log2(frequency / CONCERT_PITCH))
    const Fn = CONCERT_PITCH * A ** N
    const octave = Math.log2(Fn / C0_PITCH)
  
    return octave
  }
}