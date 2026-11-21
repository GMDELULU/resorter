// ReSorter: the pour animation.
// The rule (game.js) has already poured; this file only SHOWS it:
//   1. the picked-up bottle swings over to the target in one smooth arc, and tips on the way;
//      inside it, the liquid stays level (like real water) and slides towards the mouth;
//   2. it pours: a stream flows down, the lifted bottle drains and the target fills, bit by bit;
//   3. it swings back to its own place in an arc, tipping upright again.
// Every move speeds up and slows down gently (slow-fast-slow), like Ja's naturalMovement.html.
// Several pours can play at the same time. Pours that share a bottle take turns (see planAnimation).
// Note: index.html must load this file AFTER game.js and draw.js.

// ---------- Settings (you may change these) ----------

// How long the pour takes: 1 = normal, 2 = twice as slow, 0.5 = twice as fast.
const pourSpeed = 1;

// The waves on the liquid while pouring: how high (in drawing units) and how fast they roll.
const maxWaveHeight = 3;
const waveSpeed = 6;

// How long each part takes, in milliseconds (1000 = 1 second), at pourSpeed 1.
const pourSteps = {
  swingOver: 450,   // the arc to the target, tipping on the way
  pour: 650,        // pouring
  swingBack: 450    // the arc back home
};

// How high the arc goes above a straight line, in pixels on a laptop.
const arcHeight = 50;

// ---------- State ----------

// The bottles that are busy in an animation right now, or waiting for one (by number).
// The screen leaves them alone: the animation draws them.
// The player can still tap them: the move counts at once, and its animation waits its turn.
const busyBottles = new Set();

// The queue: like cars at a traffic light, the animations for one bottle play one after another.
// animationsLeft: for each busy bottle, how many animations it still has to play.
// lastAnimation: for each busy bottle, the last animation planned for it (a promise,
// a "ticket" that is kept when that animation has finished).
const animationsLeft = new Map();
const lastAnimation = new Map();

// planAnimation(info, play) plans the animation of one move ("play" is playPour or playBoxMove).
// Are both bottles free? Then it starts at once. Otherwise it waits until their earlier
// animations have finished.
function planAnimation(info, play) {
  const earlier = [lastAnimation.get(info.from), lastAnimation.get(info.to)]
    .filter(function (ticket) { return ticket !== undefined; });
  for (const number of [info.from, info.to]) {
    busyBottles.add(number);
    animationsLeft.set(number, (animationsLeft.get(number) || 0) + 1);
  }
  let ticket;
  if (earlier.length === 0) {
    ticket = play(info, false);   // free: start now
  } else {
    // allSettled: wait until the earlier ones are over, also if one of them went wrong,
    // so a problem in one animation never leaves the bottles waiting forever.
    ticket = Promise.allSettled(earlier).then(function () {
      return play(info, true);    // its turn: start now ("true": it had to wait)
    });
  }
  lastAnimation.set(info.from, ticket);
  lastAnimation.set(info.to, ticket);
}

// animationFinished(info): one animation is done. A bottle with nothing left to play is free again.
function animationFinished(info) {
  for (const number of [info.from, info.to]) {
    const left = animationsLeft.get(number) - 1;
    if (left > 0) {
      animationsLeft.set(number, left);
    } else {
      animationsLeft.delete(number);
      lastAnimation.delete(number);
      busyBottles.delete(number);
    }
  }
}

// showMoment(info, source, target) draws both bottles as they were just before this move.
// Needed when the animation had to wait: by now the player may have made more moves.
function showMoment(info, source, target) {
  const moved = info.targetAfter.length - info.layersBefore;
  const sourceBefore = info.sourceAfter.concat(new Array(moved).fill(info.colour));
  const targetBefore = info.targetAfter.slice(0, info.layersBefore);
  source.replaceChildren(makeBottle(sourceBefore, info.from));
  source.dataset.layers = sourceBefore.join(",");   // so updateScreen later draws the newest state
  target.replaceChildren(makeBottle(targetBefore, info.to));
  target.dataset.layers = targetBefore.join(",");
}

// A see-through layer over the whole page, where the streams of colour are drawn.
// pointer-events: none (in style.css) means taps go straight through it.
const pourLayer = addSvgPart("svg", { class: "pour-layer", "aria-hidden": "true" });
document.body.appendChild(pourLayer);

// ---------- Helpers ----------

