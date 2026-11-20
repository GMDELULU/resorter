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

// The rule for a tap: the player tapped bottle "number".
function tapBottle(number) {
  if (selectedBottle === number) {
    // Tapping the picked-up bottle again puts it back down.
    selectedBottle = null;
  } else {
    // Otherwise, pick up this bottle. (In lesson 7 this becomes: pour into it.)
    selectedBottle = number;
  }
}
