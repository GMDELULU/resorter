// ReSorter: sounds and music (lesson 17c, lesson 20b).
// Most sounds are SOUND FILES in the "sounds" folder (made by other people, see Credits in the menu).
// Two small sounds are still MADE by code, with the browser's Web Audio API:
// the click when you pick up a bottle, and the thud of a box landing on a shelf.
// Note: browsers only allow sound after the player's first tap or click on the page.
// Note: index.html must load this file after save.js (it uses loadSetting).

// ---------- Settings ----------

// Is the sound on? Saved as a setting (save.js). It starts on.
let soundOn = loadSetting("soundOn", true);

// How loud the music is, from 0 (off) to 100 (as loud as it goes). The player sets it with the
// slider in the menu; it is saved as a setting (save.js). It starts at 25: quiet,
// so the sound effects stay clear.
const standardMusicLevel = 25;
let musicLevel = loadNumberSetting("musicLevel", standardMusicLevel, 0, 100);

// How loud everything is, from 0 (silent) to 1 (very loud).
const masterVolume = 0.6;

// The sound files, by name. (The "sounds" folder holds smaller copies of the original files.)
const soundFiles = {
  pour: "sounds/pour.wav",
  interface: "sounds/interface.wav",
  wrong: "sounds/wrong.mp3",
  bottleSorted: "sounds/bottle-sorted.mp3",
  atticClose: "sounds/attic-close.wav",
  levelWon: "sounds/level-won.mp3"
};

// ---------- Playing a sound file ----------

// The sound files, loaded once (an <audio> element for each), so they are ready to play.
const loadedSounds = {};
// The copies that are playing right now, and sounds that are planned for later.
const playingSounds = new Set();
const plannedSounds = new Set();

// playFile(name, settings) plays one sound file. Settings (all optional):
//   volume: 0 to 1; delay: wait this long first (seconds);
//   length: stop after this long (seconds), with a short fade out.
function playFile(name, settings) {
  if (!soundOn) {
    return;
  }
  settings = settings || {};
  if (loadedSounds[name] === undefined) {
    loadedSounds[name] = new Audio(soundFiles[name]);
  }
  // A copy, so the same sound can play twice at the same time (two pours at once).
  const copy = loadedSounds[name].cloneNode();
  copy.volume = Math.min(1, (settings.volume || 1) * masterVolume);

  function start() {
    plannedSounds.delete(timer);
    if (!soundOn) {
      return;
    }
    playingSounds.add(copy);
    copy.addEventListener("ended", function () { playingSounds.delete(copy); });
    copy.play().catch(function () {
      playingSounds.delete(copy);         // (play can fail, for example before the first tap)
    });
    if (settings.length) {
      const stopTimer = setTimeout(function () {
        plannedSounds.delete(stopTimer);
        fadeOut(copy);
      }, settings.length * 1000);
      plannedSounds.add(stopTimer);
    }
  }

  const timer = setTimeout(start, (settings.delay || 0) * 1000);
  plannedSounds.add(timer);
}

// fadeOut(sound) turns a playing sound down in 0.2 seconds, then stops it.
function fadeOut(sound) {
  const steps = 8;
  const startVolume = sound.volume;
  let step = 0;
  const fader = setInterval(function () {
    step = step + 1;
    sound.volume = Math.max(0, startVolume * (1 - step / steps));
    if (step >= steps) {
      clearInterval(fader);
      sound.pause();
      playingSounds.delete(sound);
    }
  }, 25);
}

// stopAllSounds() silences every sound effect at once, also sounds that were planned
// (for example the rest of a pour). Used when the player switches the sound off.
function stopAllSounds() {
  plannedSounds.forEach(function (timer) { clearTimeout(timer); });
  plannedSounds.clear();
  playingSounds.forEach(function (sound) { sound.pause(); });
  playingSounds.clear();
  if (audio !== null) {
    audio.close().catch(function () {});   // the code-made sounds too
    audio = null;
  }
}

// ---------- The music ----------

// The music file only loads when it is first played ("preload none"), so the game opens quickly.
const music = new Audio("sounds/music.wav");
music.preload = "none";
music.loop = true;        // when it ends, it starts again
music.volume = musicLevel / 100;

// startMusic() plays the music if its volume is above 0. stopMusic() pauses it.
function startMusic() {
  if (musicLevel > 0) {
    music.play().catch(function () {});
  }
}

// setMusicLevel(level) changes the music volume (0 to 100). At 0 the music stops;
// turned up from 0, it starts again.
function setMusicLevel(level) {
  musicLevel = level;
  music.volume = level / 100;
  if (level === 0) {
    stopMusic();
  } else if (music.paused) {
    startMusic();
  }
}
function stopMusic() {
  music.pause();
}

// Browsers only allow music after the first tap, click or key. So we start it then, once.
function startMusicAtFirstTap() {
  document.removeEventListener("pointerdown", startMusicAtFirstTap);
  document.removeEventListener("keydown", startMusicAtFirstTap);
  startMusic();
}
document.addEventListener("pointerdown", startMusicAtFirstTap);
document.addEventListener("keydown", startMusicAtFirstTap);

// ---------- The sound machine (for the sounds made by code) ----------

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

// Picking up a bottle: a tiny click (made by code).
function soundPickUp() {
  tone({ frequency: 900, endFrequency: 700, length: 0.05, volume: 0.08, type: "triangle" });
}

// Tapping a button or the menu (Undo, Restart, the menu and its rows).
function soundInterface() {
  playFile("interface", { volume: 0.8 });
}

// Pouring: the pour sound, starting after "delay" (seconds), for as long as the pour lasts.
function soundPour(seconds, delay) {
  playFile("pour", { delay: delay, length: seconds + 0.2 });
}

// A box landing on a shelf: a soft thud (made by code). "big" for the final box of a sorted shelf.
function soundThud(big) {
  tone({ frequency: big ? 110 : 160, endFrequency: big ? 50 : 90, length: big ? 0.3 : 0.15, volume: big ? 0.45 : 0.2 });
  noise({ length: big ? 0.15 : 0.08, volume: big ? 0.25 : 0.1, filter: 500 });
}

// A wrong move or a wrong choice.
function soundWrong() {
  playFile("wrong");
}

// A bottle is sorted (the stopper), or a shelf is sorted (the lid closes): "shelf" is true for the attic.
function soundSorted(shelf) {
  playFile(shelf ? "atticClose" : "bottleSorted");
}

// A level is won.
function soundWin() {
  playFile("levelWon");
}
