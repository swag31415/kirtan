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
  let low_mapping = map_keys(keys.keyboard.low, keys.piano.low)
  let high_mapping = map_keys(keys.keyboard.high, keys.piano.high)
  return Object.fromEntries([...low_mapping, ...high_mapping])
}

const synth = new Tone.PolySynth(Tone.Synth).toDestination()
const binding = get_binding(-2)
const pressed = {}

document.addEventListener('keydown', e => {
  if (binding[e.key]) {
    e.preventDefault()
    if (!pressed[e.key]) {
      synth.triggerAttack(binding[e.key])
      pressed[e.key] = true
    }
  }
})

document.addEventListener('keyup', e => {
  if (binding[e.key]) {
    e.preventDefault()
    synth.triggerRelease(binding[e.key])
    pressed[e.key] = false
  }
})