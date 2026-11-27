// ReSorter: the restore spell (lesson 21d). After level 100 is won, the whole world is restored:
// a gold rune ring opens under the bottles, gold specks swirl up around them,
// and a burst of white stars flies out above them. Then it all fades away.
// Based on Ja's own animation (design/magic-spell-reference.html), with the theme's colours.
// It is drawn on a "canvas": a drawing sheet over the page that JavaScript paints on,
// many times per second (each painting is one "frame").
// Note: index.html must load this file after draw.js (it uses themeColour and wantsLessMotion).

// ---------- Settings (you may change these) ----------

// How long the spell lasts: 1 = normal (about 4 seconds), 2 = twice as long, 0.5 = twice as short.
const spellLength = 1;

// ---------- The spell ----------

// The spell that is playing now: its drawing sheet, and the number of its next frame.
let spellCanvas = null;
let spellFrame = null;

// stopRestoreSpell() stops the spell at once and removes its drawing sheet.
// Used when another level starts, after Undo, and when the screen turns or changes size.
function stopRestoreSpell() {
  if (spellFrame !== null) {
    cancelAnimationFrame(spellFrame);
    spellFrame = null;
  }
  if (spellCanvas !== null) {
    spellCanvas.remove();
    spellCanvas = null;
  }
  window.removeEventListener("resize", stopRestoreSpell);
}

