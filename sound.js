// ReSorter: sound effects (lesson 17c).
// All sounds are MADE by code, with the browser's Web Audio API: no sound files, no licences.
// A sound is built from:
//   - an oscillator: a tone that vibrates a number of times per second (the frequency, in Hz;
//     a higher number sounds higher);
//   - a gain: the volume, which we turn up quickly and let fade out, like a plucked string;
//   - sometimes noise: a hiss of random sound, for a thud or a puff.
// Note: browsers only allow sound after the player's first tap or click on the page.
// Note: index.html must load this file after save.js (it uses loadSetting).

// ---------- Settings ----------

// Is the sound on? Saved as a setting (save.js). Sound starts on.
let soundOn = loadSetting("soundOn", true);

// How loud everything is, from 0 (silent) to 1 (very loud).
const masterVolume = 0.6;

// ---------- The sound machine ----------

// The browser's sound machine (an "audio context"). It is made at the first sound.
let audio = null;

// getAudio() gives the sound machine, or null if the sound is off or not possible.
function getAudio() {
  if (!soundOn) {
    return null;
  }
  if (audio === null) {
    const Machine = window.AudioContext || window.webkitAudioContext;   // (older Safari: webkit...)
    if (!Machine) {
      return null;   // this browser cannot make sound
    }
    audio = new Machine();
  }
  if (audio.state === "suspended") {
    audio.resume().catch(function () {});   // wake it up (browsers pause it until the first tap)
  }
  return audio;
}

// stopAllSounds() silences everything at once, also sounds that were already planned
// (for example the rest of a pour). Used when the player switches the sound off.
function stopAllSounds() {
  if (audio !== null) {
    audio.suspend().catch(function () {});
  }
}

// tone(settings) plays one tone. Settings (all optional except frequency and length):
//   frequency: how high it starts (Hz); endFrequency: how high it ends (it slides there);
//   length: how long it sounds (seconds); delay: wait this long before it starts (seconds);
//   type: the wave shape, "sine" (soft), "triangle" (a bit brighter); volume: 0 to 1.
function tone(settings) {
  const machine = getAudio();
  if (machine === null) {
    return;
  }
  const start = machine.currentTime + (settings.delay || 0);
  const end = start + settings.length;
  const oscillator = machine.createOscillator();
  const gain = machine.createGain();
  oscillator.type = settings.type || "sine";
  oscillator.frequency.setValueAtTime(settings.frequency, start);
  if (settings.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(settings.endFrequency, end);
  }
  // The volume: from silent, quickly up, then slowly fading out.
  const volume = (settings.volume || 0.2) * masterVolume;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(machine.destination);   // destination = the speakers
  oscillator.start(start);
  oscillator.stop(end + 0.05);
}

// noise(settings) plays a short hiss, made softer and deeper by a filter.
//   length, delay, volume as above; filter: how high the hiss may go (Hz; lower = deeper).
function noise(settings) {
  const machine = getAudio();
  if (machine === null) {
    return;
  }
  const start = machine.currentTime + (settings.delay || 0);
  const buffer = machine.createBuffer(1, Math.ceil(machine.sampleRate * settings.length), machine.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.random() * 2 - 1;   // random values between -1 and 1: that is a hiss
  }
  const source = machine.createBufferSource();
  source.buffer = buffer;
  const filter = machine.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = settings.filter || 800;
  const gain = machine.createGain();
  const volume = (settings.volume || 0.2) * masterVolume;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + settings.length);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(machine.destination);
  source.start(start);
}

// ---------- The game's sounds ----------

// Picking up a bottle: a tiny click.
function soundPickUp() {
  tone({ frequency: 900, endFrequency: 700, length: 0.05, volume: 0.08, type: "triangle" });
}

// Pouring: small bubbles ("glug") for as long as the pour lasts (seconds), starting after "delay".
function soundPour(seconds, delay) {
  const bubbles = Math.max(3, Math.round(seconds * 9));
  for (let i = 0; i < bubbles; i++) {
    const when = (delay || 0) + (i / bubbles) * seconds + Math.random() * 0.03;
    const pitch = 260 + Math.random() * 180;
    tone({ frequency: pitch, endFrequency: pitch * 1.6, length: 0.07, volume: 0.12, delay: when });
  }
}

// A box landing on a shelf: a soft thud. "big" for the final box of a sorted shelf.
function soundThud(big) {
  tone({ frequency: big ? 110 : 160, endFrequency: big ? 50 : 90, length: big ? 0.3 : 0.15, volume: big ? 0.45 : 0.2 });
  noise({ length: big ? 0.15 : 0.08, volume: big ? 0.25 : 0.1, filter: 500 });
}

// A wrong move: a soft, low "bonk".
function soundWrong() {
  tone({ frequency: 180, endFrequency: 120, length: 0.18, volume: 0.18, type: "triangle" });
}

// A bottle (or shelf) is sorted: a two-note chime.
function soundSorted() {
  tone({ frequency: 784, length: 0.5, volume: 0.18, type: "triangle" });
  tone({ frequency: 1175, length: 0.6, volume: 0.14, delay: 0.09 });
}

// A win: a short rising melody (C, E, G, high C).
function soundWin() {
  [523, 659, 784, 1047].forEach(function (frequency, i) {
    tone({ frequency: frequency, length: 0.6, volume: 0.18, delay: i * 0.13, type: "triangle" });
  });
}
