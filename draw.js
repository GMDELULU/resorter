// ReSorter: putting the game on the screen.
// This file reads the data from game.js (bottles and capacity)
// and DRAWS every bottle as a small SVG picture made of pencil strokes.
// It only gives the parts class names like "colour-2" or "outline";
// the theme files (theme-*.css) decide the colours.
// Note: index.html must load game.js BEFORE this file, or "bottles" and "capacity" don't exist yet.

// ---------- Settings for the drawing (you may change these) ----------

// How many short pencil strokes go on every layer of colour.
const strokesPerLayer = 25;

// ---------- Symbols for colour-blind players (lesson 16) ----------

// One symbol per colour, as drawing instructions around the middle of a layer (0, 0).
// All angular strokes, no dots or circles (style guide). Colour 1 is the first one, and so on.
const colourSymbols = [
  "M-5 4 L0 -5 L5 4 Z",          // 1 gold: triangle
  "M-5 -5 L5 5 M5 -5 L-5 5",     // 2 crimson: cross
  "M0 -6 L0 6",                  // 3 verdigris: bar
  "M0 -6 L5 0 L0 6 L-5 0 Z",     // 4 bone: diamond
  "M-4.5 -4.5 h9 v9 h-9 Z",      // 5 indigo: square
  "M-5 -4 L0 4 L5 -4",           // 6 rust: chevron
  "M-6 0 h12 M0 -6 v12",         // 7 amethyst: plus
  "M-3 -6 v12 M3 -6 v12",        // 8 deep teal: double bar
  "M-6 -3 L-2 3 L2 -3 L6 3",     // 9 olive: zigzag
  "M-5 -5 L5 -5 L-5 5 L5 5"      // 10 ash: Z
];

// The names of the colours, for screen readers (programs that read the page aloud).
const colourNames = ["gold", "crimson", "verdigris", "bone", "indigo",
                     "rust", "amethyst", "deep teal", "olive", "ash"];

// The looks take turns, one per level (round robin): level 1 the first look, level 2 the second,
// and so on; after the last look, the first one comes again. To add a look, add it to the list.
// "liquid" = bottles, "attic" = shelves with boxes.
const looksInTurn = ["liquid", "attic"];

// lookForLevel(n) gives the look of level n. % ("remainder") makes the count go round:
// with 2 looks, level 1 gives 0, level 2 gives 1, level 3 gives 0 again...
function lookForLevel(n) {
  return looksInTurn[(n - 1) % looksInTurn.length];
}

// The look of the level on the screen now.
let currentLook = lookForLevel(levelNumber);
document.body.classList.toggle("theme-attic", currentLook === "attic");

// Show the symbols? Only when the player switched them on (Symbols in the menu; Ja's choice, lesson 21a).
let alwaysSymbols = loadSetting("alwaysSymbols", false);   // (save.js)
function showSymbols() {
  return alwaysSymbols;
}

// ---------- The bottle shape (do not change, unless you redraw the bottle) ----------

// The corner points of the bottle, as [left-right, top-down] in drawing units:
// a long narrow neck, cut-off (chamfered) shoulders, a tall body and cut-off bottom corners.
const bottleShape = [
  [19, 0], [37, 0], [37, 48], [56, 70], [56, 196],
  [46, 208], [10, 208], [0, 196], [0, 70], [19, 48]
];
// The inner gold line: the same shape, 3 units further in. Together they make a double outline.
const innerLine = [
  [22, 3], [34, 3], [34, 49], [53, 71], [53, 195],
  [45, 205], [11, 205], [3, 195], [3, 71], [22, 49]
];
// Where liquid can be: 6 units in from the outside, so a thin dark gap shows along the glass.
const liquidShape = [
  [25, 6], [31, 6], [31, 50], [50, 72], [50, 194],
  [43, 202], [13, 202], [6, 194], [6, 72], [25, 50]
];
const bottleWidth = 56;     // from left to right
const bottleBottom = 202;   // the lowest point the liquid can reach
const liquidHeight = 116;   // room for liquid; it is shared by all layers

// The drawing area around the bottle: 4 units of extra room on every side for the pencil lines.
const drawMargin = 4;
const drawWidth = bottleWidth + 2 * drawMargin;   // 64
const drawHeight = 208 + 2 * drawMargin;          // 216

// SVG pictures need this "address" so the browser knows they are SVG. It is a name, not a website.
const svgNamespace = "http://www.w3.org/2000/svg";

// ---------- Small helpers ----------

// makeRandom(seed) gives a "dice" function that returns a number between 0 and 1.
// With the same seed it always throws the same numbers, so a bottle looks the same every time
// we draw it again. (Real random numbers would make the strokes jump around after every move.)
function makeRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

// Round a number to 1 decimal, so the drawing instructions stay short.
// (It gives back text, like "12.3", ready to put in a drawing instruction.)
function round(number) {
  return number.toFixed(1);
}

