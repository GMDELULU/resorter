// ReSorter: the ATTIC BOXES look (lesson 17).
// The same game: each bottle is drawn as an old wooden shelf, each layer as a painted, taped box.
// Moving boxes: they fly over in an arc, one after another (instead of a bottle tipping over).
// This file only draws; the rules stay in game.js. Colours come from the theme files.
// Note: index.html loads this file before draw.js; its functions use draw.js parts
// (like addSvgPart and bottleWidth), but only when they run, so the order is fine.

// ---------- Drawing one shelf ----------

// makeShelf(bottle, number) draws one shelf with its boxes (bottom to top).
function makeShelf(bottle, number) {
  const random = makeRandom(2000 + number * 7919);

  const picture = addSvgPart("svg", {
    class: isClosed(bottle) ? "bottle restored" : "bottle",
    viewBox: (-drawMargin) + " " + (-drawMargin) + " " + drawWidth + " " + drawHeight,
    width: drawWidth,
    height: drawHeight
  });

  // The shelving unit is only as tall as the boxes it can hold: a board under every box level
  // and a closed top board just above the highest box. (So it never looks as if more would fit.)
  const layerHeight = liquidHeight / capacity;
  const topBoard = bottleBottom - liquidHeight - 2;   // just above the highest box
  const shelfTop = topBoard - 6;                      // the top of the posts

  // A stencil: boxes and strokes stay inside the shelf.
  const stencilName = "shelf-stencil-" + number;
  const stencil = addSvgPart("clipPath", { id: stencilName }, picture);
  addSvgPart("rect", { x: 4, y: topBoard, width: bottleWidth - 8, height: bottleBottom - topBoard + 2 }, stencil);

  addLightPool(picture, number, random);   // the gold light on the ground (draw.js)

  const art = addSvgPart("g", { class: "bottle-art" }, picture);

  // The dark back wall of the shelf, and the two back posts (thin, further away).
  addSvgPart("rect", { class: "glass", x: 2, y: shelfTop, width: bottleWidth - 4, height: 208 - shelfTop - 2 }, art);
  [[7, 9], [bottleWidth - 9, bottleWidth - 7]].forEach(function (post) {
    const back = [[post[0], shelfTop - 3], [post[1], shelfTop - 3], [post[1], 204], [post[0], 204]];
    addSvgPart("polygon", { class: "shelf-wood shelf-back", points: pointsText(back) }, art);
  });

  // The top surface of every board under a box level: seen from a little above, the back edge
  // is narrower and higher than the front edge (perspective). The boxes stand in front of it.
  for (let level = 0; level < capacity; level++) {
    addBoardTop(art, bottleBottom - level * layerHeight, random);
  }

  const glassContent = addSvgPart("g", { class: "glass-content", "clip-path": "url(#" + stencilName + ")" }, art);

  // ---- The boxes ----
  let darkStrokes = "";
  let lightStrokes = "";
  bottle.forEach(function (colour, place) {
    // Every box place has its own dice, so a box keeps its look after a move.
    const boxRandom = makeRandom(6000 + number * 7919 + (place + 1) * 104729);
    const box = boxShape(place, layerHeight, boxRandom);

    addSvgPart("polygon", { class: "colour-" + colour, points: pointsText(box.corners) }, glassContent);
    addSvgPart("path", { class: "layer-line", d: pencilLine(box.corners, 0.3, boxRandom, true) }, glassContent);

    // Tape: a strip down the middle, and the flap line across the top.
    addSvgPart("path", {
      class: "box-tape",
      d: pencilLine([[box.middleX, box.top + 1], [box.middleX, box.top + 9]], 0.3, boxRandom, false)
    }, glassContent);
    addSvgPart("path", {
      class: "layer-line",
      d: pencilLine([[box.left + 2, box.top + 4], [box.right - 2, box.top + 4]], 0.4, boxRandom, false)
    }, glassContent);

    // Pencil hatching on the box, like on the liquid.
    for (let count = 0; count < 14; count++) {
      const length = 4 + boxRandom() * 5;
      const x = box.left + 2 + boxRandom() * (box.right - box.left - 6);
      const y = box.top + length + boxRandom() * (box.bottom - box.top - length);
      const stroke = "M" + round(x) + " " + round(y) + " l" + round(length * 0.38) + " " + round(-length * 0.92) + " ";
      if (boxRandom() < 0.6) {
        darkStrokes += stroke;
      } else {
        lightStrokes += stroke;
      }
    }
  });
  addSvgPart("path", { class: "hatch-dark", d: darkStrokes }, glassContent);
  addSvgPart("path", { class: "hatch-light", d: lightStrokes }, glassContent);

  addSymbols(glassContent, bottle);   // colour-blind symbols, if switched on (draw.js)

  // ---- In front of the boxes: the front edges of the boards, the closed top, the front posts ----
  for (let level = 0; level < capacity; level++) {
    addWood(art, boardFront(bottleBottom - level * layerHeight), random);
  }
  addWood(art, [[0, shelfTop], [4, shelfTop], [4, 208], [0, 208]], random);                         // left post
  addWood(art, [[bottleWidth - 4, shelfTop], [bottleWidth, shelfTop], [bottleWidth, 208], [bottleWidth - 4, 208]], random);   // right post

  // A sorted shelf gets its LID: the top board that closes it. An open shelf has no lid.
  // It has the class "stopper", so it drops on like a bottle's stopper (sparkle.js).
  if (isClosed(bottle)) {
    const lid = addSvgPart("g", { class: "stopper" }, art);
    addBoardTop(lid, topBoard, random);
    addWood(lid, boardFront(topBoard), random);
  }
  return picture;
}

