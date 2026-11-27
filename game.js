// ReSorter: the game in data.
// This file only knows numbers: "colour 1", "colour 2"...
// How a colour looks is decided in the theme files (theme-*.css), not here.
// Putting the bottles on the screen happens in draw.js.

// How many layers fit in one bottle.
const capacity = 4;

// ---------- The level path: the same levels for everyone (lesson 17b) ----------

// The path has 100 levels. They get harder every 3 levels (see levelSettings); from level 34
// on they stay at the hardest setting. Level 100 is the end: the whole world is restored.
const maxLevel = 100;

// The level the player is on, and the highest level reached so far (both are saved).
// Every level up to highestLevel can be chosen in the level grid (lesson 21b).
let levelNumber = 1;
let highestLevel = 1;

// levelSettings(n) is the difficulty curve: how many colours and empty bottles level n has.
// The levels come in blocks of 3 (1-3, 4-6, 7-9...), and every block is clearly harder:
//   levels 1-21 (the first 7 blocks): 4, 5, 6, 7, 8, 9, 10 colours, with 2 empty bottles;
//   levels 22-36 (the next 5 blocks): only 1 empty bottle (much less room), 6, 7, 8, 9, 10 colours;
//   (measured in lesson 21a: every level from 1 to 150 is made in under 0.6 seconds on a laptop)
//   level 34 and up: 10 colours and 1 empty bottle (the hardest).
// (If you ever change this curve, also raise saveVersion in save.js: saved path games
// were made with the old curve.)
function levelSettings(n) {
  const block = Math.floor((n - 1) / 3);   // level 1-3 = block 0, 4-6 = block 1, ...
  if (block <= 6) {
    return { colours: 4 + block, empty: 2 };                  // 4 to 10 colours, 2 empty
  }
  return { colours: Math.min(10, 6 + (block - 7)), empty: 1 };  // 6 to 10 colours, 1 empty
}

// levelRandom(n) gives the dice for level n. It always starts from the same seed for the
// same level number, so level 37 is the same level for every player.
function levelRandom(n) {
  return makeSeededRandom(500009 + n * 7919);
}

// makeSeededRandom(seed): a dice that always throws the same numbers for the same seed.
function makeSeededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

// How many colours the current level has, and how many empty bottles. ("let": they change
// with the level.) The game starts on level 1 of the path.
let colourCount = levelSettings(1).colours;
let emptyBottles = levelSettings(1).empty;

// The most extra empty bottles makeRandomLevel may add when a level is very hard to make
// (save.js checks this too).
const maxExtraEmpty = 3;

// A spare (easy) level, only used if the computer somehow cannot make a random one at all.
// Each bottle is a list of colour numbers, from BOTTOM to TOP.
// (The last number is the top layer: the one you can pour.)
// An empty list [] is an empty bottle.
const spareLevel = [
  [4, 3, 1, 2],
  [2, 1, 3, 4],
  [4, 3, 2, 1],
  [1, 2, 4, 3],
  [],
  []
];

// copyBottles(list) makes a real copy: new bottles with the same colours.
// (Just writing "a = b" would NOT copy: both names would point at the same bottles,
// and a pour would change both.)
function copyBottles(list) {
  return list.map(function (bottle) {
    return bottle.slice();   // slice() copies one bottle
  });
}

// The level as it starts (made by makeRandomLevel, further down). Restart goes back to it.
// (Careful: this runs at once. Everything makeRandomLevel needs must be written ABOVE this line,
// except functions, which JavaScript always knows in advance.)
let startingBottles = makeRandomLevel(levelRandom(1));

// The bottles as they are now, during play. They start as a copy of the starting level.
let bottles = copyBottles(startingBottles);

// The move history ("history" alone is already a name the browser uses): a stack of copies, one saved just before every pour.
// Undo takes the newest one off the top of the stack.
let moveHistory = [];

// Which bottle is picked up: its number (0 = bottle 1, 1 = bottle 2...),
// or null when no bottle is picked up. "null" means "nothing".
let selectedBottle = null;

