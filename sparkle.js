// ReSorter: the special moments. A sorted bottle: its stopper drops on, one short firework
// goes off, and a gold sun with dark feathers shows behind it. A win: a big sun and a firework.
// The firework works like Ja's fireworks.html: sparks fly out in random directions,
// slow down (friction), fall (gravity) and fade away. Following the style guide,
// the sparks are gold only, and each one is drawn as a short stroke (its trail), not a dot.
// Note: index.html must load this file AFTER pour.js (it draws on pour.js's see-through layer).

// ---------- Settings (you may change these) ----------

const sparkCount = 30;           // how many sparks in the firework
const sparkGravity = 0.06;       // how fast the sparks fall
const sparkFriction = 0.96;      // 1 = no slowing down; smaller = slows down faster
const sparkFade = 0.025;         // how fast the sparks fade (bigger = shorter firework)
// The spark colours: names of gold colours in the theme file (theme-liquid.css).
const sparkColours = ["--restored-gold", "--restored-halo", "--restored-colour-1", "--ripple-edge"];   // restored golds

// ---------- The stopper drops on ----------

// dropStopper(button) lets the stopper of this bottle fall onto the neck,
// and starts the firework just when it lands.
function dropStopper(button) {
  const stopper = button.querySelector(".stopper");
  if (stopper === null) {
    return;
  }
  stopper.animate([
    { transform: "translateY(-40px)", opacity: 0 },
    { transform: "translateY(-40px)", opacity: 1, offset: 0.15 },
    { transform: "translateY(3px)", opacity: 1, offset: 0.8 },   // a tiny bounce: a bit too far...
    { transform: "translateY(0px)", opacity: 1 }                 // ...and back
  ], { duration: 600, easing: "ease-in" });
  celebrateBottle(button);       // the sun with feathers behind the bottle (further down)
  rippleFromBottle(button);      // and the reveal ripple across the screen (further down)
  setTimeout(function () {
    if (stopper.isConnected) {   // only if the stopper is still on the page (not undone meanwhile)
      firework(stopper);
    }
  }, 480);
}

// ---------- One short firework ----------

// firework(stopper) shoots sparks out from the middle of the stopper.
function firework(stopper) {
  const box = stopper.getBoundingClientRect();
  const startX = box.left + box.width / 2;
  const startY = box.top + box.height / 2;
  const size = box.width / 24;   // smaller sparks on a phone

  // Make the sparks. Each spark is an object with a place (x, y), a speed (vx, vy) and a life.
  const sparks = [];
  for (let count = 0; count < sparkCount; count++) {
    const angle = Math.random() * Math.PI * 2;   // a random direction
    const speed = (Math.random() * 3 + 1) * size;  // a random speed
    sparks.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      line: addSvgPart("line", {
        class: "spark",
        stroke: themeColour(sparkColours[count % sparkColours.length]),
        "stroke-width": 1.5 * size
      }, pourLayer)
    });
  }

  // One step: move every spark a little, then draw it as a short stroke behind its head.
  // "steps" says how many sixtieths of a second have passed since the last picture, so the
  // firework has the same speed on every screen (some screens draw 60, others 120 pictures a second).
  let lastTime = performance.now();
  function step(now) {
    const steps = Math.max(0, Math.min(4, (now - lastTime) / (1000 / 60)));   // never below 0, never more than 4
    lastTime = now;
    sparks.forEach(function (spark) {
      spark.vy = spark.vy + sparkGravity * size * steps;   // gravity pulls it down
      spark.vx = spark.vx * Math.pow(sparkFriction, steps); // friction slows it down
      spark.vy = spark.vy * Math.pow(sparkFriction, steps);
      spark.x = spark.x + spark.vx * steps;
      spark.y = spark.y + spark.vy * steps;
      spark.life = spark.life - sparkFade * steps;        // it fades

      // The stroke: from a bit behind the spark (where it came from) to where it is now.
      spark.line.setAttribute("x1", spark.x - spark.vx * 3);
      spark.line.setAttribute("y1", spark.y - spark.vy * 3);
      spark.line.setAttribute("x2", spark.x);
      spark.line.setAttribute("y2", spark.y);
      spark.line.setAttribute("opacity", Math.max(0, spark.life));
    });

    if (sparks[0].life > 0) {
      requestAnimationFrame(step);   // keep going
    } else {
      sparks.forEach(function (spark) {
        spark.line.remove();          // the firework is over: tidy up
      });
    }
  }
  requestAnimationFrame(step);
}

