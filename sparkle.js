// ReSorter: the sorted bottle. Its stopper drops on, and one short firework goes off.
// The firework works like Ja's fireworks.html: sparks fly out in random directions,
// slow down (friction), fall (gravity) and fade away. Following the style guide,
// the sparks are gold only, and each one is drawn as a short stroke (its trail), not a dot.
// Note: index.html must load this file AFTER pour.js (it draws on pour.js's see-through layer).

// ---------- Settings (you may change these) ----------

const sparkCount = 30;           // how many sparks in the firework
const sparkGravity = 0.06;       // how fast the sparks fall
const sparkFriction = 0.96;      // 1 = no slowing down; smaller = slows down faster
const sparkFade = 0.025;         // how fast the sparks fade (bigger = shorter firework)
// Gold colours from the style guide (outline gold, restored halo, chaos gold, restored gold).
const sparkColours = ["#E2B24A", "#F7D774", "#D9A63C", "#F5C542"];

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
        stroke: sparkColours[count % sparkColours.length],
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
// Like the reference drawing: behind the bottle a large, textured gold circle (a sun) appears,
// with dark curved feather strokes (like wings) to the left and right, and gold sparks.
// Then it all fades away again. It is drawn on its own layer BEHIND the bottles.

// A see-through layer over the whole page, behind the bottles (see style.css: .moment-layer).
const momentLayer = addSvgPart("svg", { class: "moment-layer", "aria-hidden": "true" });
document.body.appendChild(momentLayer);

// Colours from the style guide: halo, gold outline, chaos gold, restored halo, pencil lines.
const sunColours = ["#B48C3A", "#E2B24A", "#D9A63C", "#F7D774"];

// showSunburst(x, y, radius, howLong) draws the sun with feathers around point (x, y), on the screen.
function showSunburst(x, y, radius, howLong) {
  const group = addSvgPart("g", { class: "sunburst" }, momentLayer);

  // A dark ring around the sun, then the sun itself.
  addSvgPart("circle", { cx: x, cy: y, r: radius * 1.09, fill: "#0B0806" }, group);
  addSvgPart("circle", { cx: x, cy: y, r: radius, fill: "#B48C3A" }, group);

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
      d: strokes, fill: "none", stroke: sunColours[layer], "stroke-width": Math.max(0.8, radius / 60), opacity: 0.6
    }, group);
  }
  // The sketchy edge of the sun: a dark pencil circle.
  addSvgPart("circle", {
    cx: x, cy: y, r: radius, fill: "none", stroke: "#090705", "stroke-width": Math.max(1, radius / 50), opacity: 0.8
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
        d: feather, fill: "none", stroke: "#090705",
        "stroke-width": radius * (0.04 + Math.random() * 0.05), opacity: 0.95
      }, group);
      if (Math.random() < 0.6) {
        addSvgPart("path", {
          d: feather, fill: "none", stroke: "#E2B24A", "stroke-width": Math.max(0.6, radius / 80), opacity: 0.5
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
