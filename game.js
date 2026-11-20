// ReSorter: the game in data.
// This file only knows numbers: "colour 1", "colour 2"...
// How a colour looks is decided in style.css (the look), not here.
// Putting the bottles on the screen happens in draw.js.

// How many layers fit in one bottle.
const capacity = 4;

// The starting level: a list of bottles.
// Each bottle is a list of colour numbers, from BOTTOM to TOP.
// (The last number is the top layer: the one you can pour.)
// An empty list [] is an empty bottle.
// "const": the starting level never changes, so Restart can always go back to it.
const startingBottles = [
  [4, 3, 1, 2],
  [2, 1, 3, 4],
  [4, 3, 2, 1],
  [1, 2, 4, 3],
  [],
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

// whyNotPour(from, to) checks the rule. It gives back a reason why the pour is NOT allowed,
// or an empty text "" if the pour is allowed.
// (The source is never empty here: tapBottle does not let you pick up an empty bottle.)
function whyNotPour(from, to) {
  const source = bottles[from];
  const target = bottles[to];

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

// pour(from, to) moves layers: all the same top colour, as many as fit.
function pour(from, to) {
  const source = bottles[from];
  const target = bottles[to];
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
        message = winMessage;
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