// ---------- The special moment: a gold sun with dark feathers ----------
// Like the reference drawing, but in the RESTORED colours (the world healing): behind the bottle
// a large, textured gold circle (a sun) appears,
// with dark curved feather strokes (like wings) to the left and right, and gold sparks.
// Then it all fades away again. It is drawn on its own layer BEHIND the bottles.

// A see-through layer over the whole page, behind the bottles (see style.css: .moment-layer).
const momentLayer = addSvgPart("svg", { class: "moment-layer", "aria-hidden": "true" });
document.body.appendChild(momentLayer);

// The sun's texture colours: names of gold colours in the theme file (theme-liquid.css).
const sunColours = ["--restored-gold", "--restored-halo", "--restored-colour-1", "--ripple-edge"];   // restored golds

// showSunburst(x, y, radius, howLong) draws the sun with feathers around point (x, y), on the screen.
function showSunburst(x, y, radius, howLong) {
  const group = addSvgPart("g", { class: "sunburst" }, momentLayer);

  // A soft brown ring around the sun, then the sun itself.
  addSvgPart("circle", { cx: x, cy: y, r: radius * 1.09, fill: themeColour("--restored-pencil"), opacity: 0.6 }, group);
  addSvgPart("circle", { cx: x, cy: y, r: radius, fill: themeColour("--restored-halo") }, group);

  // Texture: many short strokes inside the sun, in different golds (like gold leaf).
  for (let layer = 0; layer < sunColours.length; layer++) {
    let strokes = "";
    for (let count = 0; count < 45; count++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius * 0.92;
      const sx = x + Math.cos(angle) * distance;
      const sy = y + Math.sin(angle) * distance;
      const length = radius * (0.05 + Math.random() * 0.12);
      const turn = Math.random() * Math.PI;
      strokes += "M" + round(sx) + " " + round(sy) +
                 " l" + round(Math.cos(turn) * length) + " " + round(Math.sin(turn) * length) + " ";
    }
    addSvgPart("path", {
      d: strokes, fill: "none", stroke: themeColour(sunColours[layer]), "stroke-width": Math.max(0.8, radius / 60), opacity: 0.6
    }, group);
  }
  // The sketchy edge of the sun: a dark pencil circle.
  addSvgPart("circle", {
    cx: x, cy: y, r: radius, fill: "none", stroke: themeColour("--restored-pencil"), "stroke-width": Math.max(1, radius / 50), opacity: 0.8
  }, group);

  // Feathers: dark curved strokes from the middle out to the left and right, some with a gold vein.
  [-1, 1].forEach(function (side) {
    for (let count = 0; count < 12; count++) {
      const startY = y - radius * 0.55 + count * radius * 0.1;
      const startX = x + side * radius * 0.25;
      const endX = x + side * radius * (1.0 + Math.random() * 0.55);
      const endY = startY - radius * 0.3 + Math.random() * radius * 0.35;
      const bendX = x + side * radius * (0.6 + Math.random() * 0.25);
      const bendY = startY - radius * (0.2 + Math.random() * 0.2);
      const feather = "M" + round(startX) + " " + round(startY) +
                      " Q" + round(bendX) + " " + round(bendY) + " " + round(endX) + " " + round(endY);
      addSvgPart("path", {
        d: feather, fill: "none", stroke: themeColour("--restored-pencil"),
        "stroke-width": radius * (0.04 + Math.random() * 0.05), opacity: 0.95
      }, group);
      if (Math.random() < 0.6) {
        addSvgPart("path", {
          d: feather, fill: "none", stroke: themeColour("--restored-gold"), "stroke-width": Math.max(0.6, radius / 80), opacity: 0.5
        }, group);
      }
    }
  });

  // Appear, stay a moment, fade away; then remove it.
  const appear = group.animate([
    { opacity: 0, transform: "scale(0.85)" },
    { opacity: 1, transform: "scale(1)", offset: 0.2 },
    { opacity: 1, transform: "scale(1)", offset: 0.6 },
    { opacity: 0, transform: "scale(1.05)" }
  ], { duration: howLong, easing: "ease-out" });
  appear.finished.then(function () {
    group.remove();
  }, function () {
    group.remove();
  });
}

// celebrateBottle(button): a sorted bottle gets a short sunburst behind it.
function celebrateBottle(button) {
  const box = button.getBoundingClientRect();
  showSunburst(box.left + box.width / 2, box.top + box.height * 0.42, box.width * 1.15, 1400);
}