// A short message for the player, for example why a pour is not allowed.
// An empty text "" means: no message.
let message = "";

// The bottle where the last move went wrong (it will ripple), or null if nothing went wrong.
let wrongBottle = null;

// The last pour that happened, or null if the last tap was not a pour.
// It is an object: a group of named values, like { from: 0, to: 4, colour: 2, ... }.
let lastPour = null;

// The message when the player wins.
const winMessage = "Order is restored! Kharosa's chaos is sorted.";

// Has the player won? true = yes, false = not yet.
let won = false;

// How many levels the player has won (it is saved, see save.js).
let levelsWon = 0;


// movesMade() gives the number of pours in this level. Undo takes one off.
function movesMade() {
  return moveHistory.length;
}

// ---------- Did I win? ----------

// isSorted(bottle) checks one bottle: it is done if it is empty,
// or if it is full AND every layer has the same colour.
// ("Full" matters: otherwise one colour split over two half-full bottles would count as a win.)
function isSorted(bottle) {
  if (bottle.length === 0) {
    return true;
  }
  if (bottle.length !== capacity) {
    return false;
  }
  // A loop: look at every colour in this bottle, one by one.
  for (const colour of bottle) {
    if (colour !== bottle[0]) {
      return false;   // a different colour: not sorted
    }
  }
  return true;
}

// isClosed(bottle) checks if a bottle is sorted AND has colour in it: then it gets its stopper
// and is closed. (An empty bottle is "sorted" too, but it stays open.)
function isClosed(bottle) {
  return bottle.length > 0 && isSorted(bottle);
}

// checkWin() checks all bottles. One bottle that is not sorted is enough to say "not yet".
function checkWin() {
  // A loop: look at every bottle, one by one.
  for (const bottle of bottles) {
    if (!isSorted(bottle)) {   // ! means "not"
      return false;
    }
  }
  return true;
}

// ---------- The pour rule ----------

// topColour(bottle) gives the colour number of the top layer, or null if the bottle is empty.
function topColour(bottle) {
  if (bottle.length === 0) {
    return null;
  }
  return bottle[bottle.length - 1];   // the last one in the list is the top
}

// whyNotPour(from, to, list) checks the rule. It gives back a reason why the pour is NOT allowed,
// or an empty text "" if the pour is allowed.
// (The source is never empty here: tapBottle does not let you pick up an empty bottle.)
function whyNotPour(from, to, list = bottles) {
  const source = list[from];
  const target = list[to];

  if (isClosed(target)) {
    return "This one is sorted and closed.";
  } else if (target.length === capacity) {
    return "This one is full.";
  } else if (target.length > 0 && topColour(target) !== topColour(source)) {
    return "To restore order, use only the same colours.";
  } else {
    return "";   // empty target, or same colour with room: allowed
  }
}

// pour(from, to, list) moves layers: all the same top colour, as many as fit.
// "list = bottles" is a default value: if you leave "list" out, the real bottles are used.
// The solver (further down) passes its own list, to try moves without touching the real game.
function pour(from, to, list = bottles) {
  const source = list[from];
  const target = list[to];
  const colour = topColour(source);

  // Safety check: an empty bottle has nothing to pour.
  if (colour === null) {
    return;
  }

  // Keep moving one layer while the top is still the same colour AND there is room.
  while (topColour(source) === colour && target.length < capacity) {
    target.push(source.pop());   // pop = take the top layer off; push = put it on top
  }
}

// ---------- A tap ----------

