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

  // A stencil: boxes and strokes stay inside the shelf.
  const stencilName = "shelf-stencil-" + number;
  const stencil = addSvgPart("clipPath", { id: stencilName }, picture);
  addSvgPart("rect", { x: 4, y: 6, width: bottleWidth - 8, height: 198 }, stencil);

  addLightPool(picture, number, random);   // the gold light on the ground (draw.js)

  const art = addSvgPart("g", { class: "bottle-art" }, picture);

  // The dark back wall of the shelf.
  addSvgPart("rect", { class: "glass", x: 2, y: 2, width: bottleWidth - 4, height: 204 }, art);

  const glassContent = addSvgPart("g", { class: "glass-content", "clip-path": "url(#" + stencilName + ")" }, art);

  // ---- The boxes ----
  const layerHeight = liquidHeight / capacity;
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

  // ---- The shelf: two posts and two boards, in sketchy double lines ----
  const wood = [
    [[0, 0], [5, 0], [5, 208], [0, 208]],                                       // left post
    [[bottleWidth - 5, 0], [bottleWidth, 0], [bottleWidth, 208], [bottleWidth - 5, 208]],   // right post
    [[0, 0], [bottleWidth, 0], [bottleWidth, 5], [0, 5]],                       // top board
    [[0, 203], [bottleWidth, 203], [bottleWidth, 208], [0, 208]]                // bottom board
  ];
  wood.forEach(function (piece) {
    addSvgPart("polygon", { class: "shelf-wood", points: pointsText(piece) }, art);
    addSvgPart("path", { class: "outline", d: pencilLine(piece, 0.5, random, true) }, art);
  });

  if (isClosed(bottle)) {
    addStopper(art, random);   // the gold gem on top: this shelf is sorted and closed (draw.js)
  }
  return picture;
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
    const total = flyTime + gap * (moved - 1);

    await new Promise(function (finished) {
      const startTime = performance.now();
      function frame(now) {
        const time = Math.max(0, now - startTime);
        boxes.forEach(function (box, k) {
          const e = slowFastSlow(Math.min(1, Math.max(0, (time - k * gap) / flyTime)));
          const x = between(box.fromX, box.toX, e);
          const y = between(box.fromY, box.toY, e) - Math.sin(e * Math.PI) * arc;   // the arc
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
