// ReSorter: putting the game on the screen.
// This file reads the data from game.js (bottles and capacity)
// and DRAWS every bottle as a small SVG picture made of pencil strokes.
// It only gives the parts class names like "colour-2" or "outline";
// style.css decides the colours.
// Note: index.html must load game.js BEFORE this file, or "bottles" and "capacity" don't exist yet.

// ---------- Settings for the drawing (you may change these) ----------

// How many short pencil strokes go on every layer of colour.
const strokesPerLayer = 25;

// ---------- The bottle shape (do not change, unless you redraw the bottle) ----------

// The corner points of the bottle, as [left-right, top-down] in pixels:
// neck top, neck bottom, shoulder, body, cut-off bottom corners.
const bottleShape = [
  [20, 0], [44, 0], [44, 40], [64, 64], [64, 188],
  [52, 200], [12, 200], [0, 188], [0, 64], [20, 40]
];
const bottleBottom = 200;   // the lowest point of the bottle
const liquidHeight = 120;   // room for liquid; it is shared by all layers

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

// ---------- Drawing one bottle ----------

// makeBottle(bottle, number) draws one bottle from its list of colours (bottom to top).
// "number" is the bottle's place in the list: 0, 1, 2...
function makeBottle(bottle, number) {
  const random = makeRandom(1000 + number * 7919);   // every bottle has its own dice
  const shapePoints = bottleShape.map(function (point) { return point.join(","); }).join(" ");

  // The picture. viewBox: the drawing area, with 4 pixels of extra room on every side.
  const picture = addSvgPart("svg", {
    class: "bottle",
    viewBox: "-4 -4 72 208",
    width: 72,
    height: 208
  });

  // A stencil in the shape of the bottle: everything inside "glassContent" is cut to this shape.
  const stencilName = "bottle-stencil-" + number;
  const stencil = addSvgPart("clipPath", { id: stencilName }, picture);
  addSvgPart("polygon", { points: shapePoints }, stencil);

  // Everything you see goes in one group, "art", so the ripple effect can move it all together.
  const art = addSvgPart("g", { class: "bottle-art" }, picture);

  // The dark glass.
  addSvgPart("polygon", { class: "glass", points: shapePoints }, art);

  const glassContent = addSvgPart("g", { "clip-path": "url(#" + stencilName + ")" }, art);

  // The layers, from the bottom up. Each one gets a block of colour and pencil strokes.
  const layerHeight = liquidHeight / capacity;
  let darkStrokes = "";
  let lightStrokes = "";

  bottle.forEach(function (colour, place) {
    const layerTop = bottleBottom - (place + 1) * layerHeight;
    // Every layer place has its own dice, so after a pour the other layers keep their strokes.
    const layerRandom = makeRandom(1000 + number * 7919 + (place + 1) * 104729);

    addSvgPart("rect", {
      class: "colour-" + colour,
      x: 0,
      y: round(layerTop),
      width: 64,
      height: round(layerHeight + 0.5)   // + 0.5 so no thin gap shows between layers
    }, glassContent);

    // Short diagonal strokes, at random places in this layer. Most dark, some light.
    // Each stroke goes up and to the right, so it starts low enough to stay inside the liquid.
    for (let count = 0; count < strokesPerLayer; count++) {
      const length = 4 + layerRandom() * 6;
      const rise = length * 0.85;
      const x = layerRandom() * 64;
      const y = layerTop + rise + layerRandom() * (layerHeight - rise);
      const stroke = "M" + round(x) + " " + round(y) +
                     " l" + round(length * 0.5) + " " + round(-rise) + " ";
      if (layerRandom() < 0.6) {
        darkStrokes += stroke;
      } else {
        lightStrokes += stroke;
      }
    }
  });

  addSvgPart("path", { class: "hatch-dark", d: darkStrokes }, glassContent);
  addSvgPart("path", { class: "hatch-light", d: lightStrokes }, glassContent);

  // The top of the liquid: a light, wobbly line (only if the bottle is not empty).
  if (bottle.length > 0) {
    const surface = bottleBottom - bottle.length * layerHeight;
    addSvgPart("path", {
      class: "surface",
      d: pencilLine([[0, surface], [22, surface], [44, surface], [64, surface]], 0.6,
                    makeRandom(5000 + number * 7919), false)
    }, glassContent);
  }

  // Shadow: many short dark strokes down the right side of the glass.
  let shadeStrokes = "";
  for (let count = 0; count < 40; count++) {
    const x = 50 + random() * 14;
    const y = random() * 200;
    shadeStrokes += "M" + round(x) + " " + round(y) + " v" + round(6 + random() * 14) + " ";
  }
  addSvgPart("path", { class: "shade", d: shadeStrokes }, glassContent);

  // Shine: a few light strokes down the left side of the glass.
  let shineStrokes = "";
  for (let count = 0; count < 6; count++) {
    const x = 6 + random() * 4;
    const y = 72 + random() * 90;
    shineStrokes += "M" + round(x) + " " + round(y) + " v" + round(12 + random() * 24) + " ";
  }
  addSvgPart("path", { class: "highlight", d: shineStrokes }, glassContent);

  // The outline: one thick dark line, then three thin, slightly crooked gold lines.
  addSvgPart("path", { class: "outline-dark", d: pencilLine(bottleShape, 0, random, true) }, art);
  for (let count = 0; count < 3; count++) {
    addSvgPart("path", { class: "outline", d: pencilLine(bottleShape, 0.9, random, true) }, art);
  }

  // Two thin gold lines under the shoulder, like in the reference drawing.
  addSvgPart("path", { class: "outline", d: pencilLine([[2, 70], [62, 70]], 0.5, random, false) }, art);
  addSvgPart("path", { class: "highlight", d: pencilLine([[2, 74], [62, 74]], 0.5, random, false) }, art);

  return picture;
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
    button.setAttribute("aria-label", "Bottle " + (number + 1));   // a name for screen readers
    button.appendChild(makeBottle(bottle, number));

    // An event listener: "when this button is clicked, do these steps".
    // "click" works the same for a mouse click, a finger tap and the Enter or Space key.
    button.addEventListener("click", function () {
      tapBottle(number);         // the rule: what a tap means (in game.js)
      updateScreen();            // the look: show what changed
      moveKeyboardTo(number, false);   // the keyboard continues from the tapped bottle
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
function updateScreen() {
  const buttons = document.querySelectorAll(".bottle-button");
  buttons.forEach(function (button, number) {
    button.replaceChildren(makeBottle(bottles[number], number));
  });
  showSelection();
  const messageLine = document.getElementById("message");
  messageLine.textContent = message;
  messageLine.classList.toggle("win", won);   // a win message looks different (see style.css)

  if (wrongBottle !== null) {
    ripple(buttons[wrongBottle]);
  }
}

// ---------- The ripple: a wrong move makes the bottle wobble like water ----------

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
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
  undo();
  updateScreen();
});

document.getElementById("restart-button").addEventListener("click", function () {
  restart();
  updateScreen();
});

// Call the function once, when the page opens.
drawBottles();