// Make one SVG part, give it its settings, and put it inside "parent".
function addSvgPart(type, settings, parent) {
  const part = document.createElementNS(svgNamespace, type);
  for (const name in settings) {
    part.setAttribute(name, settings[name]);
  }
  if (parent) {
    parent.appendChild(part);
  }
  return part;
}

// Turn a list of points into drawing instructions for a line through them.
// "wobble" moves every point a little bit at random, so the line looks hand-drawn.
// M = move the pencil to a point, L = draw a line to a point, Z = close the shape.
function pencilLine(points, wobble, random, closed) {
  let instructions = "";
  points.forEach(function (point, place) {
    const x = point[0] + (random() - 0.5) * 2 * wobble;
    const y = point[1] + (random() - 0.5) * 2 * wobble;
    instructions += (place === 0 ? "M" : "L") + round(x) + " " + round(y) + " ";
  });
  if (closed) {
    instructions += "Z";
  }
  return instructions;
}

// themeColour(name) reads a colour from the theme files (theme-*.css), for example
// themeColour("--gold"). We need it where JavaScript sets a colour itself.
function themeColour(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();   // (body: so it follows the restored world too)
}

// pointsText(points) turns [[1, 2], [3, 4]] into "1,2 3,4", the way SVG wants corner points.
function pointsText(points) {
  return points.map(function (point) { return round(point[0]) + "," + round(point[1]); }).join(" ");
}

// wavyEdge(y, random) gives the points of a slightly uneven line across the bottle at height y,
// like the top of a liquid that is never ruler-straight.
function wavyEdge(y, random) {
  const points = [];
  for (let x = 0; x <= bottleWidth; x = x + 7) {
    points.push([x, y + (random() - 0.5) * 2.4]);
  }
  return points;
}

// ---------- Drawing one bottle ----------