// The rule for a tap: the player tapped bottle "number".
function tapBottle(number) {
  // After a win, taps do nothing any more.
  if (won) {
    return;
  }

  message = "";
  wrongBottle = null;
  lastPour = null;

  if (selectedBottle === null) {
    // Nothing picked up yet: pick up this bottle, unless it is empty or closed.
    if (bottles[number].length === 0) {
      message = "This one is empty. Pick one with colour in it.";
      wrongBottle = number;
    } else if (isClosed(bottles[number])) {
      message = "This one is sorted and closed.";
      wrongBottle = number;
    } else {
      selectedBottle = number;
    }
  } else if (selectedBottle === number) {
    // Tapping the picked-up bottle again puts it back down.
    selectedBottle = null;
  } else {
    // A bottle is picked up and the player tapped another one: try to pour.
    const reason = whyNotPour(selectedBottle, number);
    if (reason === "") {
      moveHistory.push(copyBottles(bottles));   // remember how it was, for Undo
      // Remember what this pour was, so the screen can show it as an animation.
      const amountBefore = bottles[number].length;
      const colour = topColour(bottles[selectedBottle]);
      pour(selectedBottle, number);
      lastPour = {
        from: selectedBottle,
        to: number,
        colour: colour,
        layersBefore: amountBefore,   // how many layers the target had before the pour
        closes: isClosed(bottles[number]),   // true if this pour sorted the target (stopper!)
        // A copy of both bottles right after this pour. The animation may have to wait its turn,
        // and by then the player may have made more moves; the copies keep this moment.
        sourceAfter: bottles[selectedBottle].slice(),
        targetAfter: bottles[number].slice()
      };
      if (checkWin()) {
        won = true;
        levelsWon = levelsWon + 1;
        // The next level is now reached: it opens in the level grid. (It stays open, also after
        // Undo or Restart: you did solve it once.)
        highestLevel = Math.max(highestLevel, Math.min(levelNumber + 1, maxLevel));
        message = winMessage + " " + nextLevelText();
      }
      saveProgress();   // remember this in the browser (save.js)
    } else {
      message = reason;
      wrongBottle = number;   // the bottle you tried to pour into ripples
    }
    selectedBottle = null;   // after a pour, or a wrong move, the bottle goes back down
  }
}

// ---------- Undo and Restart ----------

// undo() goes back one pour. You can press it again and again, back to the start.
function undo() {
  selectedBottle = null;
  wrongBottle = null;
  if (moveHistory.length === 0) {
    message = "Nothing to undo yet.";
    return;
  }
  bottles = moveHistory.pop();   // take the newest saved copy off the stack
  if (won) {
    won = false;               // after an undo, the level is not won any more...
    levelsWon = levelsWon - 1; // ...so it does not count as won either
  }
  message = "";
  saveProgress();
}

// restartLevel() is what the Restart button does: if the level was already won,
// the win is taken back first (like Undo), so it is not counted twice.
function restartLevel() {
  if (won) {
    levelsWon = levelsWon - 1;
  }
  restart();
}

// restart() puts the level back to how it started.
function restart() {
  bottles = copyBottles(startingBottles);
  moveHistory = [];
  selectedBottle = null;
  wrongBottle = null;
  won = false;
  message = "";
  saveProgress();
}

// ---------- Random levels ----------

// makeRandomLevel() makes a new level and checks that it can be solved.
// If a level cannot be solved, it simply throws it away and tries again.
function makeRandomLevel(random = Math.random) {
  // Normally a good level is found at once. With very many colours and few empty bottles it can
  // take long, so after 2 seconds we add one extra empty bottle (that makes it easier to solve)
  // and try again. So the page never freezes for long, and the level is always solvable.
  // For a path level (seeded dice) we count tries instead of seconds: then level 37 is the same
  // on a slow phone and on a fast laptop.
  const seeded = (random !== Math.random);
  for (let extraEmpty = 0; extraEmpty <= maxExtraEmpty; extraEmpty++) {
    const stopTime = performance.now() + 2000;
    let tries = 0;
    while (seeded ? tries < 5000 : performance.now() < stopTime) {
      tries = tries + 1;
      const level = shuffledLevel(extraEmpty, random);
      // A level is no good if a bottle is already sorted at the start, or if it can't be solved.
      if (!level.some(isClosed) && canBeSolved(level)) {
        return level;
      }
    }
  }
  return copyBottles(spareLevel);   // (practically never needed)
}