// castRestoreSpell() plays the spell once, over the playing field.
function castRestoreSpell() {
  stopRestoreSpell();   // never two spells at the same time
  if (wantsLessMotion()) {
    return;   // players who asked for less motion: no spell (the world still turns restored)
  }

  // The drawing sheet: over the whole screen, taps go straight through it (see style.css).
  const canvas = document.createElement("canvas");
  canvas.className = "spell-layer";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  spellCanvas = canvas;
  window.addEventListener("resize", stopRestoreSpell);   // the screen turns: stop (it would look stretched)
  // Sharp on phones with many pixels, but at most twice as many (so it does not use too much memory).
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * scale;
  canvas.height = window.innerHeight * scale;
  const pen = canvas.getContext("2d");
  pen.scale(scale, scale);

  // Where: under the middle of the row of bottles, and how big.
  const field = document.getElementById("bottles").getBoundingClientRect();
  const middleX = field.left + field.width / 2;
  // (Always inside the visible screen: on a phone the bottles can reach below the bottom edge.)
  const ground = Math.min(field.bottom - 6, window.innerHeight - 30);   // the ring: on the ground under the bottles
  const ringSize = Math.min(field.width * 0.6, 260);
  const bottleTop = Math.max(field.top + 10, 40);                       // the stars: above the bottles

  // The colours, from the theme file (theme-liquid.css).
  const brightGold = themeColour("--ripple-edge");
  const darkGold = themeColour("--ripple-runes");
  const white = themeColour("--sparkle-white");

  let specks = [];      // the gold specks that swirl up
  let stars = [];       // the white stars of the burst
  let burstDone = false;
  const startTime = performance.now();

  // A small four-pointed star: two crossing lines.
  function star(x, y, size, light) {
    pen.globalAlpha = light;
    pen.beginPath();
    pen.moveTo(x - size, y);
    pen.lineTo(x + size, y);
    pen.moveTo(x, y - size);
    pen.lineTo(x, y + size);
    pen.stroke();
    pen.globalAlpha = 1;
  }

  // The rune ring: two rings and twelve marks, seen a little from above (squashed flat).
  function runeRing(open, turn) {
    if (open <= 0) {
      return;
    }
    pen.save();
    pen.translate(middleX, ground);
    pen.scale(1, 0.28);
    pen.globalAlpha = open;
    pen.strokeStyle = brightGold;
    pen.lineWidth = 2;
    const radius = ringSize * open;
    pen.beginPath();
    pen.arc(0, 0, radius, 0, Math.PI * 2);
    pen.stroke();
    pen.beginPath();
    pen.arc(0, 0, radius * 0.75, 0, Math.PI * 2);
    pen.stroke();
    for (let i = 0; i < 12; i++) {
      pen.save();
      pen.rotate(turn + i * Math.PI / 6);
      pen.beginPath();
      pen.moveTo(radius * 0.78, 0);
      pen.lineTo(radius * 0.97, 0);
      if (i % 2 === 1) {
        pen.moveTo(radius * 0.87, -8);
        pen.lineTo(radius * 0.87, 8);
      }
      pen.stroke();
      pen.restore();
    }
    pen.restore();
    pen.globalAlpha = 1;
  }

  function frame(now) {
    const seconds = (now - startTime) / 1000 / spellLength;   // time since the spell started

    // Soft trails: the last picture fades a little instead of disappearing at once.
    pen.globalCompositeOperation = "destination-out";
    pen.fillStyle = "rgba(0, 0, 0, 0.35)";
    pen.fillRect(0, 0, window.innerWidth, window.innerHeight);
    pen.globalCompositeOperation = "source-over";

    // The ring opens (0.5 s), stays, and fades out (from 2.6 s, in 0.6 s).
    const open = seconds < 0.5 ? seconds / 0.5 : seconds < 2.6 ? 1 : Math.max(0, 1 - (seconds - 2.6) / 0.6);
    runeRing(open, now / 900);

    // New specks rise from the ring, for the first 1.9 seconds.
    if (seconds < 1.9) {
      for (let k = 0; k < 3; k++) {
        specks.push({ angle: Math.random() * Math.PI * 2, y: ground,
                      radius: ringSize * 0.72 + Math.random() * 20,
                      speed: 1.6 + Math.random() * 1.2, life: 1 });
      }
    }

    // "lighter": where light falls on light, it adds up and glows.
    pen.globalCompositeOperation = "lighter";
    specks.forEach(function (s) {
      s.angle = s.angle + 0.07;      // round and round...
      s.y = s.y - s.speed;           // ...and up
      s.radius = s.radius * 0.992;   // a little closer to the middle
      s.life = s.life - 0.006;
      const front = (Math.sin(s.angle) + 1) / 2;   // 1 = in front of the bottles, 0 = behind
      pen.fillStyle = front > 0.5 ? brightGold : darkGold;
      pen.globalAlpha = Math.max(0, s.life) * (0.4 + 0.6 * front);
      pen.beginPath();
      pen.arc(middleX + Math.cos(s.angle) * s.radius, s.y, 1 + 2.2 * front, 0, Math.PI * 2);
      pen.fill();
    });
    specks = specks.filter(function (s) { return s.life > 0 && s.y > 0; });

    // At 2 seconds: one burst of white stars above the bottles.
    if (seconds > 2 && !burstDone) {
      burstDone = true;
      for (let i = 0; i < 70; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        stars.push({ x: middleX, y: bottleTop, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 });
      }
    }
    pen.strokeStyle = white;
    pen.lineWidth = 1.5;
    stars.forEach(function (s) {
      s.x = s.x + s.vx;
      s.y = s.y + s.vy;
      s.vx = s.vx * 0.96;            // slowing down
      s.vy = s.vy * 0.96 + 0.03;     // and falling a little
      s.life = s.life - 0.012;
      star(s.x, s.y, 3 * s.life + 1, Math.max(0, s.life));
    });
    stars = stars.filter(function (s) { return s.life > 0; });
    pen.globalCompositeOperation = "source-over";
    pen.globalAlpha = 1;

    // Done when the ring has faded and every speck and star is gone. Then the sheet is removed.
    // (At the latest after 8 seconds: on a slow or busy device the specks could take longer.)
    if ((seconds > 3.2 && specks.length === 0 && stars.length === 0) || seconds > 8) {
      stopRestoreSpell();
      return;
    }
    spellFrame = requestAnimationFrame(frame);
  }
  spellFrame = requestAnimationFrame(frame);
}