// makeBottle(bottle, number) draws one bottle from its list of colours (bottom to top).
// "number" is the bottle's place in the list: 0, 1, 2...
function makeBottle(bottle, number) {
  // In the attic look, draw a shelf with boxes instead (attic.js).
  if (currentLook === "attic") {
    return makeShelf(bottle, number);
  }
  const random = makeRandom(1000 + number * 7919);   // every bottle has its own dice

  // The picture. viewBox: the drawing area, with a margin on every side.
  const picture = addSvgPart("svg", {
    class: isClosed(bottle) ? "bottle restored" : "bottle",   // sorted: restored colours (style.css)
    viewBox: (-drawMargin) + " " + (-drawMargin) + " " + drawWidth + " " + drawHeight,
    width: drawWidth,
    height: drawHeight
  });

  // A stencil in the shape of the liquid space: everything inside "glassContent" is cut to it.
  const stencilName = "bottle-stencil-" + number;
  const stencil = addSvgPart("clipPath", { id: stencilName }, picture);
  addSvgPart("polygon", { points: pointsText(liquidShape) }, stencil);

  addLightPool(picture, number, random);   // the gold light on the ground (further down)

  // Everything you see goes in one group, "art", so the ripple effect can move it all together.
  const art = addSvgPart("g", { class: "bottle-art" }, picture);

  // The dark glass.
  addSvgPart("polygon", { class: "glass", points: pointsText(bottleShape) }, art);

  const glassContent = addSvgPart("g", { class: "glass-content", "clip-path": "url(#" + stencilName + ")" }, art);

  // ---- The liquid ----
  // Every border between layers is a slightly wavy line. The bottom border is far below the
  // bottle (the stencil cuts it off). Each border has its own dice, so it keeps its shape.
  const layerHeight = liquidHeight / capacity;
  const borders = [[[0, bottleBottom + 10], [bottleWidth, bottleBottom + 10]]];
  bottle.forEach(function (colour, place) {
    const borderRandom = makeRandom(3000 + number * 7919 + (place + 1) * 104729);
    borders.push(wavyEdge(bottleBottom - (place + 1) * layerHeight, borderRandom));
  });

  let darkStrokes = "";
  let lightStrokes = "";
  let scribbles = "";
  bottle.forEach(function (colour, place) {
    const layerTop = bottleBottom - (place + 1) * layerHeight;
    // Every layer place has its own dice, so after a pour the other layers keep their strokes.
    const layerRandom = makeRandom(1000 + number * 7919 + (place + 1) * 104729);

    // The colour: between the border below and the (wavy) border above.
    const shape = borders[place].slice().reverse().concat(borders[place + 1]);
    addSvgPart("polygon", { class: "colour-" + colour, points: pointsText(shape) }, glassContent);

    // Fine diagonal strokes, like rain. Most darker, some lighter than the colour.
    for (let count = 0; count < strokesPerLayer; count++) {
      const length = 5 + layerRandom() * 7;
      const rise = length * 0.92;
      const x = layerRandom() * bottleWidth;
      const y = layerTop + rise + layerRandom() * (layerHeight - rise);
      const stroke = "M" + round(x) + " " + round(y) +
                     " l" + round(length * 0.38) + " " + round(-rise) + " ";
      if (layerRandom() < 0.6) {
        darkStrokes += stroke;
      } else {
        lightStrokes += stroke;
      }
    }

    // A little scribble: a short zigzag somewhere in the layer.
    let x = 8 + layerRandom() * (bottleWidth - 24);
    const y = layerTop + 6 + layerRandom() * (layerHeight - 10);
    scribbles += "M" + round(x) + " " + round(y);
    for (let zig = 0; zig < 4; zig++) {
      x = x + 2 + layerRandom() * 2;
      scribbles += " L" + round(x) + " " + round(y + (zig % 2 === 0 ? -2 : 2));
    }
    scribbles += " ";
  });

  addSvgPart("path", { class: "hatch-dark", d: darkStrokes }, glassContent);
  addSvgPart("path", { class: "hatch-light", d: lightStrokes }, glassContent);
  addSvgPart("path", { class: "hatch-dark", d: scribbles }, glassContent);

  addSymbols(glassContent, bottle);   // colour-blind symbols, if needed (further down)

  // A thin darker line on every border between two layers, and a light line on top of the liquid.
  borders.slice(1).forEach(function (border, place) {
    const isTop = (place === bottle.length - 1);
    addSvgPart("path", {
      class: isTop ? "surface" : "layer-line",
      d: pencilLine(border, 0, random, false)
    }, glassContent);
  });

  // Shadow: many short dark strokes down the right side of the glass.
  let shadeStrokes = "";
  for (let count = 0; count < 40; count++) {
    const sx = bottleWidth - 12 + random() * 12;
    const sy = random() * 200;
    shadeStrokes += "M" + round(sx) + " " + round(sy) + " v" + round(6 + random() * 14) + " ";
  }
  // (Shadow and shine go in their own group, so they stay visible while a pour animation
  // hides the normal liquid and draws its own.)
  const shading = addSvgPart("g", { "clip-path": "url(#" + stencilName + ")" }, art);
  addSvgPart("path", { class: "shade", d: shadeStrokes }, shading);

  // Shine: a few light strokes down the left side of the glass.
  let shineStrokes = "";
  for (let count = 0; count < 6; count++) {
    const sx = 8 + random() * 4;
    const sy = 80 + random() * 90;
    shineStrokes += "M" + round(sx) + " " + round(sy) + " v" + round(12 + random() * 24) + " ";
  }
  addSvgPart("path", { class: "highlight", d: shineStrokes }, shading);

  // ---- The glass ----
  // The rim of the fill level: a thin gold line just above where a full bottle's liquid ends.
  const rimY = bottleBottom - liquidHeight - 3;
  addSvgPart("path", { class: "rim", d: pencilLine([[4, rimY], [bottleWidth - 4, rimY]], 0.4, random, false) }, art);

  // The double outline: a dark line under everything, then the outer gold line (drawn twice,
  // a little crooked, like a pencil going over it again) and the inner gold line.
  addSvgPart("path", { class: "outline-dark", d: pencilLine(bottleShape, 0, random, true) }, art);
  for (let count = 0; count < 2; count++) {
    addSvgPart("path", { class: "outline", d: pencilLine(bottleShape, 0.7, random, true) }, art);
  }
  addSvgPart("path", { class: "outline-inner", d: pencilLine(innerLine, 0.5, random, true) }, art);

  // A sorted, closed bottle gets its gold stopper: the pentagon from the reference drawing.
  if (isClosed(bottle)) {
    addStopper(art, random);
  }

  return picture;
}

// addLightPool(picture, number, random) draws the warm pool of gold light on the ground under
// a bottle (a "radial gradient", fading outwards), and a few tiny gold ember strokes.
function addLightPool(picture, number, random) {
  const poolName = "light-pool-" + number;
  const pool = addSvgPart("radialGradient", { id: poolName }, picture);
  addSvgPart("stop", { offset: "0", style: "stop-color: var(--gold); stop-opacity: 0.45" }, pool);
  addSvgPart("stop", { offset: "0.5", style: "stop-color: var(--gold); stop-opacity: 0.15" }, pool);
  addSvgPart("stop", { offset: "1", style: "stop-color: var(--gold); stop-opacity: 0" }, pool);
  addSvgPart("ellipse", {
    class: "light-pool", cx: bottleWidth / 2, cy: 208, rx: bottleWidth * 0.95, ry: 11, fill: "url(#" + poolName + ")"
  }, picture);

  // Embers: short strokes, not dots (see the style guide).
  let embers = "";
  for (let count = 0; count < 7; count++) {
    const ex = -8 + random() * (bottleWidth + 16);
    const ey = 186 + random() * 26;
    embers += "M" + round(ex) + " " + round(ey) + " l" + round((random() - 0.5) * 2) + " " + round(-(2 + random() * 3)) + " ";
  }
  addSvgPart("path", { class: "ember", d: embers }, picture);
}

