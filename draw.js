// ReSorter: putting the game on the screen.
// This file reads the data from game.js (bottles and capacity)
// and builds the boxes (HTML elements) for it.
// It only gives the boxes class names like "colour-2"; style.css decides how they look.
// Note: index.html must load game.js BEFORE this file, or "bottles" and "capacity" don't exist yet.

// A function: a set of steps with a name. It does nothing until we call it.
// drawBottles() empties the playing field and builds every bottle again from the data.
function drawBottles() {
  // Find the playing field in the page, by its id.
  const field = document.getElementById("bottles");

  // Remove everything that is in it now, so we start clean.
  field.replaceChildren();

  // Tell the look (style.css) how many layers fit in a bottle.
  field.style.setProperty("--capacity", capacity);

  // Do the next steps once for every bottle in the data.
  bottles.forEach(function (bottle) {
    // The bottle and its dark inside, like the boxes we used to write in HTML.
    const bottleBox = document.createElement("div");
    bottleBox.className = "bottle";

    const inside = document.createElement("div");
    inside.className = "bottle-inside";

    // The data goes from bottom to top, but the screen builds from top to bottom.
    // So we make a turned-around copy (slice makes the copy, reverse turns it around).
    const topToBottom = bottle.slice().reverse();

    // One layer box for every colour number.
    topToBottom.forEach(function (colour) {
      const layer = document.createElement("div");
      layer.className = "layer colour-" + colour;
      inside.appendChild(layer);
    });

    // Put the inside into the bottle, and the bottle onto the playing field.
    bottleBox.appendChild(inside);
    field.appendChild(bottleBox);
  });
}

// Call the function once, when the page opens.
drawBottles();
