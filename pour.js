// ReSorter: the pour animation.
// The rule (game.js) has already poured; this file only SHOWS it, step by step:
//   1. the picked-up bottle rises until its mouth is level with the target's mouth;
//   2. it moves across, in front of the other bottles;
//   3. it tips over, so its mouth is just above the target's mouth, and the liquid slides
//      (level, like real water) towards the mouth;
//   4. a stream of colour flows down: the lifted bottle drains and the target fills, bit by bit;
//   5. it tips back, rises, and goes back to its own place.
// Note: index.html must load this file AFTER game.js and draw.js.

// ---------- Settings (you may change these) ----------

// How long the pour takes: 1 = normal, 2 = twice as slow, 0.5 = twice as fast.
const pourSpeed = 1;

// How long each step takes, in milliseconds (1000 = 1 second), at pourSpeed 1.
const pourSteps = {
  rise: 150,
  moveOver: 220,
  tipOver: 300,
  pour: 900,
  tipBack: 250,
  moveBack: 220,
  goDown: 150
};

// ---------- State ----------

// true while a pour animation is playing. Taps wait until it is false again.
let pouring = false;

// A see-through layer over the whole page, where the stream of colour is drawn.
// pointer-events: none (in style.css) means taps go straight through it.
const pourLayer = addSvgPart("svg", { class: "pour-layer", "aria-hidden": "true" });
document.body.appendChild(pourLayer);

// ---------- The animation ----------

// playPour(info) shows one pour. "info" is lastPour from game.js:
// { from, to, colour, layersBefore }.
// "async" means this function can pause (await) in the middle without freezing the page.
async function playPour(info) {
  pouring = true;
  try {
    await showPour(info);
  } catch (problem) {
    // If anything goes wrong, show the new state at once instead of getting stuck.
    console.error(problem);
    updateScreen();
  } finally {
    // "finally" always runs, also after a problem: tidy up, so the game is never left locked.
    document.querySelectorAll(".bottle-button").forEach(function (button) {
      button.style.position = "";
      button.style.zIndex = "";
      button.style.transition = "";
    });
    pourLayer.replaceChildren();   // remove any stream that is left
    pouring = false;
  }
}