// shuffledLevel() puts every colour "capacity" times in a pile, shuffles the pile,
// and fills the bottles from it. Then it adds the empty bottles.
function shuffledLevel(extraEmpty = 0, random = Math.random) {
  const pile = [];
  for (let colour = 1; colour <= colourCount; colour++) {
    for (let count = 0; count < capacity; count++) {
      pile.push(colour);
    }
  }

  // Shuffle: walk from the end of the pile to the start, and swap every layer
  // with a layer at a random place before it (or itself). Every order is equally likely.
  for (let place = pile.length - 1; place > 0; place--) {
    const other = Math.floor(random() * (place + 1));   // a random whole number 0..place
    const keep = pile[place];
    pile[place] = pile[other];
    pile[other] = keep;
  }

  const level = [];
  for (let bottle = 0; bottle < colourCount; bottle++) {
    level.push(pile.slice(bottle * capacity, (bottle + 1) * capacity));
  }
  for (let count = 0; count < emptyBottles + extraEmpty; count++) {
    level.push([]);
  }
  return level;
}

// ---------- The solver: can this level be solved? ----------

// canBeSolved(level) lets the computer try moves, like a very patient player:
// it keeps a list of situations still to look at, and a list of situations it has already seen.
// From every situation it tries every allowed pour. If it ever reaches a solved situation: yes.
// If it runs out of new situations: no.
function canBeSolved(level) {
  const maxSituations = 100000;   // a safety limit, so the page never freezes
  const seen = new Set();          // a Set is a list without doubles, which is very fast to search
  const toLookAt = [level];
  seen.add(situationKey(level));

  while (toLookAt.length > 0) {
    if (seen.size > maxSituations) {
      return false;   // too big to check: we treat it as "no" and make another level
    }
    const situation = toLookAt.pop();
    if (situation.every(isSorted)) {
      return true;
    }
    for (let from = 0; from < situation.length; from++) {
      const source = situation[from];
      if (source.length === 0 || isClosed(source)) {
        continue;   // nothing to pour, or a closed bottle: skip it
      }
      for (let to = 0; to < situation.length; to++) {
        if (from === to || whyNotPour(from, to, situation) !== "") {
          continue;   // not allowed
        }
        // Pointless: pouring a bottle that holds only one colour into an empty bottle.
        if (situation[to].length === 0 && source.every(function (c) { return c === source[0]; })) {
          continue;
        }
        const next = copyBottles(situation);
        pour(from, to, next);
        const key = situationKey(next);
        if (!seen.has(key)) {
          seen.add(key);
          toLookAt.push(next);
        }
      }
    }
  }
  return false;
}

// situationKey(list) turns a situation into a short text, like "1,2,4|3,3|...".
// The bottles are sorted first, so the same bottles in another order count as the same situation.
function situationKey(list) {
  return list.map(function (bottle) { return bottle.join(","); }).sort().join("|");
}

// nextLevelText() is the second half of the win message: what comes next.
function nextLevelText() {
  if (levelNumber >= maxLevel) {
    return "You restored the whole world: all " + maxLevel + " levels are done!";
  }
  return "Level " + (levelNumber + 1) + " is coming...";
}

// ---------- A new level ----------

// newLevel() starts the level the player is on.
function newLevel() {
  startPathLevel(levelNumber);
}

// startPathLevel(n) starts level n of the path: always the same level for the same number.
function startPathLevel(n) {
  levelNumber = n;
  highestLevel = Math.max(highestLevel, n);
  colourCount = levelSettings(n).colours;
  emptyBottles = levelSettings(n).empty;
  startingBottles = makeRandomLevel(levelRandom(n));
  restart();
}

// nextLevel() is what happens after a win: the next level number. (After level 100 there is
// no next level: draw.js does not call this then. Math.min is only a safety limit.)
function nextLevel() {
  startPathLevel(Math.min(levelNumber + 1, maxLevel));
}