// boardFront(y) gives the corners of the front edge of a board whose top is at height y.
function boardFront(y) {
  return [[2, y], [bottleWidth - 2, y], [bottleWidth - 2, y + 3], [2, y + 3]];
}

// addBoardTop(art, y, random) draws the top surface of a board, in perspective.
function addBoardTop(art, y, random) {
  addWood(art, [[2, y], [bottleWidth - 2, y], [bottleWidth - 8, y - 5], [8, y - 5]], random, "shelf-board");
}

// addWood(art, corners, random, extraClass) draws one wooden piece with a sketchy gold outline.
function addWood(art, corners, random, extraClass) {
  addSvgPart("polygon", { class: "shelf-wood " + (extraClass || ""), points: pointsText(corners) }, art);
  addSvgPart("path", { class: "outline", d: pencilLine(corners, 0.4, random, true) }, art);
}

// boxShape(place, layerHeight, random) gives the corners of one box: a little smaller than
// the space, a little off-centre and a little crooked, like real boxes on a shelf.
function boxShape(place, layerHeight, random) {
  const bottom = bottleBottom - place * layerHeight - 0.5;
  const top = bottom - layerHeight + 2;
  const width = bottleWidth - 16 + (random() - 0.5) * 6;
  const middleX = bottleWidth / 2 + (random() - 0.5) * 4;
  const left = middleX - width / 2;
  const right = middleX + width / 2;
  const tilt = (random() - 0.5) * 2;   // the top edge is a bit higher on one side
  return {
    corners: [[left, bottom], [right, bottom], [right, top - tilt], [left, top + tilt]],
    left: left, right: right, top: top, bottom: bottom, middleX: middleX
  };
}

// ---------- Moving boxes: they fly over in an arc ----------