// slowFastSlow(t) turns an even 0..1 into a gentle one: slow at the start, fast in the middle,
// slow at the end. (The same formula as in Ja's naturalMovement.html.)
function slowFastSlow(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// between(a, b, share) gives the value a "share" of the way from a to b (share 0 = a, 1 = b).
function between(a, b, share) {
  return a + (b - a) * share;
}

// ---------- The animation ----------

// playPour(info, waited) shows one pour. "info" is lastPour from game.js:
// { from, to, colour, layersBefore, closes, sourceAfter, targetAfter }.
// "waited" is true if it had to wait its turn (see planAnimation).
// "async" means this function can pause (await) in the middle without freezing the page.
async function playPour(info, waited) {
  const buttons = document.querySelectorAll(".bottle-button");
  const source = buttons[info.from];
  const target = buttons[info.to];
  try {
    if (waited) {
      showMoment(info, source, target);
    }
    await showPour(info, source, target);
  } catch (problem) {
    console.error(problem);   // if anything goes wrong, we still tidy up below
  } finally {
    // "finally" always runs, also after a problem: tidy up, so the game is never left locked.
    source.style.transform = "";
    source.style.position = "";
    source.style.zIndex = "";
    source.style.transition = "";
    source.classList.remove("flying");
    animationFinished(info);
    updateScreen();   // draw the bottles that are free again, with their newest layers
    announcePour(info);   // for screen readers (draw.js)
    if (info.closes && !wantsLessMotion()) {
      dropStopper(target);   // the pour sorted the target: stopper and firework (sparkle.js)
    }
  }
}

// showPour(info, source, target) does the real work of the animation.
async function showPour(info, source, target) {
  // 1. Where is everything? Measure the bottles on the screen, in pixels.
  //    The source is lifted (picked up) right now; remember how high, then hold it there.
  const liftNow = currentLift(source);
  source.style.transition = "none";   // no gliding: we move it ourselves now
  source.classList.remove("selected");
  source.style.transform = "translate(0px, " + liftNow + "px)";
  const s = source.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const size = s.height / drawHeight; // 1 on a laptop; smaller on a phone
  const homeTop = s.top - liftNow;    // where the bottle's top is when it stands in its place

  // The point to rotate around is the middle of the bottle.
  // The mouth is (drawHeight / 2 - drawMargin) drawing-units above the middle.
  const sourceMiddleX = s.left + s.width / 2;
  const sourceMiddleY = homeTop + s.height / 2;
  const mouthDistance = (drawHeight / 2 - drawMargin) * size;

  // Tip towards the side with the most room on the screen.
  const targetMiddleX = t.left + t.width / 2;
  const fromLeft = targetMiddleX >= window.innerWidth - targetMiddleX;
  const tipAngle = fromLeft ? 100 : -100;          // degrees; + = clockwise
  const radians = tipAngle * Math.PI / 180;

  // Where the mouth must end up: just above the target's mouth.
  const mouthX = targetMiddleX;
  const mouthY = t.top - 24 * size;

  // How far the middle of the bottle must move, so that when tipped the mouth is there.
  const pourX = mouthX - mouthDistance * Math.sin(radians) - sourceMiddleX;
  const pourY = mouthY + mouthDistance * Math.cos(radians) - sourceMiddleY;

  // The moving bottle goes in front of the others (z-index), like lifting it towards you.
  // Its light pool and embers stay behind on the ground: we hide them while it flies.
  source.style.position = "relative";
  source.style.zIndex = "10";
  source.classList.add("flying");

  // 2. The liquid. While the bottle moves, we draw the liquid ourselves, many times per second:
  //    it stays level like real water, slides towards the mouth when the bottle tips,
  //    drains out of the lifted bottle bit by bit, and fills the other bottle bit by bit.
  const moved = info.targetAfter.length - info.layersBefore;   // how many layers are poured
  const sourceColours = info.sourceAfter.concat(new Array(moved).fill(info.colour));
  const targetColours = info.targetAfter.slice();             // its layers after the pour
  const sourceLiquid = startLiveLiquid(source);
  const targetLiquid = startLiveLiquid(target);
  const layerHeight = liquidHeight / capacity;

  // The stream: a thin bar of colour from the mouth down to the liquid in the target.
  const stream = addSvgPart("rect", {
    class: "stream colour-" + info.colour,
    x: mouthX - 2.5 * size,
    width: 5 * size,
    y: mouthY,
    height: 0
  }, pourLayer);

  const swingOver = pourSteps.swingOver * pourSpeed;
  const pourTime = pourSteps.pour * pourSpeed;
  const swingBack = pourSteps.swingBack * pourSpeed;
  const total = swingOver + pourTime + swingBack;
  soundPour(pourTime / 1000, swingOver / 1000);   // the glug starts when the liquid flows (sound.js)
  const arc = arcHeight * size;

  try {
    // 3. Every picture: work out where the bottle is and how far it is tipped, and draw it.
    await new Promise(function (finished) {
      const startTime = performance.now();

      function frame(now) {
        const time = Math.max(0, now - startTime);
        let x;
        let y;
        let angle;
        let progress;   // how far the pour is: 0 = nothing poured yet, 1 = everything poured

        if (time < swingOver) {
          // Swing over: one arc from home to the pour place, tipping on the way.
          const e = slowFastSlow(time / swingOver);
          x = between(0, pourX, e);
          y = between(liftNow, pourY, e) - Math.sin(e * Math.PI) * arc;   // up in the middle
          angle = between(0, tipAngle, e);
          progress = 0;
        } else if (time < swingOver + pourTime) {
          // Pour: stay still, tipped.
          x = pourX;
          y = pourY;
          angle = tipAngle;
          progress = (time - swingOver) / pourTime;
        } else {
          // Swing back: an arc home, tipping upright on the way.
          const e = slowFastSlow(Math.min(1, (time - swingOver - pourTime) / swingBack));
          x = between(pourX, 0, e);
          y = between(pourY, 0, e) - Math.sin(e * Math.PI) * arc;
          angle = between(tipAngle, 0, e);
          progress = 1;
        }

        source.style.transform = "translate(" + x + "px, " + y + "px) rotate(" + angle + "deg)";

        const poured = moved * progress;   // how many layers have flowed out so far (can be 1.5)
        const wavePhase = time / 1000 * waveSpeed;
        // The waves: in the lifted bottle while it moves and pours; in the other bottle while it fills.
        const sourceWaves = waveSize(time, 0, total);
        const targetWaves = waveSize(time, swingOver, swingOver + pourTime + 400);
        drawLiveLiquid(sourceLiquid, sourceColours, sourceColours.length - poured,
                       angle * Math.PI / 180, sourceWaves, wavePhase);
        drawLiveLiquid(targetLiquid, targetColours, info.layersBefore + poured, 0, targetWaves, wavePhase);

        // The stream: it grows down from the mouth at the start, and its tail falls in at the end.
        if (progress > 0 && progress < 1) {
          // (Measured again every picture: the target may be picked up in the meantime.)
          const surfaceY = target.getBoundingClientRect().top + (bottleBottom - (info.layersBefore + poured) * layerHeight + drawMargin) * size;
          const fullLength = Math.max(0, surfaceY - mouthY);
          const head = fullLength * Math.min(1, progress / 0.15);
          const tail = fullLength * Math.max(0, (progress - 0.9) / 0.1);
          stream.setAttribute("y", mouthY + tail);
          stream.setAttribute("height", Math.max(0, head - tail));
        } else {
          stream.setAttribute("height", 0);
        }

        if (time < total) {
          requestAnimationFrame(safeFrame);
        } else {
          finished();   // the bottle is back home
        }
      }

      // safeFrame runs one frame; if anything goes wrong, it stops the animation instead of freezing.
      function safeFrame(now) {
        try {
          frame(now);
        } catch (problem) {
          console.error(problem);
          finished();
        }
      }

      requestAnimationFrame(safeFrame);
    });
  } finally {
    stream.remove();
  }
}

// ---------- Live liquid: level like real water ----------
// How it works: the space for liquid is a list of corner points (liquidShape in draw.js).
// For an amount of liquid we know how much AREA it takes up when the bottle stands upright.
// When the bottle is tipped, we search the water line (a straight, level line) that cuts off
// exactly that much area at the bottom side. That is where the liquid surface must be.

// startLiveLiquid(button) hides the normal liquid drawing of a bottle,
// and gives back an empty group where we can draw the live liquid instead.
function startLiveLiquid(button) {
  const normalLiquid = button.querySelector(".glass-content");
  normalLiquid.style.display = "none";
  const live = document.createElementNS(svgNamespace, "g");
  live.setAttribute("clip-path", normalLiquid.getAttribute("clip-path"));   // the same stencil
  normalLiquid.after(live);   // in the same place, so the outlines stay on top
  return live;
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
  return shapeArea(cutShape(liquidShape, [0, 1], bottleBottom - amount * layerHeight, true));
}

// waterLine(wantedArea, down) searches the level line that has exactly wantedArea below it.
// It halves the search range again and again (like guessing a number: "higher? lower?").
function waterLine(wantedArea, down) {
  const depths = liquidShape.map(function (point) { return depthOf(point, down); });
  let high = Math.min(...depths);   // the highest point of the bottle
  let low = Math.max(...depths);    // the lowest point of the bottle
  for (let i = 0; i < 30; i++) {
    const middle = (high + low) / 2;
    if (shapeArea(cutShape(liquidShape, down, middle, true)) > wantedArea) {
      high = middle;   // too much liquid below this line: the line must go lower
    } else {
      low = middle;
    }
  }
  return (high + low) / 2;
}

// drawLiveLiquid(group, colours, amount, angle, waveHeight, wavePhase) draws "amount" layers
// (it may be 2.5) of the colours (bottom to top), level with the ground, in a bottle turned
// by "angle". The top of the liquid rolls in waves: two waves of different sizes that slide
// over each other, so the surface keeps moving. waveHeight 0 = a flat, calm surface.
function drawLiveLiquid(group, colours, amount, angle, waveHeight, wavePhase) {
  group.replaceChildren();
  const down = [Math.sin(angle), Math.cos(angle)];     // the direction of gravity, inside the bottle
  const along = [Math.cos(angle), -Math.sin(angle)];   // the direction of the water surface

  // 1. The water line at the top of every layer.
  const lines = [];
  for (let i = 0; i < colours.length; i++) {
    const thisLayer = Math.min(1, amount - i);   // 1 = a full layer; 0.5 = half a layer
    if (thisLayer <= 0) {
      break;
    }
    lines.push(waterLine(areaOfLayers(i + thisLayer), down));
  }
  if (lines.length === 0) {
    return;   // an empty bottle: nothing to draw
  }
  const top = lines.length - 1;

  // 2. The top layer: everything below a wavy surface. It is drawn bigger than the bottle;
  //    the bottle's stencil cuts it to the right shape.
  const centre = [bottleWidth / 2, 104];   // about the middle of the bottle
  const centreDepth = depthOf(centre, down);
  const surface = [];
  for (let s = -130; s <= 130; s = s + 4) {
    const wave = waveHeight * (0.7 * Math.sin(s * 0.08 + wavePhase) +
                               0.3 * Math.sin(s * 0.2 + wavePhase * 1.3));
    const level = lines[top] - wave - centreDepth;   // a positive wave lifts the surface
    surface.push([centre[0] + s * along[0] + level * down[0],
                  centre[1] + s * along[1] + level * down[1]]);
  }
  const deep = 300;   // far below the bottle
  surface.push([centre[0] + 130 * along[0] + deep * down[0], centre[1] + 130 * along[1] + deep * down[1]]);
  surface.push([centre[0] - 130 * along[0] + deep * down[0], centre[1] - 130 * along[1] + deep * down[1]]);
  addLiquidShape(group, colours[top], surface);

  // 3. The other layers, drawn on top of it, each cut exactly between its two water lines.
  for (let i = 0; i < top; i++) {
    let shape = cutShape(liquidShape, down, lines[i], true);
    if (i > 0) {
      shape = cutShape(shape, down, lines[i - 1], false);
    }
    addLiquidShape(group, colours[i], shape);
  }
}

// addLiquidShape(group, colour, points) draws one coloured shape.
function addLiquidShape(group, colour, points) {
  addSvgPart("polygon", {
    class: "colour-" + colour,
    points: points.map(function (point) { return round(point[0]) + "," + round(point[1]); }).join(" ")
  }, group);
}

// waveSize(now, from, to) gives how big the waves are at time "now":
// 0 before "from", growing to the biggest halfway, and back to 0 at "to" (a sine curve).
function waveSize(now, from, to) {
  if (now <= from || now >= to) {
    return 0;
  }
  return maxWaveHeight * Math.sin(Math.PI * (now - from) / (to - from));
}

// currentLift(button) reads how far up a button is moved right now (0 if not lifted).
function currentLift(button) {
  const transform = getComputedStyle(button).transform;
  if (transform === "none") {
    return 0;
  }
  return new DOMMatrix(transform).m42;   // m42 = the up/down part of the movement
}