// addSymbols(group, bottle) draws the colour-blind symbols, one in the middle of every layer:
// dark pencil with a light edge under it. Only if they should show (showSymbols).
function addSymbols(group, bottle) {
  if (!showSymbols()) {
    return;
  }
  const layerHeight = liquidHeight / capacity;
  bottle.forEach(function (colour, place) {
    const middleY = bottleBottom - (place + 0.5) * layerHeight;
    const symbol = addSvgPart("g", {
      transform: "translate(" + round(bottleWidth / 2) + " " + round(middleY) + ")"
    }, group);
    addSvgPart("path", { class: "symbol-edge", d: colourSymbols[colour - 1] }, symbol);
    addSvgPart("path", { class: "symbol", d: colourSymbols[colour - 1] }, symbol);
  });
}

// The stopper's corner points: a small pentagon gem sitting on the neck (it pokes out above it).
const stopperShape = [[28, -20], [40, -9], [36, 4], [20, 4], [16, -9]];
const stopperMiddle = [28, -6];

// addStopper(art, random) draws the stopper in pencil style: a dark fill, a sketchy gold outline,
// and faint lines from the middle to every corner, like the cut faces of a gem.
function addStopper(art, random) {
  const stopper = addSvgPart("g", { class: "stopper" }, art);
  addSvgPart("polygon", { class: "stopper-body", points: pointsText(stopperShape) }, stopper);
  stopperShape.forEach(function (corner) {
    addSvgPart("path", { class: "highlight", d: pencilLine([stopperMiddle, corner], 0.4, random, false) }, stopper);
  });
  for (let count = 0; count < 2; count++) {
    addSvgPart("path", { class: "outline", d: pencilLine(stopperShape, 0.5, random, true) }, stopper);
  }
}


// announcePour(info) tells screen-reader users what a pour did, for example
// "Poured gold into bottle 3. It is sorted."
function announcePour(info) {
  let words = (currentLook === "attic" ? "Moved " + colourNames[info.colour - 1] + " boxes onto shelf "
                                        : "Poured " + colourNames[info.colour - 1] + " into bottle ")
              + (info.to + 1) + ".";
  if (info.closes) {
    words = words + " It is sorted.";
  }
  document.getElementById("announce").textContent = words;
}

// bottleDescription(bottle, number) says in words what is in a bottle, for screen readers.
function bottleDescription(bottle, number) {
  const name = (currentLook === "attic" ? "Shelf " : "Bottle ") + (number + 1);
  if (bottle.length === 0) {
    return name + ", empty";
  }
  const colours = bottle.map(function (colour) { return colourNames[colour - 1]; });
  if (isClosed(bottle)) {
    return name + ", sorted and closed: " + colours[0];
  }
  return name + ", from bottom to top: " + colours.join(", ");
}

// ---------- Drawing all bottles ----------

// drawBottles() empties the playing field and draws every bottle again from the data.
// Every bottle sits inside a button, so it can be tapped, clicked, or chosen with the keyboard.
function drawBottles() {
  const field = document.getElementById("bottles");
  field.replaceChildren();

  bottles.forEach(function (bottle, number) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bottle-button";
    button.setAttribute("aria-label", bottleDescription(bottle, number));   // for screen readers
    button.appendChild(makeBottle(bottle, number));
    button.dataset.layers = bottle.join(",");   // remember what is drawn, see updateScreen

    // An event listener: "when this button is clicked, do these steps".
    // "click" works the same for a mouse click, a finger tap and the Enter or Space key.
    button.addEventListener("click", function () {
      tapBottle(number);         // the rule: what a tap means (in game.js)
      if (selectedBottle === number) {
        soundPickUp();           // (sound.js)
      }
      moveKeyboardTo(number, false);   // the keyboard continues from the tapped bottle
      if (lastPour !== null && !wantsLessMotion()) {
        if (currentLook === "attic") {
          planAnimation(lastPour, playBoxMove);   // the boxes fly over (attic.js), now or when it is their turn
        } else {
          planAnimation(lastPour, playPour);      // the pour animation (pour.js), now or when it is its turn
        }
        showSelection();
        if (!won) {
          showMessage();         // (a win message waits until the last pour has finished)
        }
      } else {
        updateScreen();          // the look: show what changed, at once
        if (lastPour !== null) {
          announcePour(lastPour);  // for screen readers
          soundPour(0.3, 0);       // a short pour sound (sound.js)
        }
        if (lastPour !== null && lastPour.closes) {
          soundSorted(currentLook === "attic");
          softGlow(button);      // less motion: a soft warm glow instead of the ripple (sparkle.js)
        }
      }
    });

    field.appendChild(button);
  });

  showSelection();
  moveKeyboardTo(keyboardBottle, false);
}

