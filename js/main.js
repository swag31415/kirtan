const keys = {
  piano: {
    low: ['C','D','E','F','G','A','B'],
    high: [null,'C#','D#',null,'F#',"G#","A#"]
  },
  keyboard: {
    low: ['Tab','q','w','e','r','t','y','u','i','o','p','[',']'],
    high: ['`','1','2','3','4','5','6','7','8','9','0','-','=']
  }
}

function get_binding(offset) {
  function map_keys(keyboard, piano) {
    const wrapped_get = (arr, i) => arr[(i + arr.length) % arr.length]
    return keyboard.reduce((obj, key, i) => {
      index = i + offset + 4*7-3 // Add an offset to make 'e' middle-c by default
      pitch = wrapped_get(piano, index)
      octave = Math.floor(index / 7)
      if (pitch) obj[key] = {
        pitch: pitch + octave,
        transform: `translate(${i*60},0)`,
        pressed: false,
        highlight: false
      }
      return obj
    }, {})
  }
  return {
    low: map_keys(keys.keyboard.low, keys.piano.low, key_index),
    high: map_keys(keys.keyboard.high, keys.piano.high, key_index)
  }
}

const samples = ['A#2','A#3','A#4','A2','A3','A4','B2','B3','B4','C#2','C#3','C#4','C#5','C2','C3','C4','C5','D#2','D#3','D#4','D2','D3','D4','D5','E2','E3','E4','F#2','F#3','F#4','F2','F3','F4','G#2','G#3','G#4','G2','G3','G4']
const synth = new Tone.Sampler({
	urls: Object.fromEntries(samples.map(note => [note, note.replace('#', '%23') + '.wav'])),
	baseUrl: "https://swag31415.github.io/kirtan/samples/harmonium/",
}).toDestination();
var key_index = -8
const valid_index_range = { min: -25, max: 54 }

var record = []
document.addEventListener('keydown', e => {
  let key = app.get_note(e.key)
  if (key) {
    e.preventDefault()
    if (!key.pressed) {
      try {
        synth.triggerAttack(key.pitch)
        key.pressed = true
        app.record(key.pitch, 'down')
      } catch {
        M.toast({html: 'Still loading, give it a second'})
      }
    }
  } else if (e.key == 'ArrowLeft' && key_index < valid_index_range.max) {
    key_index += 1
    app.binding = get_binding(key_index)
  } else if (e.key == 'ArrowRight' && key_index > valid_index_range.min) {
    key_index -= 1
    app.binding = get_binding(key_index)
  }
})

document.addEventListener('keyup', e => {
  let key = app.get_note(e.key)
  if (key) {
    e.preventDefault()
    synth.triggerRelease(key.pitch)
    key.pressed = false
    app.record(key.pitch, 'up')
  }
})

const app = new Vue({
  el: '#app',
  data: {
    pitch_on: false,
    record_start_time: 0,
    buffer: [],
    recording: false,
    recordings: JSON.parse(localStorage.getItem('recordings')) || [],
    binding: get_binding(key_index)
  },
  methods: {
    pitch_enable: function () {
      this.pitch_on = true
      Pitch_Detector.start({
        onNote: function (note) {
          app.clear_all('highlight')
          let key = app.get_key(note)
          if (key) key.highlight = true
        },
        onPause: function () {
          app.clear_all('highlight')
        }
      })
    },
    pitch_disable: function () {
      this.pitch_on = false
      Pitch_Detector.stop()
    },
    start_recording: function () {
      this.recording = true
      this.record_start_time = Tone.now()
    },
    stop_recording: function () {
      this.recording = false
      this.recordings.push({
        name: 'Recording ' + (this.recordings.length + 1),
        data: this.buffer
      })
      localStorage.setItem('recordings', JSON.stringify(this.recordings))
      this.buffer = []
    },
    record: function (pitch, stroke) {
      if (this.recording) this.buffer.push({
        key: pitch,
        stroke: stroke,
        time: Tone.now() - this.record_start_time
      })
    },
    download: function (data) {
      console.log(data)
    },
    play: function (data) {
      let now = Tone.now()
      data.forEach(e => {
        if (e.stroke == 'down') {
          setTimeout(() => {
            let key = this.get_key(e.key)
            if (key) {
              key.pressed = true
              app.record(key.pitch, 'down') // Yes we record the autoplay
            }
          }, e.time * 1000)
          synth.triggerAttack(e.key, now + e.time)
        } else if (e.stroke == 'up') {
          setTimeout(() => {
            let key = this.get_key(e.key)
            if (key) {
              key.pressed = false
              app.record(key.pitch, 'up') // Yes we record the autoplay
            }
          }, e.time * 1000)
          synth.triggerRelease(e.key, now + e.time)
        }
      })
    },
    remove_recording: function (index) {
      this.recordings.splice(index, 1)
      localStorage.setItem('recordings', JSON.stringify(this.recordings))
    },
    get_note: function (key) {
      return this.binding.low[key] || this.binding.high[key]
    },
    get_key: function (note) {
      let keys = Object.values({...this.binding.low, ...this.binding.high})
      for (const key of keys) {
        if (key.pitch == note) return key
      }
    },
    clear_all: function (attr) {
      let keys = Object.values({...this.binding.low, ...this.binding.high})
      keys.forEach(v => v[attr] = false)
    }
  }
})