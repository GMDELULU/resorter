// ReSorter: the game in data.
// This file only knows numbers: "colour 1", "colour 2"...
// How a colour looks is decided in style.css (the look), not here.
// Putting the bottles on the screen happens in draw.js.

// How many layers fit in one bottle.
const capacity = 4;

// How many colours a level has, and how many empty bottles.
const colourCount = 4;
const emptyBottles = 2;

// A spare level, only used if the computer somehow cannot make a random one.
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
let startingBottles = makeRandomLevel();

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

// The bottle that was just closed by the last pour (it gets its stopper), or null.
let justClosed = null;

// The message when the player wins.
const winMessage = "Order is restored! Kharosa's chaos is sorted.";
// Added after the win message, because a new level starts by itself.
const nextLevelMessage = "A new level is coming...";

// Has the player won? true = yes, false = not yet.
let won = false;

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
    return "That bottle is sorted and closed.";
  } else if (target.length === capacity) {
    return "That bottle is full.";
  } else if (target.length > 0 && topColour(target) !== topColour(source)) {
    return "You can only pour onto the same colour.";
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
  justClosed = null;

  if (selectedBottle === null) {
    // Nothing picked up yet: pick up this bottle, unless it is empty or closed.
    if (bottles[number].length === 0) {
      message = "That bottle is empty. Pick a bottle with colour in it.";
      wrongBottle = number;
    } else if (isClosed(bottles[number])) {
      message = "That bottle is sorted and closed.";
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
        layersBefore: amountBefore    // how many layers the target had before the pour
      };
      if (isClosed(bottles[number])) {
        justClosed = number;   // this pour sorted the bottle: it gets its stopper
      }
      if (checkWin()) {
        won = true;
        message = winMessage + " " + nextLevelMessage;
      }
    } else {
      message = reason;
      wrongBottle = number;   // the bottle you tried to pour into shakes
    }
    selectedBottle = null;   // after a pour, or a wrong move, the bottle goes back down
  }
}

// ---------- Undo and Restart ----------

// undo() goes back one pour. You can press it again and again, back to the start.
function undo() {
  selectedBottle = null;
  wrongBottle = null;
  justClosed = null;
  if (moveHistory.length === 0) {
    message = "Nothing to undo yet.";
    return;
  }
  bottles = moveHistory.pop();   // take the newest saved copy off the stack
  won = false;               // after an undo, the level is not won any more
  message = "";
}

// restart() puts the level back to how it started.
function restart() {
  bottles = copyBottles(startingBottles);
  justClosed = null;
  moveHistory = [];
  selectedBottle = null;
  wrongBottle = null;
  won = false;
  message = "";
}

// ---------- Random levels ----------

// makeRandomLevel() makes a new level and checks that it can be solved.
// If a level cannot be solved, it simply throws it away and tries again.
function makeRandomLevel() {
  for (let attempt = 0; attempt < 500; attempt++) {
    const level = shuffledLevel();
    // A level is no good if a bottle is already sorted at the start, or if it can't be solved.
    if (!level.some(isClosed) && canBeSolved(level)) {
      return level;
    }
  }
  return copyBottles(spareLevel);   // (practically never needed)
}

// shuffledLevel() puts every colour "capacity" times in a pile, shuffles the pile,
// and fills the bottles from it. Then it adds the empty bottles.
function shuffledLevel() {
  const pile = [];
  for (let colour = 1; colour <= colourCount; colour++) {
    for (let count = 0; count < capacity; count++) {
      pile.push(colour);
    }
  }

  // Shuffle: walk from the end of the pile to the start, and swap every layer
  // with a layer at a random place before it (or itself). Every order is equally likely.
  for (let place = pile.length - 1; place > 0; place--) {
    const other = Math.floor(Math.random() * (place + 1));   // a random whole number 0..place
    const keep = pile[place];
    pile[place] = pile[other];
    pile[other] = keep;
  }

  const level = [];
  for (let bottle = 0; bottle < colourCount; bottle++) {
    level.push(pile.slice(bottle * capacity, (bottle + 1) * capacity));
  }
  for (let count = 0; count < emptyBottles; count++) {
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

// ---------- A new level ----------

// newLevel() makes a fresh random level and starts it.
function newLevel() {
  startingBottles = makeRandomLevel();
  restart();
}
