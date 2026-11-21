// ReSorter: saving progress in the player's own browser.
// We use localStorage: a small storage space in the browser, only for this game, on this device.
// Nothing is sent anywhere, and no name or personal data is stored: only the game itself.
// Saved data could have been changed by someone, so when we load it we CHECK everything first.
// Note: index.html must load this file right AFTER game.js (and before draw.js).

// The name under which the game is saved, and a version number for the way it is saved.
// (If we ever change what we save, we raise the version. Version 1 saves are converted: see isOldSave.)
// (A clear, distinctive name, so it never mixes with other pages that use localStorage.)
const saveKey = "resorter-progress";
// Version 2 (lesson 21a): the new difficulty curve, and the highest level reached.
const saveVersion = 2;

// ---------- Saving ----------

// saveProgress() writes the game into localStorage, as text (JSON).
function saveProgress() {
  const data = {
    version: saveVersion,
    startingBottles: startingBottles,
    bottles: bottles,
    moveHistory: moveHistory.slice(-1000),   // only the newest 1000 moves (loading accepts at most 1000)
    levelsWon: levelsWon,
    levelNumber: levelNumber,     // the level on the path
    highestLevel: highestLevel    // the highest level reached (for the level grid)
  };
  try {
    localStorage.setItem(saveKey, JSON.stringify(data));
  } catch (problem) {
    // Some browsers do not allow saving (for example a private window). Then we just don't save.
  }
}

// forgetProgress() removes everything this game saved.
function forgetProgress() {
  try {
    localStorage.removeItem(saveKey);
  } catch (problem) {
    // nothing to do
  }
}

// ---------- Loading ----------

// loadProgress() reads the saved game, checks it, and if it is all right, continues it.
// If anything is wrong or missing, it starts fresh (and removes the broken save).
function loadProgress() {
  let data;
  try {
    const text = localStorage.getItem(saveKey);
    if (text === null) {
      return;   // nothing saved yet
    }
    data = JSON.parse(text);   // turn the text back into an object
  } catch (problem) {
    forgetProgress();          // not readable: throw it away
    return;
  }

  // Saves from before lesson 21a (version 1) were made with the old, easier levels.
  // Then we keep the level number and the levels won, and start that level fresh (new curve).
  // (Some of them are still in free play (Easy, Medium, Hard), from before lesson 20.)
  if (isOldSave(data)) {
    levelsWon = data.levelsWon;
    let level = savedLevel(data.levelNumber);
    if (typeof data.difficulty === "string" && data.difficulty !== "path" && level === maxLevel) {
      level = maxLevel + 1;   // old free play after winning all 100 levels: go on to 101
    }
    highestLevel = level;
    startPathLevel(level);    // (this also saves it in the new way)
    return;
  }

  if (!isGoodSave(data)) {
    forgetProgress();
    return;
  }

  // Everything checked: use it.
  levelNumber = savedLevel(data.levelNumber);
  highestLevel = data.highestLevel;
  colourCount = levelSettings(levelNumber).colours;
  emptyBottles = levelSettings(levelNumber).empty;
  startingBottles = copyBottles(data.startingBottles);
  bottles = copyBottles(data.bottles);
  moveHistory = data.moveHistory.map(copyBottles);
  levelsWon = data.levelsWon;

  // A level that was already won when the page closed: start a new one.
  if (checkWin()) {
    nextLevel();
  }
}

// savedLevel(value): a level number from a save. Older saves have none: then level 1.
function savedLevel(value) {
  return (value === undefined) ? 1 : value;
}

// isGoodLevelNumber(value): missing (older saves) or a whole number from 1 to highestLevelNumber.
function isGoodLevelNumber(value) {
  return value === undefined ||
         (Number.isInteger(value) && value >= 1 && value <= highestLevelNumber);
}

// isGoodWinCount(value): a whole number from 0 to a million.
function isGoodWinCount(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1000000;
}

// isOldSave(data): a save from before lesson 21a (version 1).
// Only the level number and the levels won are used from it, so only those are checked.
function isOldSave(data) {
  return typeof data === "object" && data !== null && data.version === 1 &&
         isGoodLevelNumber(data.levelNumber) && isGoodWinCount(data.levelsWon);
}

// ---------- Checking saved data (never trust it blindly) ----------

