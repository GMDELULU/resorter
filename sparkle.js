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
  const size = box.width / 28;   // smaller sparks on a phone

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