// celebrateWin(): the same, but big, behind all the bottles, when the level is won.
function celebrateWin() {
  if (wantsLessMotion()) {
    return;
  }
  const field = document.getElementById("bottles").getBoundingClientRect();
  const radius = Math.min(field.width, field.height) * 0.42;
  showSunburst(field.left + field.width / 2, field.top + field.height / 2, radius, 3000);
  firework({ getBoundingClientRect: function () {   // one firework from the middle as well
    return { left: field.left + field.width / 2 - 12, top: field.top + field.height / 2 - 12, width: 24, height: 24 };
  } });
}

// ---------- The reveal ripple: a glimpse of the restored world ----------
// When a bottle is sorted, a ring spreads out from it across the whole screen, like a ripple in
// water. Inside the band of the ring you see the restored world (a light background with rune
// marks); outside it, the dark world stays as it is. The bottles and buttons stay on top.
// It is drawn on its own layer, behind the sun (see style.css: .ripple-layer).

// Settings for the ripple.
const revealTime = 1200;        // milliseconds from start until it has faded out
const revealBandStart = 80;     // how wide the band is at the start (pixels)
const revealBandEnd = 40;       // how wide it is at the end: it gets thinner as it grows
const revealSparkles = 8;       // white sparkles riding along the edge

// The layer for the ripples: put it in the page just BEFORE the sun layer, so the sun stays on top.
const rippleLayer = addSvgPart("svg", { class: "ripple-layer", "aria-hidden": "true" });
document.body.insertBefore(rippleLayer, momentLayer);
const rippleDefs = addSvgPart("defs", {}, rippleLayer);

// The rune marks of the restored world: a pattern (a small tile that repeats), drawn once,
// in the restored rune colour. The marks are made-up shapes, not real letters.
makeRunePattern("restored-runes", themeColour("--ripple-runes"), rippleDefs);

// A number for every ripple, so several ripples can run at the same time without mixing up.
let revealCount = 0;
// How many ripples are running right now.
let activeRipples = 0;

// slowingDown(t): fast at the start, slower and slower at the end (like a ripple in water).
function slowingDown(t) {
  return 1 - Math.pow(1 - t, 3);
}

// revealRipple(x, y) starts one ripple from point (x, y) on the screen.
function revealRipple(x, y) {
  // At most 3 ripples at the same time, so a slow phone does not stutter.
  if (activeRipples >= 3) {
    return;
  }
  activeRipples = activeRipples + 1;
  revealCount = revealCount + 1;
  const name = "reveal-" + revealCount;
  // The ripple must reach the furthest corner of the screen.
  const furthest = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const maxRadius = furthest + revealBandStart;

  // The band is made with a "mask": white shows the restored world, black hides it.
  // A radial gradient (from the middle outwards) is black inside, white in the band, black outside.
  const gradient = addSvgPart("radialGradient", {
    id: name + "-band", gradientUnits: "userSpaceOnUse", cx: x, cy: y, r: 1
  }, rippleDefs);
  const stops = [0, 0, 0, 0, 0].map(function () {
    return addSvgPart("stop", { offset: 0, "stop-color": "white", "stop-opacity": 0 }, gradient);
  });
  const mask = addSvgPart("mask", { id: name + "-mask", maskUnits: "userSpaceOnUse" }, rippleDefs);
  const maskShape = addSvgPart("rect", {
    x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, fill: "url(#" + name + "-band)"
  }, mask);

  // The restored world, seen only through the mask.
  const world = addSvgPart("g", { mask: "url(#" + name + "-mask)" }, rippleLayer);
  const worldPaper = addSvgPart("rect", {
    x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, fill: themeColour("--ripple-background")
  }, world);
  const worldRunes = addSvgPart("rect", {
    x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, fill: "url(#restored-runes)"
  }, world);

  // The thin bright edge on the outside of the ring, and the white sparkles riding along it.
  const edge = addSvgPart("circle", {
    cx: x, cy: y, r: 1, fill: "none", stroke: themeColour("--ripple-edge"), "stroke-width": 2
  }, rippleLayer);
  const sparkles = [];
  for (let count = 0; count < revealSparkles; count++) {
    sparkles.push({
      angle: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.6,   // each sparkle slides a little along the ring
      line: addSvgPart("line", {
        class: "spark", stroke: themeColour("--sparkle-white"), "stroke-width": 1.5
      }, rippleLayer)
    });
  }

  const startTime = performance.now();
  function step(now) {
    const t = Math.min(1, Math.max(0, (now - startTime) / revealTime));
    const e = slowingDown(t);
    const radius = Math.max(1, e * maxRadius);
    const band = revealBandStart + (revealBandEnd - revealBandStart) * e;   // thinner as it grows
    const strength = (1 - 0.5 * e) * (t < 0.75 ? 1 : (1 - t) / 0.25);     // more see-through, then gone

    // The soft band: invisible up to (radius - band), fully visible in the middle, invisible at radius.
    const inner = Math.max(0, (radius - band) / radius);
    const middle = Math.max(0, (radius - band / 2) / radius);
    const offsets = [0, inner, middle, 1, 1];   // always growing from 0 to 1, so the edges stay soft
    const opacities = [0, 0, strength, 0, 0];
    stops.forEach(function (stop, i) {
      stop.setAttribute("offset", offsets[i]);
      stop.setAttribute("stop-opacity", opacities[i]);
    });
    gradient.setAttribute("r", radius);
    [maskShape, worldPaper, worldRunes].forEach(function (shape) {   // (in case the window changes size)
      shape.setAttribute("width", window.innerWidth);
      shape.setAttribute("height", window.innerHeight);
    });

    edge.setAttribute("r", radius);
    edge.setAttribute("opacity", strength);
    sparkles.forEach(function (sparkle) {
      const angle = sparkle.angle + sparkle.drift * e;
      const along = 4;   // half the length of a sparkle stroke, along the ring
      const sx = x + Math.cos(angle) * radius;
      const sy = y + Math.sin(angle) * radius;
      sparkle.line.setAttribute("x1", sx - Math.sin(angle) * along);
      sparkle.line.setAttribute("y1", sy + Math.cos(angle) * along);
      sparkle.line.setAttribute("x2", sx + Math.sin(angle) * along);
      sparkle.line.setAttribute("y2", sy - Math.cos(angle) * along);
      sparkle.line.setAttribute("opacity", strength);
    });

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      // Finished: tidy up everything this ripple made.
      [gradient, mask, world, edge].forEach(function (part) { part.remove(); });
      sparkles.forEach(function (sparkle) { sparkle.line.remove(); });
      activeRipples = activeRipples - 1;
    }
  }
  requestAnimationFrame(step);
}