// ---------- Keyboard ----------
// Tab enters the playing field once (on one bottle) and leaves it with the next Tab.
// Inside the field, the arrow keys move from bottle to bottle, and go round:
// after the last bottle comes the first one again.

// Which bottle the keyboard is on: 0 = bottle 1.
let keyboardBottle = 0;

// moveKeyboardTo(number, alsoFocus) makes "number" the only bottle that Tab can reach.
// tabIndex 0 = Tab can reach it; tabIndex -1 = Tab skips it.
function moveKeyboardTo(number, alsoFocus) {
  const buttons = document.querySelectorAll(".bottle-button");
  keyboardBottle = number;
  buttons.forEach(function (button, place) {
    button.tabIndex = (place === number) ? 0 : -1;
  });
  if (alsoFocus) {
    buttons[number].focus();
  }
}

// One listener for the whole playing field: it reacts to the arrow keys.
document.getElementById("bottles").addEventListener("keydown", function (event) {
  const count = bottles.length;
  let next = null;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    next = (keyboardBottle + 1) % count;           // % count: after the last, back to the first
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    next = (keyboardBottle - 1 + count) % count;   // before the first, round to the last
  } else if (event.key === "Home") {
    next = 0;
  } else if (event.key === "End") {
    next = count - 1;
  }

  if (next !== null) {
    event.preventDefault();   // stop the arrow key from scrolling the page
    moveKeyboardTo(next, true);
  }
});

// updateScreen() shows the newest state after a tap: the pictures, the lift and the message.
// It keeps the buttons and only swaps the pictures inside them,
// so the keyboard frame stays where it is.
// Bottles that are busy in a pour animation are left alone: the animation draws them.
function updateScreen() {
  const buttons = document.querySelectorAll(".bottle-button");
  buttons.forEach(function (button, number) {
    // Only redraw a bottle if its layers changed. (So a stopper that is still dropping,
    // or a bottle that is still pouring, is not wiped away by a redraw for another bottle.)
    const layers = bottles[number].join(",");
    if (!busyBottles.has(number) && button.dataset.layers !== layers) {
      button.replaceChildren(makeBottle(bottles[number], number));
      button.dataset.layers = layers;
      button.setAttribute("aria-label", bottleDescription(bottles[number], number));
    }
  });
  showSelection();

  // A win waits until every pour animation has finished.
  if (won && busyBottles.size > 0) {
    return;
  }
  showMessage();

  if (wrongBottle !== null) {
    soundWrong();   // (sound.js)
    if (!busyBottles.has(wrongBottle)) {
      ripple(buttons[wrongBottle]);   // (a bottle in an animation does not ripple; the message is enough)
    }
    wrongBottle = null;   // done (so a later redraw does not ripple it again)
  }

  // Won: after a few seconds a new level starts by itself.
  // Won level 100: the end. The world stays restored, and no new level comes.
  // Not won (any more, for example after Undo): stop a waiting timer, back to chaos.
  if (won && newLevelTimer === null && !worldRestored) {
    celebrateWin();          // the big sunburst (sparkle.js)
    startTransformation();   // the world turns from chaos to restored (sparkle.js)
    if (levelNumber < maxLevel) {
      newLevelTimer = setTimeout(startNextLevel, newLevelDelay);
    } else {
      worldRestored = true;  // (a closing animation will come here in a later lesson)
    }
  } else if (!won && (newLevelTimer !== null || worldRestored)) {
    clearTimeout(newLevelTimer);
    newLevelTimer = null;
    worldRestored = false;
    endTransformation();     // not won any more: back to chaos
  }
}

// showMessage() puts the newest message on the screen.
function showMessage() {
  const messageLine = document.getElementById("message");
  messageLine.textContent = message;
  messageLine.classList.toggle("win", won);   // a win message looks different (see style.css)
  showStats();
}

// showStats() shows the level indicator at the top, and the move counter (and levels won).
function showStats() {
  const stats = document.getElementById("stats");
  const badge = document.getElementById("level-badge");   // the level indicator under the title
  badge.textContent = "Level " + levelNumber + " of " + maxLevel;
  stats.textContent = "Moves: " + movesMade();
}

// ---------- The next level ----------

// How long to wait after a win before the new level starts (in milliseconds: 5000 = 5 seconds:
// 2 seconds for the win transformation, then 3 seconds to enjoy the restored world).
const newLevelDelay = 5000;

// The timer that will start the new level, or null if none is waiting.
let newLevelTimer = null;

// True after level 100 is won: the end of the game. The world stays restored.
let worldRestored = false;

