// ReSorter: the pour animation.
// The rule (game.js) has already poured; this file only SHOWS it, step by step:
//   1. the picked-up bottle rises, so it is above the target bottle;
//   2. it moves next to the target, still upright;
//   3. it tips over, so its mouth is just above the target's mouth;
//   4. a stream of colour flows down, and the bottles show their new layers;
//   5. it tips back, rises, and goes back to its own place.
// Note: index.html must load this file AFTER game.js and draw.js.

// ---------- Settings (you may change these) ----------

// How long the pour takes: 1 = normal, 2 = twice as slow, 0.5 = twice as fast.
const pourSpeed = 1;

// How long each step takes, in milliseconds (1000 = 1 second), at pourSpeed 1.
const pourSteps = {
  rise: 150,
  moveOver: 220,
  tipOver: 180,
  pour: 420,
  tipBack: 150,
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

// ---------- Helpers ----------

// waitUntil(animation, ms) gives a "promise" that is kept when the animation
// has been playing for ms milliseconds (or has finished).
// "await waitUntil(movement, 300)" means: pause here until the bottle is 300 ms into its movement.
// We follow the animation's own clock, so the stream always keeps in step with the bottle,
// even when the browser slows the animation down.
function waitUntil(animation, ms) {
  return new Promise(function (keepPromise) {
    function check() {
      if (animation.playState !== "running" || animation.currentTime >= ms) {
        keepPromise();
      } else {
        requestAnimationFrame(check);
      }
    }
    check();
  });
}

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

  // How high to rise first: so high that the whole bottle is above the top row of bottles,
  // so it moves OVER the others, not through them. (On a small phone it may go briefly
  // off the top of the screen; that is better than moving through other bottles.)
  const firstBottle = buttons[0].getBoundingClientRect();
  const topRow = Math.min(firstBottle.top, t.top);
  const wantedRise = topRow - s.top - s.height - 12 * size;
  const riseY = Math.min(liftNow, wantedRise);

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
    // move across, up high
    { transform: "translate(" + moveX + "px, " + riseY + "px) rotate(0deg)", offset: at(step.moveOver) },
    // tip over and come down to the target's mouth
    { transform: "translate(" + moveX + "px, " + moveY + "px) rotate(" + tipAngle + "deg)", offset: at(step.tipOver) },
    // stay there while pouring
    { transform: "translate(" + moveX + "px, " + moveY + "px) rotate(" + tipAngle + "deg)", offset: at(step.pour) },
    // tip back and go up high again
    { transform: "translate(" + moveX + "px, " + riseY + "px) rotate(0deg)", offset: at(step.tipBack) },
    // move back across, up high
    { transform: "translate(0px, " + riseY + "px) rotate(0deg)", offset: at(step.moveBack) },
    // and down into its own place
    { transform: "translate(0px, 0px) rotate(0deg)", offset: 1 }
  ];

  // The moving bottle goes in front of the others (z-index), like lifting it towards you.
  source.style.position = "relative";
  source.style.zIndex = "10";
  const movement = source.animate(poses, { duration: total, easing: "ease-in-out" });

  // Wait until the browser has really started the movement, so the stream below
  // keeps in step with the bottle, even on a slow phone.
  await movement.ready;

  // 3. The stream: a thin bar of colour from the mouth down to the liquid in the target.
  const layerHeight = liquidHeight / capacity;
  const surfaceY = t.top + (bottleBottom - info.layersBefore * layerHeight + 4) * size;
  const stream = addSvgPart("rect", {
    class: "stream colour-" + info.colour,
    x: mouthX - 2.5 * size,
    y: mouthY,
    width: 5 * size,
    height: Math.max(0, surfaceY - mouthY)
  }, pourLayer);

  stream.style.visibility = "hidden";   // not yet: first the bottle must tip over

  // When the bottle has tipped over, the stream grows down from the mouth.
  const pourStart = step.rise + step.moveOver + step.tipOver;
  await waitUntil(movement, pourStart);
  stream.style.visibility = "";
  stream.animate(
    [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
    { duration: step.pour * 0.3, fill: "both" }
  );

  // Halfway through the pour, show the new layers in both bottles.
  await waitUntil(movement, pourStart + step.pour * 0.5);
  updateScreen();

  // At the end of the pour, the stream disappears.
  await waitUntil(movement, pourStart + step.pour);
  stream.remove();

  // 4. Wait until the bottle is back home, then tidy up.
  await movement.finished;
  source.style.position = "";
  source.style.zIndex = "";
  source.style.transition = "";
}

// currentLift(button) reads how far up a button is moved right now (0 if not lifted).
function currentLift(button) {
  const transform = getComputedStyle(button).transform;
  if (transform === "none") {
    return 0;
  }
  return new DOMMatrix(transform).m42;   // m42 = the up/down part of the movement
}