// showPour(info) does the real work of the animation.
async function showPour(info) {
  const buttons = document.querySelectorAll(".bottle-button");
  const source = buttons[info.from];
  const target = buttons[info.to];

  // 1. Where is everything? Measure the bottles on the screen, in pixels.
  //    The source is lifted (picked up) right now; remember how high, then measure it unlifted.
  const liftNow = currentLift(source);
  source.style.transition = "none";   // no gliding while we take over the movement
  source.classList.remove("selected");
  const s = source.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const size = s.height / 208;        // 1 on a laptop; smaller on a phone

  // The point to rotate around is the middle of the bottle.
  // The mouth is 100 drawing-units above the middle.
  const sourceMiddleX = s.left + s.width / 2;
  const sourceMiddleY = s.top + s.height / 2;
  const mouthDistance = 100 * size;

  // Tip towards the side with the most room on the screen.
  const targetMiddleX = t.left + t.width / 2;
  const fromLeft = targetMiddleX >= window.innerWidth - targetMiddleX;
  const tipAngle = fromLeft ? 100 : -100;          // degrees; + = clockwise
  const radians = tipAngle * Math.PI / 180;

  // Where the mouth must end up: just above the target's mouth,
  // high enough that the tipped bottle stays above the tops of the other bottles.
  const mouthX = targetMiddleX;
  const mouthY = t.top - 24 * size;

  // Where the middle of the bottle must be, so that after tipping the mouth is there.
  const middleX = mouthX - mouthDistance * Math.sin(radians);
  const middleY = mouthY + mouthDistance * Math.cos(radians);
  const moveX = middleX - sourceMiddleX;
  const moveY = middleY - sourceMiddleY;

  // How high to rise first: until the mouth of this bottle is level with the target's mouth.
  // (It stays lifted at least as high as it was.) Then it moves across, in front of the others.
  const riseY = Math.min(liftNow, t.top - s.top);

  // 2. The movement, as a list of poses (keyframes), from start to end.
  const step = {};
  for (const name in pourSteps) {
    step[name] = pourSteps[name] * pourSpeed;
  }
  const total = step.rise + step.moveOver + step.tipOver + step.pour +
                step.tipBack + step.moveBack + step.goDown;

  // "offset" says when each pose is reached: 0 = start, 1 = end.
  let time = 0;
  function at(ms) {
    time = time + ms;
    return time / total;
  }
  const poses = [
    { transform: "translate(0px, " + liftNow + "px) rotate(0deg)", offset: 0 },
    // rise straight up
    { transform: "translate(0px, " + riseY + "px) rotate(0deg)", offset: at(step.rise) },
    // move across, mouths level
    { transform: "translate(" + moveX + "px, " + riseY + "px) rotate(0deg)", offset: at(step.moveOver) },
    // tip over and come down to the target's mouth
    { transform: "translate(" + moveX + "px, " + moveY + "px) rotate(" + tipAngle + "deg)", offset: at(step.tipOver) },
    // stay there while pouring
    { transform: "translate(" + moveX + "px, " + moveY + "px) rotate(" + tipAngle + "deg)", offset: at(step.pour) },
    // tip back, mouths level again
    { transform: "translate(" + moveX + "px, " + riseY + "px) rotate(0deg)", offset: at(step.tipBack) },
    // move back across
    { transform: "translate(0px, " + riseY + "px) rotate(0deg)", offset: at(step.moveBack) },
    // and down into its own place
    { transform: "translate(0px, 0px) rotate(0deg)", offset: 1 }
  ];

  // The moving bottle goes in front of the others (z-index), like lifting it towards you.
  source.style.position = "relative";
  source.style.zIndex = "10";
  // Each step speeds up and slows down gently (ease-in-out), but the clock itself runs evenly
  // ("linear"), so we can tell exactly which step the bottle is in from movement.currentTime.
  poses.forEach(function (pose) {
    pose.easing = "ease-in-out";
  });
  const movement = source.animate(poses, { duration: total, easing: "linear" });

  // Wait until the browser has really started the movement, so everything below
  // keeps in step with the bottle, even on a slow phone.
  await movement.ready;

  // 3. The liquid. While the bottle moves, we draw the liquid ourselves, many times per second:
  //    it stays level like real water, slides towards the mouth when the bottle tips,
  //    drains out of the lifted bottle bit by bit, and fills the other bottle bit by bit.
  const moved = bottles[info.to].length - info.layersBefore;   // how many layers are poured
  const sourceColours = bottles[info.from].concat(new Array(moved).fill(info.colour));
  const targetColours = bottles[info.to].slice();             // its layers after the pour
  const sourceLiquid = startLiveLiquid(source);
  const targetLiquid = startLiveLiquid(target);

  // The stream: a thin bar of colour from the mouth down to the liquid in the target.
  const stream = addSvgPart("rect", {
    class: "stream colour-" + info.colour,
    x: mouthX - 2.5 * size,
    width: 5 * size,
    y: mouthY,
    height: 0
  }, pourLayer);

  const pourStart = step.rise + step.moveOver + step.tipOver;
  const layerHeight = liquidHeight / capacity;

  // One drawing step. The browser calls it before every new picture (about 60 times per second).
  await new Promise(function (finished) {
    function frame() {
      try {
        drawFrame();
      } catch (problem) {
        console.error(problem);
        finished();   // stop drawing; playPour then tidies up
        return;
      }
      if (movement.playState === "running") {
        requestAnimationFrame(frame);
      } else {
        finished();   // the bottle is back home
      }
    }
    function drawFrame() {
      const now = movement.currentTime || 0;
      // How far the pour is: 0 = nothing poured yet, 1 = everything poured.
      const progress = Math.min(1, Math.max(0, (now - pourStart) / step.pour));
      const poured = moved * progress;   // how many layers have flowed out so far (can be 1.5)

      // The lifted bottle: tipped at its current angle, with less and less liquid.
      drawLiveLiquid(sourceLiquid, sourceColours, sourceColours.length - poured, currentAngle(source));
      // The other bottle: upright, with more and more liquid.
      drawLiveLiquid(targetLiquid, targetColours, info.layersBefore + poured, 0);

      // The stream: it grows down from the mouth at the start, and its tail falls in at the end.
      if (progress > 0 && progress < 1) {
        const surfaceY = t.top + (bottleBottom - (info.layersBefore + poured) * layerHeight + 4) * size;
        const fullLength = Math.max(0, surfaceY - mouthY);
        const head = fullLength * Math.min(1, progress / 0.15);
        const tail = fullLength * Math.max(0, (progress - 0.9) / 0.1);
        stream.setAttribute("y", mouthY + tail);
        stream.setAttribute("height", Math.max(0, head - tail));
      } else {
        stream.setAttribute("height", 0);
      }
    }
    frame();
  });

  // 4. Tidy up: draw the bottles normally again, with their new layers.
  stream.remove();
  source.style.position = "";
  source.style.zIndex = "";
  source.style.transition = "";
  updateScreen();
}