// startNextLevel() makes a new level and draws it. If the player pressed Undo in the
// meantime, the level is not won any more, and nothing happens.
function startNextLevel() {
  newLevelTimer = null;
  if (!won) {
    return;
  }
  if (busyBottles.size > 0) {
    newLevelTimer = setTimeout(startNextLevel, 300);   // a pour is still playing: try again soon
    return;
  }
  // Was the keyboard on a bottle? Then put it back on bottle 1 of the new level.
  const keyboardWasOnBottle = document.activeElement !== null &&
                              document.activeElement.classList.contains("bottle-button");
  endTransformation();   // the new level starts in the chaos world again
  nextLevel();         // the rule side (game.js): the next level
  setLook(lookForLevel(levelNumber));   // the look of the new level
  keyboardBottle = 0;  // the keyboard starts at bottle 1 again
  drawBottles();       // new buttons: the number of bottles can change
  updateScreen();
  moveKeyboardTo(0, keyboardWasOnBottle);
}

// ---------- The ripple: a wrong move makes the bottle wobble like water ----------

// wantsLessMotion() is true when the player asked their phone or computer for less motion.
// Then we skip animations and show the result at once.
function wantsLessMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// How long the ripple lasts (in milliseconds: 1000 = 1 second) and how strong it is.
const rippleTime = 700;
const rippleStrength = 6;

// The ripple is an SVG "filter": a recipe that bends a picture.
// feTurbulence makes a pattern of soft random waves;
// feDisplacementMap pushes every point of the bottle a little bit along those waves.
// We make the filter once, in a small invisible SVG at the end of the page.
const rippleHolder = addSvgPart("svg", { width: 0, height: 0, "aria-hidden": "true" });
rippleHolder.style.position = "absolute";
const rippleFilter = addSvgPart("filter", {
  id: "ripple", x: "-10%", y: "-5%", width: "120%", height: "110%",
  "color-interpolation-filters": "sRGB"   // makes the waves bend the same in every browser
}, rippleHolder);
const rippleWaves = addSvgPart("feTurbulence", {
  type: "fractalNoise", baseFrequency: "0.02 0.08", numOctaves: 1, seed: 3
}, rippleFilter);
const rippleBend = addSvgPart("feDisplacementMap", {
  in: "SourceGraphic", scale: 0, xChannelSelector: "R", yChannelSelector: "G"
}, rippleFilter);
document.body.appendChild(rippleHolder);

// The bottle that is rippling right now, so a new ripple can stop the old one first.
let ripplingArt = null;
// A number that goes up with every new ripple, so an old ripple knows when to stop.
let rippleCount = 0;