// isGoodSave(data) checks every part of a saved game. It gives true only if all is well.
function isGoodSave(data) {
  if (typeof data !== "object" || data === null || data.version !== saveVersion) {
    return false;
  }
  if (!isGoodLevelNumber(data.levelNumber) || !isGoodWinCount(data.levelsWon)) {
    return false;
  }
  // The highest level reached: a real level number, and never lower than the current level.
  if (data.highestLevel === undefined || !isGoodLevelNumber(data.highestLevel) ||
      data.highestLevel < savedLevel(data.levelNumber)) {
    return false;
  }
  const colours = levelSettings(savedLevel(data.levelNumber)).colours;
  const empty = levelSettings(savedLevel(data.levelNumber)).empty;
  if (!isGoodLevel(data.startingBottles, colours, empty) || !isGoodLevel(data.bottles, colours, empty)) {
    return false;
  }
  if (!Array.isArray(data.moveHistory) || data.moveHistory.length > 1000) {
    return false;
  }
  for (const step of data.moveHistory) {
    if (!isGoodLevel(step, colours, empty) || step.length !== data.bottles.length) {
      return false;
    }
  }
  if (data.startingBottles.length !== data.bottles.length) {
    return false;
  }
  // The starting level must be a fair one, like a fresh random level: no bottle already
  // sorted at the start, and solvable. (Someone could have changed the saved level by hand.)
  return !data.startingBottles.some(isClosed) && canBeSolved(data.startingBottles);
}

// isGoodLevel(level, colours, empty) checks one set of bottles: the right number of bottles,
// no bottle too full, only whole colour numbers from 1 to "colours", and every colour
// exactly "capacity" times.
function isGoodLevel(level, colours, empty) {
  if (!Array.isArray(level)) {
    return false;
  }
  // (makeRandomLevel may add up to maxExtraEmpty extra empty bottles; see game.js)
  if (level.length < colours + empty || level.length > colours + empty + maxExtraEmpty) {
    return false;
  }
  const counts = new Array(colours + 1).fill(0);
  for (const bottle of level) {
    if (!Array.isArray(bottle) || bottle.length > capacity) {
      return false;
    }
    for (const colour of bottle) {
      if (!Number.isInteger(colour) || colour < 1 || colour > colours) {
        return false;
      }
      counts[colour] = counts[colour] + 1;
    }
  }
  for (let colour = 1; colour <= colours; colour++) {
    if (counts[colour] !== capacity) {
      return false;
    }
  }
  return true;
}

// ---------- Reset progress ----------

// resetProgress() forgets everything and starts fresh: level 1 of the path, no levels won.
function resetProgress() {
  levelsWon = 0;
  highestLevel = 1;
  startPathLevel(1);       // back to level 1 of the path (this would save it)...
  forgetProgress();        // ...so we remove the save again afterwards: nothing is stored now
  try {
    localStorage.removeItem(settingsKey);   // and the settings, like "always show symbols"
  } catch (problem) {
    // nothing to do
  }
}

// When the page opens: continue a saved game, if there is a good one.
loadProgress();

// ---------- Settings (like "always show symbols") ----------
// Settings are saved apart from the game. Reset progress forgets them too (see resetProgress).

const settingsKey = "resorter-settings";

// loadSetting(name, standard) reads one setting. If it is missing or not a true/false value,
// it gives back "standard". (Saved data is checked: only true or false is accepted.)
function loadSetting(name, standard) {
  try {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    if (settings !== null && typeof settings === "object" && typeof settings[name] === "boolean") {
      return settings[name];
    }
  } catch (problem) {
    // unreadable: use the standard value
  }
  return standard;
}

// saveSetting(name, value) saves one setting (true or false).
function saveSetting(name, value) {
  try {
    let settings = JSON.parse(localStorage.getItem(settingsKey));
    if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
      settings = {};
    }
    settings[name] = (value === true);
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  } catch (problem) {
    // saving not allowed: the setting just lasts until the page closes
  }
}

// loadNumberSetting(name, standard, lowest, highest) reads a setting that is a whole number,
// like the music volume (0 to 100). Anything else, or a number outside lowest..highest,
// gives back "standard". (Saved data is checked: never trusted blindly.)
function loadNumberSetting(name, standard, lowest, highest) {
  try {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    if (settings !== null && typeof settings === "object") {
      const value = settings[name];
      if (Number.isInteger(value) && value >= lowest && value <= highest) {
        return value;
      }
    }
  } catch (problem) {
    // unreadable: use the standard value
  }
  return standard;
}

// saveNumberSetting(name, value) saves one whole-number setting.
function saveNumberSetting(name, value) {
  try {
    let settings = JSON.parse(localStorage.getItem(settingsKey));
    if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
      settings = {};
    }
    settings[name] = Math.round(Number(value)) || 0;
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  } catch (problem) {
    // saving not allowed: the setting just lasts until the page closes
  }
}
