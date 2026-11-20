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
let bottles = [
  [4, 3, 1, 2],
  [2, 1, 3, 4],
  [4, 3, 2, 1],
  [1, 2, 4, 3],
  [],
  [],
  []
];

// Which bottle is picked up: its number (0 = bottle 1, 1 = bottle 2...),
// or null when no bottle is picked up. "null" means "nothing".
let selectedBottle = null;

// A short message for the player, for example why a pour is not allowed.
// An empty text "" means: no message.
let message = "";

// The bottle where the last move went wrong (it will shake), or null if nothing went wrong.
let wrongBottle = null;

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

  if (target.length === capacity) {
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
  message = "";
  wrongBottle = null;

  if (selectedBottle === null) {
    // Nothing picked up yet: pick up this bottle, unless it is empty.
    if (bottles[number].length === 0) {
      message = "That bottle is empty. Pick a bottle with colour in it.";
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
      pour(selectedBottle, number);
    } else {
      message = reason;
      wrongBottle = number;   // the bottle you tried to pour into shakes
    }
    selectedBottle = null;   // after a pour, or a wrong move, the bottle goes back down
  }
}