// ripple(button) makes the bottle inside this button wobble for a moment.
function ripple(button) {
  // Players who asked for less motion get no ripple; they still see the message.
  if (wantsLessMotion()) {
    return;
  }

  // Stop an older ripple, if there is one.
  if (ripplingArt !== null) {
    ripplingArt.removeAttribute("filter");
  }

  const art = button.querySelector(".bottle-art");
  art.setAttribute("filter", "url(#ripple)");
  ripplingArt = art;
  rippleCount = rippleCount + 1;
  const myNumber = rippleCount;
  const startTime = performance.now();

  // One step of the animation. The browser calls it about 60 times per second
  // (requestAnimationFrame = "call this just before you draw the next picture").
  function step(now) {
    if (myNumber !== rippleCount) {
      return;   // a newer ripple has taken over
    }
    // 0 at the start, 1 at the end. (Math.max: never below 0, because the browser's clock
    // for the first step can be a tiny bit earlier than our start time.)
    const progress = Math.max(0, (now - startTime) / rippleTime);
    if (progress >= 1) {
      rippleBend.setAttribute("scale", 0);
      art.removeAttribute("filter");
      ripplingArt = null;
      return;
    }
    // The strength grows and then fades (a sine curve: 0, up to 1, back to 0).
    rippleBend.setAttribute("scale", (Math.sin(progress * Math.PI) * rippleStrength).toFixed(2));
    // The waves move a little, so it looks like running water.
    rippleWaves.setAttribute("baseFrequency", (0.02 + 0.01 * Math.sin(progress * 12)).toFixed(3) + " 0.08");
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// showSelection() lifts the picked-up bottle and puts all the others down.
// It only changes a class name; style.css decides how "lifted" looks.
function showSelection() {
  const buttons = document.querySelectorAll(".bottle-button");
  buttons.forEach(function (button, number) {
    const isPickedUp = (number === selectedBottle);
    button.classList.toggle("selected", isPickedUp);
    button.setAttribute("aria-pressed", isPickedUp);   // tells screen readers it is picked up
  });
}

// ---------- The Undo and Restart buttons ----------
// Same pattern as the bottles: first the rule (game.js), then show what changed.

document.getElementById("undo-button").addEventListener("click", function () {
  if (busyBottles.size > 0) {
    return;   // wait until all pour animations are finished
  }
  undo();
  updateScreen();
});

document.getElementById("restart-button").addEventListener("click", function () {
  if (busyBottles.size > 0) {
    return;
  }
  restartLevel();   // (takes back a win first, so it is not counted twice)
  updateScreen();
});

// ---------- The "always show symbols" switch ----------

const symbolsSwitch = document.getElementById("symbols-switch");
showSwitch();   // show the saved choice

symbolsSwitch.addEventListener("click", function () {
  alwaysSymbols = !alwaysSymbols;                 // ! = "not": on becomes off, off becomes on
  saveSetting("alwaysSymbols", alwaysSymbols);   // remember it (save.js)
  showSwitch();
  redrawAllBottles();
});

// showSwitch() makes the switch show its state: in words (On / Off), by the knob's place,
// and for screen readers (aria-checked).
function showSwitch() {
  symbolsSwitch.setAttribute("aria-checked", alwaysSymbols ? "true" : "false");
  document.getElementById("symbols-state").textContent = alwaysSymbols ? "On" : "Off";
}

// ---------- The Sound On/Off switch ----------

const soundSwitch = document.getElementById("sound-switch");
showSoundSwitch();

soundSwitch.addEventListener("click", function () {
  soundOn = !soundOn;                   // (sound.js)
  saveSetting("soundOn", soundOn);      // remember it (save.js)
  showSoundSwitch();
  if (!soundOn) {
    stopAllSounds();                    // silence at once, also a pour that is still playing
  }
});

// showSoundSwitch() shows the state: in words, by the knob, and for screen readers.
function showSoundSwitch() {
  soundSwitch.setAttribute("aria-checked", soundOn ? "true" : "false");
  document.getElementById("sound-state").textContent = soundOn ? "On" : "Off";
}

// ---------- The music volume slider (lesson 20b) ----------

const musicSlider = document.getElementById("music-level");
showMusicLevel();

// "input" happens many times while you slide, so the volume follows your finger.
musicSlider.addEventListener("input", function () {
  // The slider gives text, like "35": turn it into a whole number from 0 to 100.
  const level = Math.max(0, Math.min(100, Math.round(Number(musicSlider.value)) || 0));
  setMusicLevel(level);                     // (sound.js)
  saveNumberSetting("musicLevel", level);   // remember it (save.js)
  showMusicLevel();
});

// showMusicLevel() puts the slider in the right place and shows the level in words,
// also for screen readers ("Off" at 0).
function showMusicLevel() {
  musicSlider.value = musicLevel;
  const words = (musicLevel === 0) ? "Off" : musicLevel + "%";
  document.getElementById("music-level-text").textContent = words;
  musicSlider.setAttribute("aria-valuetext", words);
}

// ---------- The interface sound ----------
// Every tap on a button outside the playing field (Undo, Restart, the menu button, the rows in
// the menu, Credits) gives the interface sound. One listener for all of them: "closest" finds
// out if the tap was on (or inside) one of them. It runs after the button's own work, so switching
// the sound ON already plays it, and switching it off is silent.
document.addEventListener("click", function (event) {
  if (event.target.closest(".control-button, .menu-button, .toggle, .menu-item, .credits summary, " +
                          ".panel-close, .level-tile:not(.locked), .level-badge")) {
    soundInterface();   // (sound.js)
  }
});

// redrawAllBottles() draws every (not busy) bottle again, even if its layers did not change.
function redrawAllBottles() {
  document.querySelectorAll(".bottle-button").forEach(function (button) {
    delete button.dataset.layers;   // forget what was drawn, so updateScreen draws it again
  });
  updateScreen();
}

// ---------- The look ----------

// setLook(look) switches the look. (The bottles must be drawn again afterwards.)
function setLook(look) {
  currentLook = look;
  document.body.classList.toggle("theme-attic", look === "attic");
}

// ---------- The menu (lesson 20a) ----------

const menuButton = document.getElementById("menu-button");
const menu = document.getElementById("menu");

// openMenu() shows the menu and puts the keyboard on its first row.
function openMenu() {
  menu.hidden = false;
  menuButton.setAttribute("aria-expanded", "true");   // for screen readers: "menu, opened"
  menu.querySelector("button").focus();
}

// closeMenu(backToButton) hides the menu. With "true", the keyboard goes back to the menu button.
function closeMenu(backToButton) {
  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  if (backToButton) {
    menuButton.focus();
  }
}

// The menu button opens the menu, or closes it when it is open.
menuButton.addEventListener("click", function () {
  if (menu.hidden) {
    openMenu();
  } else {
    closeMenu(false);
  }
});

// The Escape key closes the menu.
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !menu.hidden) {
    closeMenu(true);
  }
});

// When the keyboard leaves the menu (Tab past its first or last row), the menu closes too.
menu.addEventListener("focusout", function (event) {
  const next = event.relatedTarget;   // where the keyboard goes now
  if (next !== null && !menu.contains(next) && next !== menuButton) {
    closeMenu(false);
  }
});