// ---------- Live liquid: level like real water ----------
// How it works: the bottle shape is a list of corner points (bottleShape in draw.js).
// For an amount of liquid we know how much AREA it takes up when the bottle stands upright.
// When the bottle is tipped, we search the water line (a straight, level line) that cuts off
// exactly that much area at the bottom side. That is where the liquid surface must be.

// startLiveLiquid(button) hides the normal liquid drawing of a bottle,
// and gives back an empty group where we can draw the live liquid instead.
function startLiveLiquid(button) {
  const normalLiquid = button.querySelector(".glass-content");
  normalLiquid.style.display = "none";
  const live = document.createElementNS(svgNamespace, "g");
  normalLiquid.after(live);   // in the same place, so the outlines stay on top
  return live;
}

// currentAngle(button) reads how far a button is turned right now, in radians.
function currentAngle(button) {
  const transform = getComputedStyle(button).transform;
  if (transform === "none") {
    return 0;
  }
  const matrix = new DOMMatrix(transform);
  return Math.atan2(matrix.b, matrix.a);
}

// depthOf(point, down): how far "down" a point is, when "down" is the direction of gravity.
function depthOf(point, down) {
  return point[0] * down[0] + point[1] * down[1];
}

// cutShape(points, down, level, keepDeep) cuts the shape along a level line.
// keepDeep = true keeps the part below the line; false keeps the part above it.
function cutShape(points, down, level, keepDeep) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    let da = depthOf(a, down) - level;
    let db = depthOf(b, down) - level;
    if (!keepDeep) {
      da = -da;
      db = -db;
    }
    if (da >= 0) {
      result.push(a);
    }
    if ((da >= 0) !== (db >= 0)) {
      // the edge crosses the line: add the crossing point
      const share = da / (da - db);
      result.push([a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share]);
    }
  }
  return result;
}

// shapeArea(points) measures the area of a shape (the "shoelace" method).
function shapeArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum = sum + a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

// areaOfLayers(amount): the area that "amount" layers take up in an upright bottle.
function areaOfLayers(amount) {
  const layerHeight = liquidHeight / capacity;
  return shapeArea(cutShape(bottleShape, [0, 1], bottleBottom - amount * layerHeight, true));
}

// waterLine(wantedArea, down) searches the level line that has exactly wantedArea below it.
// It halves the search range again and again (like guessing a number: "higher? lower?").
function waterLine(wantedArea, down) {
  const depths = bottleShape.map(function (point) { return depthOf(point, down); });
  let high = Math.min(...depths);   // the highest point of the bottle
  let low = Math.max(...depths);    // the lowest point of the bottle
  for (let i = 0; i < 30; i++) {
    const middle = (high + low) / 2;
    if (shapeArea(cutShape(bottleShape, down, middle, true)) > wantedArea) {
      high = middle;   // too much liquid below this line: the line must go lower
    } else {
      low = middle;
    }
  }
  return (high + low) / 2;
}

// drawLiveLiquid(group, colours, amount, angle) draws "amount" layers (it may be 2.5)
// of the colours (bottom to top), level with the ground, in a bottle turned by "angle".
function drawLiveLiquid(group, colours, amount, angle) {
  group.replaceChildren();
  const down = [Math.sin(angle), Math.cos(angle)];   // the direction of gravity, inside the bottle
  let lowerLine = null;
  for (let i = 0; i < colours.length; i++) {
    const thisLayer = Math.min(1, amount - i);   // 1 = a full layer; 0.5 = half a layer
    if (thisLayer <= 0) {
      break;
    }
    const upperLine = waterLine(areaOfLayers(i + thisLayer), down);
    let shape = cutShape(bottleShape, down, upperLine, true);
    if (lowerLine !== null) {
      shape = cutShape(shape, down, lowerLine, false);
    }
    addSvgPart("polygon", {
      class: "colour-" + colours[i],
      points: shape.map(function (point) { return round(point[0]) + "," + round(point[1]); }).join(" ")
    }, group);
    lowerLine = upperLine;
  }
}

// currentLift(button) reads how far up a button is moved right now (0 if not lifted).
function currentLift(button) {
  const transform = getComputedStyle(button).transform;
  if (transform === "none") {
    return 0;
  }
  return new DOMMatrix(transform).m42;   // m42 = the up/down part of the movement
}