// playBoxMove(info) shows a move in the attic look. "info" is lastPour from game.js.
async function playBoxMove(info) {
  busyBottles.add(info.from);
  busyBottles.add(info.to);
  const buttons = document.querySelectorAll(".bottle-button");
  const source = buttons[info.from];
  const target = buttons[info.to];
  const flying = addSvgPart("g", {}, pourLayer);   // the flying boxes (pour.js's layer)
  try {
    source.classList.remove("selected");
    // The source shelf shows its new state at once: the moving boxes have left it.
    source.replaceChildren(makeBottle(bottles[info.from], info.from));
    source.dataset.layers = bottles[info.from].join(",");

    const s = source.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const size = s.height / drawHeight;
    const layerHeight = liquidHeight / capacity;
    const moved = bottles[info.to].length - info.layersBefore;
    const sourceCountBefore = bottles[info.from].length + moved;

    // One flying box for every moved layer. The top box goes first and lands lowest.
    const boxes = [];
    for (let k = 0; k < moved; k++) {
      const fromPlace = sourceCountBefore - 1 - k;
      const toPlace = info.layersBefore + k;
      boxes.push({
        fromY: s.top + (drawMargin + bottleBottom - (fromPlace + 1) * layerHeight) * size,
        toY: t.top + (drawMargin + bottleBottom - (toPlace + 1) * layerHeight) * size,
        fromX: s.left + (drawMargin + 8) * size,
        toX: t.left + (drawMargin + 8) * size,
        rect: addSvgPart("rect", {
          class: "colour-" + info.colour + " flying-box",
          width: (bottleWidth - 16) * size,
          height: (layerHeight - 2) * size
        }, flying)
      });
    }

    const flyTime = 550 * pourSpeed;     // how long one box flies (pour.js's speed setting)
    const gap = 110 * pourSpeed;         // the next box leaves a little later
    const arc = 70 * size;

    // The final box of a shelf that becomes sorted does not glide in: it flies to a point
    // above the shelf, then DROPS in (slow start, hard landing), like Ja's example animation (a box dropping into a closet).
    const dropping = info.closes;
    const dropHeight = 110 * size;       // how high above its place the final box starts falling
    const fallTime = 320 * pourSpeed;
    const flightsEnd = flyTime + gap * (moved - 1);
    const total = flightsEnd + (dropping ? fallTime : 0);
    const lastBox = boxes[moved - 1];

    await new Promise(function (finished) {
      const startTime = performance.now();
      function frame(now) {
        const time = Math.max(0, now - startTime);
        boxes.forEach(function (box, k) {
          const isFinal = dropping && box === lastBox;
          // The final box flies to the point above its place; the others straight to their place.
          const goalY = isFinal ? box.toY - dropHeight : box.toY;
          const e = slowFastSlow(Math.min(1, Math.max(0, (time - k * gap) / flyTime)));
          let x = between(box.fromX, box.toX, e);
          let y = between(box.fromY, goalY, e) - Math.sin(e * Math.PI) * arc;   // the arc
          if (isFinal && time > flightsEnd) {
            // The fall: it speeds up all the way down (f x f x f), so it lands with a thud.
            const f = Math.min(1, (time - flightsEnd) / fallTime);
            x = box.toX;
            y = goalY + (box.toY - goalY) * f * f * f;
          }
          box.rect.setAttribute("x", x);
          box.rect.setAttribute("y", y);
        });
        if (time < total) {
          requestAnimationFrame(safeFrame);
        } else {
          finished();
        }
      }
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

    // The landing (only for the final box of a sorted shelf): squash, thud, dust.
    if (dropping) {
      await boxLanding(lastBox, target, size);
    }
  } catch (problem) {
    console.error(problem);
  } finally {
    flying.remove();
    busyBottles.delete(info.from);
    busyBottles.delete(info.to);
    updateScreen();
    announcePour(info);
    if (info.closes && !wantsLessMotion()) {
      dropStopper(target);
    }
  }
}

// ---------- The landing of the final box (based on Ja's example of a box dropping into a closet) ----------

// boxLanding(box, shelf, size) plays the landing of the final box on a shelf:
//   1. the box squashes and springs back;
//   2. the shelf gives a short thud: a little wobble that dies down;
//   3. the boxes below are pressed together for a moment (the top one first);
//   4. dust puffs out at both corners: short light strokes (no dots, see the style guide).
// It gives back a promise that is kept when the squash is finished.
function boxLanding(box, shelf, size) {
  // 1. Squash and spring back, from the bottom of the box.
  box.rect.style.transformBox = "fill-box";
  box.rect.style.transformOrigin = "50% 100%";
  const squash = box.rect.animate([
    { transform: "scale(1, 1)" },
    { transform: "scale(1.12, 0.8)" },
    { transform: "scale(0.96, 1.06)" },
    { transform: "scale(1, 1)" }
  ], { duration: 350, easing: "ease-out" });

  // 2. The thud: the whole shelf wobbles a little.
  shelf.animate([
    { transform: "translate(0px, 0px)" },
    { transform: "translate(-6px, 4px) rotate(-1deg)" },
    { transform: "translate(5px, -2px) rotate(0.8deg)" },
    { transform: "translate(-3px, 1px) rotate(-0.4deg)" },
    { transform: "translate(2px, 0px) rotate(0.2deg)" },
    { transform: "translate(0px, 0px)" }
  ], { duration: 450, easing: "ease-out" });

  // 3. The boxes below are pressed together for a moment, top one first.
  const boxesBelow = shelf.querySelectorAll(".glass-content polygon");
  const count = boxesBelow.length;
  boxesBelow.forEach(function (lower, i) {
    lower.style.transformBox = "fill-box";
    lower.style.transformOrigin = "50% 100%";
    lower.animate([
      { transform: "scaleY(1)" }, { transform: "scaleY(0.93)" }, { transform: "scaleY(1)" }
    ], { duration: 250, delay: (count - 1 - i) * 40, easing: "ease-out" });
  });

  // 4. Dust at both top corners of the box: short light strokes that fly out and fade.
  const left = parseFloat(box.rect.getAttribute("x"));
  const top = parseFloat(box.rect.getAttribute("y"));
  const width = parseFloat(box.rect.getAttribute("width"));
  const dustColour = themeColour("--ripple-glow");
  for (let i = 0; i < 10; i++) {
    const side = (i % 2 === 1) ? 1 : -1;
    const startX = (side > 0) ? left + width : left;
    const puff = addSvgPart("line", {
      class: "spark",
      x1: startX, y1: top, x2: startX + side * 3 * size, y2: top - 2 * size,
      stroke: dustColour, "stroke-width": 2 * size
    }, pourLayer);
    const moveX = side * (20 + Math.random() * 30) * size;
    const moveY = -(10 + Math.random() * 20) * size;
    puff.animate([
      { transform: "translate(0px, 0px)", opacity: 0.9 },
      { transform: "translate(" + moveX + "px, " + moveY + "px)", opacity: 0 }
    ], { duration: 500 + Math.random() * 200, easing: "ease-out" }).finished.then(function () {
      puff.remove();
    }, function () {
      puff.remove();
    });
  }

  return squash.finished.catch(function () {});   // (also fine if the squash was stopped)
}
