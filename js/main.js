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
  const wrapped_get = (arr, i) => arr[(i + arr.length) % arr.length]
  const map_keys = (keyboard, piano) => keyboard.map((key, i) => {
    index = i + offset + 4*7-3 // Add an offset to make 'e' middle-c by default
    pitch = wrapped_get(piano, index)
    octave = Math.floor(index / 7)
    return [key, pitch && pitch + octave]
  })
  function show_keys(mapping, type) {
    let key_templ = document.getElementById(type)
    let lab_templ = document.querySelector(`[for=${type}]`)
    document.querySelectorAll('.'+type).forEach(e => e.remove())
    mapping.forEach(([key, note], i) => {
      if (note != null) {
        let tmp = key_templ.cloneNode()
        let ltmp = lab_templ.cloneNode()
        let transform = `translate(${i*60},0)`
        tmp.setAttribute('transform', transform)
        ltmp.setAttribute('transform', transform)
        tmp.classList.add(type)
        ltmp.classList.add(type)
        tmp.id = note
        ltmp.textContent = note
        key_templ.after(tmp)
        lab_templ.after(ltmp)
      }
    })
  }
  let low_mapping = map_keys(keys.keyboard.low, keys.piano.low)
  let high_mapping = map_keys(keys.keyboard.high, keys.piano.high)
  show_keys(low_mapping, 'lowkey')
  show_keys(high_mapping, 'highkey')
  return Object.fromEntries([...low_mapping, ...high_mapping])
}

const samples = ['A#2','A#3','A#4','A2','A3','A4','B2','B3','B4','C#2','C#3','C#4','C#5','C2','C3','C4','C5','D#2','D#3','D#4','D2','D3','D4','D5','E2','E3','E4','F#2','F#3','F#4','F2','F3','F4','G#2','G#3','G#4','G2','G3','G4']
const synth = new Tone.Sampler({
	urls: Object.fromEntries(samples.map(note => [note, note.replace('#', '%23') + '.wav'])),
	baseUrl: "https://swag31415.github.io/kirtan/samples/harmonium/",
}).toDestination();
var key_index = -8
var binding = get_binding(key_index)
const valid_index_range = { min: -25, max: 54 }
const pressed = {}

document.addEventListener('keydown', e => {
  if (binding[e.key]) {
    e.preventDefault()
    if (!pressed[e.key]) {
      try {
        synth.triggerAttack(binding[e.key])
        pressed[e.key] = true
        document.getElementById(binding[e.key]).classList.add('active')
      } catch {
        M.toast({html: 'Still loading, give it a second'})
      }
    }
  } else if (e.key == 'ArrowLeft' && key_index < valid_index_range.max) {
    key_index += 1
    binding = get_binding(key_index)
  } else if (e.key == 'ArrowRight' && key_index > valid_index_range.min) {
    key_index -= 1
    binding = get_binding(key_index)
  }
})

document.addEventListener('keyup', e => {
  if (binding[e.key]) {
    e.preventDefault()
    synth.triggerRelease(binding[e.key])
    pressed[e.key] = false
    document.getElementById(binding[e.key]).classList.remove('active')
  }
})

const clear_triggered = () => document.querySelectorAll('path.trigger').forEach(path => path.classList.remove('trigger'))
document.getElementById('pitch-detection').addEventListener('click', e => {
  Pitch_Detector.start({
    onNote: function (note) {
      let key = document.getElementById(note)
      if (key) {
        clear_triggered()
        key.classList.add('trigger')
      }
    },
    onPause: function () {
      clear_triggered()
    }
  })
})