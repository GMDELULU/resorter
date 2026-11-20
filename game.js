// ReSorter: the game in data.
// This file only knows numbers: "colour 1", "colour 2"...
// How a colour looks is decided in style.css (the look), not here.

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

// Show the data in the browser's console (press F12 to see it).
console.log("Bottles in this level:", bottles.length);
console.log("Layers per bottle:", capacity);
console.log("The bottles, bottom to top:", bottles);
// Counting starts at 0: bottles[0] is bottle 1, and [3] is its 4th layer (the top).
// (A practice line: we replace it in lesson 5.)
console.log("The top layer of bottle 1 is colour", bottles[0][3]);