// A tap outside the menu closes it, and does nothing else (so you never pick up a bottle by accident).
// "true" at the end: this listener hears the tap first, before the bottle does.
document.addEventListener("click", function (event) {
  if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) {
    event.stopPropagation();
    event.preventDefault();
    closeMenu(false);
  }
}, true);

// ---------- The level grid (lesson 21b) ----------

const levelsPanel = document.getElementById("levels-panel");
const levelGrid = document.getElementById("level-grid");

// A small lock, drawn with straight lines (angular, like the rest of the game).
const lockPicture = '<svg viewBox="0 0 16 16" aria-hidden="true">' +
  '<path d="M3 7 H13 V15 H3 Z M5 7 V4 L6.5 2 H9.5 L11 4 V7"/></svg>';

// openLevels() shows the panel with a tile for every level, 1 to 100.
function openLevels() {
  closeMenu(false);
  // Everything behind the panel becomes "inert": it cannot be tapped or reached with Tab,
  // so the keyboard stays in the grid.
  for (const part of document.body.children) {
    if (part !== levelsPanel && part.tagName !== "SCRIPT") {
      part.inert = true;
    }
  }
  levelsPanel.hidden = false;
  showLevelTiles();
}

// showLevelTiles() makes the tiles (a loop): one tile per level.
function showLevelTiles() {
  levelGrid.replaceChildren();
  for (let n = 1; n <= maxLevel; n++) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "level-tile";
    if (n > highestLevel) {
      tile.classList.add("locked");
      tile.innerHTML = lockPicture;   // (our own fixed drawing, not data from outside)
      tile.setAttribute("aria-label", "Level " + n + ", locked");
      tile.setAttribute("aria-disabled", "true");
      tile.tabIndex = -1;             // Tab skips the locked tiles
    } else {
      tile.textContent = n;
      tile.setAttribute("aria-label", "Level " + n);
      tile.addEventListener("click", function () { chooseLevel(n); });
    }
    if (n === levelNumber) {
      tile.classList.add("current");
      tile.setAttribute("aria-current", "true");   // screen readers: "current"
    }
    levelGrid.appendChild(tile);
  }
  // Put the keyboard on the current level, and scroll it into view.
  const current = levelGrid.children[levelNumber - 1];
  current.focus();
  current.scrollIntoView({ block: "center" });
}

// closeLevels() hides the panel. Everything behind it works again, and the keyboard goes
// back to the level indicator.
function closeLevels() {
  levelsPanel.hidden = true;
  levelGrid.replaceChildren();   // (the tiles are made again next time)
  for (const part of document.body.children) {
    part.inert = false;
  }
  document.getElementById("level-badge").focus();
}

// chooseLevel(n) starts level n, after a check.
function chooseLevel(n) {
  if (n < 1 || n > highestLevel) {
    return;   // a locked level: never (also not by a trick)
  }
  if (busyBottles.size > 0) {
    // A move is still playing: try again in a moment (like startNextLevel does).
    setTimeout(function () { chooseLevel(n); }, 300);
    return;
  }
  // Moves in this level would be lost: ask first. (Not needed after a win.)
  if (moveHistory.length > 0 && !won &&
      !confirm("Start level " + n + "? The moves you made in this level will be lost.")) {
    return;
  }
  if (newLevelTimer !== null) {
    clearTimeout(newLevelTimer);   // a win was waiting to start the next level: not any more
    newLevelTimer = null;
  }
  worldRestored = false;           // (after the end: playing an old level again)
  endTransformation();             // back to the chaos world (sparkle.js)
  startPathLevel(n);               // the rule side (game.js)
  setLook(lookForLevel(n));        // the look of that level
  keyboardBottle = 0;
  drawBottles();
  updateScreen();
  closeLevels();
}

// The level indicator under the title opens the grid.
document.getElementById("level-badge").addEventListener("click", openLevels);
document.getElementById("levels-close").addEventListener("click", closeLevels);

// The Escape key closes the level grid.
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !levelsPanel.hidden) {
    closeLevels();
  }
});

// ---------- Reset progress ----------

document.getElementById("reset-progress").addEventListener("click", function () {
  if (busyBottles.size > 0) {
    message = "Wait until the move is finished.";
    showMessage();
    return;
  }
  if (!confirm("Forget everything this game saved in this browser, and start again at level 1?")) {
    return;
  }
  resetProgress();                    // save.js
  closeMenu(true);                    // (the keyboard goes back to the menu button)
  alwaysSymbols = false;              // the settings are forgotten too
  showSwitch();
  soundOn = true;
  showSoundSwitch();
  setMusicLevel(standardMusicLevel);   // the music volume back to normal
  showMusicLevel();
  setLook(lookForLevel(levelNumber));   // level 1 again, so its look
  keyboardBottle = 0;
  drawBottles();
  updateScreen();
  message = "Your saved progress is gone. A fresh start!";
  showMessage();
});

// Call the function once, when the page opens.
drawBottles();
showStats();