// rippleFromBottle(button) starts a ripple from the middle of a bottle.
function rippleFromBottle(button) {
  const box = button.getBoundingClientRect();
  revealRipple(box.left + box.width / 2, box.top + box.height / 2);
}

// softGlow(button): for players who asked for less motion. No ripple, just a soft warm glow
// around the sorted bottle for 0.6 seconds.
function softGlow(button) {
  const glow = themeColour("--ripple-glow");
  button.animate([
    { filter: "drop-shadow(0 0 0px transparent)" },
    { filter: "drop-shadow(0 0 16px " + glow + ")", offset: 0.4 },
    { filter: "drop-shadow(0 0 0px transparent)" }
  ], { duration: 600 });
}

// makeRunePattern(id, colour, defs) makes a repeating tile of made-up rune marks (simple strokes
// like | ) > + V), in two rows, with a fixed dice so it always looks the same.
function makeRunePattern(id, colour, defs) {
  const random = makeRandom(4242);
  const pattern = addSvgPart("pattern", {
    id: id, width: 240, height: 48, patternUnits: "userSpaceOnUse"
  }, defs);
  let marks = "";
  for (let row = 0; row < 2; row++) {
    const y = 8 + row * 24;
    for (let x = 4; x < 232; x = x + 8 + random() * 4) {
      const kind = Math.floor(random() * 6);
      const h = 7 + random() * 3;
      if (kind === 0) {
        marks += "M" + round(x) + " " + y + " v" + round(h) + " ";                       // |
      } else if (kind === 1) {
        marks += "M" + round(x) + " " + y + " q3 " + round(h / 2) + " 0 " + round(h) + " ";   // )
      } else if (kind === 2) {
        marks += "M" + round(x) + " " + round(y + h / 2) + " h5 M" + round(x + 2.5) + " " + y + " v" + round(h) + " ";   // +
      } else if (kind === 3) {
        marks += "M" + round(x) + " " + y + " l2.5 " + round(h) + " l2.5 " + round(-h) + " ";   // V
      } else if (kind === 4) {
        marks += "M" + round(x) + " " + y + " h5 v" + round(h * 0.6) + " ";              // ⌐
      } else {
        marks += "M" + round(x) + " " + y + " l4 " + round(h / 2) + " l-4 " + round(h / 2) + " ";   // >
      }
    }
  }
  addSvgPart("path", { d: marks, fill: "none", stroke: colour, "stroke-width": 1, opacity: 0.55 }, pattern);
}
