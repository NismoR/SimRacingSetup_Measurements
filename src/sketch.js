// This sketch was created quickly with ChatGPT to solve a specific problem.
// Code might not be fully optimized or idiomatic.

const TARGET_IMG_WIDTH = 1400;  // desired image (and canvas) width

let img;
let lines = [];
let currentLine = [];
let angleResults = [];
let angleData = [];      // stores intersection + arc start/end
let uploadButton;
let draggingPoint = null;
let dragOffset;
let opacitySlider;
let bgColorSelect;
let bgColor = [220, 220, 220];
let resetLinesButton;

// New: save/load UI
let saveLinesButton;
let loadLinesButton;
let loadLinesInput;  // hidden file input used by Load button

// These track the actual drawing size of the image/canvas
let displayWidth = TARGET_IMG_WIDTH;
let displayHeight = 600;   // temporary default before image load

function preload() {
  // Load default image; aspect ratio handling is done later
  img = loadImage('sim_setup.png', () => {}, () => { img = null; });
}

function setup() {
  createCanvas(displayWidth, displayHeight);
  background(220);

  uploadButton = createFileInput(handleFile);
  uploadButton.position(40, height + 60);

  opacitySlider = createSlider(0, 255, 255, 1);
  opacitySlider.position(250, height + 60);
  opacitySlider.style('width', '120px');
  opacitySlider.value(200);

  bgColorSelect = createSelect();
  bgColorSelect.position(400, height + 60);
  bgColorSelect.option('Gray');
  bgColorSelect.option('White');
  bgColorSelect.option('Black');
  bgColorSelect.changed(() => {
    updateBgColor(bgColorSelect.value());
  });
  bgColorSelect.value('Black');
  updateBgColor(bgColorSelect.value());   // manually apply effect

  resetLinesButton = createButton('Reset Lines');
  resetLinesButton.position(550, height + 60);
  resetLinesButton.mousePressed(resetLines);

  // New: Save button
  saveLinesButton = createButton('Save Lines');
  saveLinesButton.position(680, height + 60);
  saveLinesButton.mousePressed(saveLinesToFile);

  // New: Load button + hidden file input
  loadLinesInput = createFileInput(handleConfigFile);
  loadLinesInput.hide(); // we'll trigger it from the button

  loadLinesButton = createButton('Load Lines');
  loadLinesButton.position(780, height + 60);
  loadLinesButton.mousePressed(() => {
    // Programmatically open the hidden file input
    loadLinesInput.elt.click();
  });

  // After everything is created, adjust canvas size to image aspect ratio
  updateCanvasForImage();
}

function handleFile(file) {
  if (file.type === 'image') {
    loadImage(
      file.data,
      (loadedImg) => {
        img = loadedImg;
        updateCanvasForImage();
      },
      () => { img = null; }
    );
  }
}

// Adjust canvas + image draw size to keep aspect ratio with fixed width
function updateCanvasForImage() {
  if (!img) return;

  let scale = TARGET_IMG_WIDTH / img.width;
  displayWidth = TARGET_IMG_WIDTH;
  displayHeight = img.height * scale;

  resizeCanvas(displayWidth, displayHeight);

  // Reposition UI according to new canvas height
  if (uploadButton) uploadButton.position(40, displayHeight + 60);
  if (opacitySlider) opacitySlider.position(250, displayHeight + 60);
  if (bgColorSelect) bgColorSelect.position(400, displayHeight + 60);
  if (resetLinesButton) resetLinesButton.position(550, displayHeight + 60);
  if (saveLinesButton) saveLinesButton.position(680, displayHeight + 60);
  if (loadLinesButton) loadLinesButton.position(780, displayHeight + 60);
}

function draw() {
  background(bgColor);
  if (img) {
    tint(255, opacitySlider.value());
    // Draw the image with fixed width and aspect-correct height
    image(img, 0, 0, displayWidth, displayHeight);
    noTint();
  }

  // Draw all lines
  strokeWeight(3);
  stroke(255, 0, 0);
  for (let l of lines) {
    line(l[0].x, l[0].y, l[1].x, l[1].y);
  }

  // Draw current line (if one point selected)
  if (currentLine.length === 1) {
    stroke(0, 255, 0);
    line(currentLine[0].x, currentLine[0].y, mouseX, mouseY);
  }

  // Draw points
  strokeWeight(8);
  stroke(0, 0, 255);
  for (let lineSeg of lines) {
    point(lineSeg[0].x, lineSeg[0].y);
    point(lineSeg[1].x, lineSeg[1].y);
  }
  if (currentLine.length === 1) {
    point(currentLine[0].x, currentLine[0].y);
  }

  // Colors for arcs / angle text backgrounds
  let arcColors = [
    color(255, 100, 100, 180),
    color(100, 255, 100, 180),
    color(100, 100, 255, 180),
    color(255, 255, 100, 180),
    color(255, 100, 255, 180),
    color(100, 255, 255, 180),
    color(200, 200, 200, 180)
  ];

  // Draw arcs and angle labels
  let yOffset = 20;
  for (let i = 0; i < angleResults.length; i++) {
    let angle = angleResults[i];
    let info = angleData[i];

    // If there was no valid intersection for this pair, skip it
    if (angle == null || info == null) continue;

    let intersection = info.intersection;

    // Draw arc
    fill(arcColors[i % arcColors.length]);
    stroke(arcColors[i % arcColors.length]);
    strokeWeight(5);
    arc(
      intersection.x,
      intersection.y,
      40,
      40,
      info.startAngle,
      info.endAngle,
      PIE
    );

    // Plot intersection point in yellow
    noStroke();
    fill(255, 255, 0);
    ellipse(intersection.x, intersection.y, 12, 12);

    // Angle text background
    fill(arcColors[i % arcColors.length]);
    rect(5, yOffset - 16, 180, 22, 6);

    // Angle text (angle is in 0..PI, so degrees are 0..180)
    fill(0);
    textSize(16);
    text('Angle ' + (i + 1) + ': ' + nf(degrees(angle), 1, 2) + '°', 10, yOffset);
    yOffset += 28;
  }
}

function updateBgColor(val) {
  if (val === 'Gray') bgColor = [220, 220, 220];
  else if (val === 'White') bgColor = [255, 255, 255];
  else if (val === 'Black') bgColor = [0, 0, 0];
}

function mousePressed() {
  if (mouseY > height) return;

  // Try to start dragging an existing point
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    for (let ptIdx = 0; ptIdx < 2; ptIdx++) {
      let pt = lines[lineIdx][ptIdx];
      if (dist(mouseX, mouseY, pt.x, pt.y) < 10) {
        draggingPoint = { lineIdx, ptIdx };
        dragOffset = createVector(mouseX - pt.x, mouseY - pt.y);
        return;
      }
    }
  }

  // Otherwise, add new points for a line
  let pt = createVector(mouseX, mouseY);
  currentLine.push(pt);
  if (currentLine.length === 2) {
    lines.push([currentLine[0], currentLine[1]]);
    currentLine = [];
    calculateAngles();
  }
}

function mouseDragged() {
  if (draggingPoint) {
    let { lineIdx, ptIdx } = draggingPoint;
    let pt = lines[lineIdx][ptIdx];
    pt.x = mouseX - dragOffset.x;
    pt.y = mouseY - dragOffset.y;
    calculateAngles();
  }
}

function mouseReleased() {
  draggingPoint = null;
}

// Cross product (2D scalar)
function cross2D(a, b) {
  return a.x * b.y - a.y * b.x;
}

// Line segment intersection between l1 and l2
// Returns { point: p5.Vector, t, u } or null if no segment intersection
function lineSegmentIntersection(l1, l2) {
  let p = l1[0].copy();
  let r = p5.Vector.sub(l1[1], l1[0]);
  let q = l2[0].copy();
  let s = p5.Vector.sub(l2[1], l2[0]);

  let rxs = cross2D(r, s);
  let q_p = p5.Vector.sub(q, p);
  let q_pxr = cross2D(q_p, r);

  const EPS = 1e-6;

  if (abs(rxs) < EPS) {
    // Parallel or collinear – treat as no single intersection for this use case
    return null;
  }

  let t = cross2D(q_p, s) / rxs;
  let u = q_pxr / rxs;

  // Check if intersection is within both segments
  if (t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS) {
    let intersectionPoint = p5.Vector.add(p, p5.Vector.mult(r, t));
    return { point: intersectionPoint, t: t, u: u };
  } else {
    return null;
  }
}

function calculateAngles() {
  angleResults = [];
  angleData = [];

  for (let i = 0; i < lines.length - 1; i++) {
    let l1 = lines[i];
    let l2 = lines[i + 1];

    // Compute segment–segment intersection
    let inter = lineSegmentIntersection(l1, l2);

    if (!inter) {
      angleResults.push(null);
      angleData.push(null);
      continue;
    }

    let intersection = inter.point;
    let t = inter.t;
    let u = inter.u;

    // Choose endpoints on each line away from the intersection
    // (for nicer, longer rays)
    let p1 = (t < 0.5) ? l1[0] : l1[1];
    let p2 = (u < 0.5) ? l2[0] : l2[1];

    // Vectors from the intersection
    let v1 = p5.Vector.sub(p1, intersection);
    let v2 = p5.Vector.sub(p2, intersection);

    // 1) Angle between the two vectors (0..PI)
    let angle = v1.angleBetween(v2);
    angleResults.push(angle);

    // 2) Directions (headings) for arc drawing (each in -PI..PI)
    let a1 = v1.heading();
    let a2 = v2.heading();

    // Compute shortest signed angle difference from a1 to a2: diff in (-PI..PI]
    let diff = a2 - a1;
    while (diff > PI)  diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;

    // We want the arc to span exactly |diff| (which ≈ angle),
    // but p5 always draws arc from smaller angle to larger angle in positive direction.
    let a2Adjusted = a1 + diff;   // a2, shifted so that the shortest path is from a1 to a2Adjusted
    let start = min(a1, a2Adjusted);
    let end   = max(a1, a2Adjusted);

    angleData.push({
      intersection: intersection,
      startAngle: start,
      endAngle: end
    });
  }
}

function resetLines() {
  lines = [];
  currentLine = [];
  angleResults = [];
  angleData = [];
}

// ===== NEW: Save / Load configuration of lines =====

function saveLinesToFile() {
  // Serialize lines as plain x/y coordinates
  let data = lines.map(seg => seg.map(pt => ({ x: pt.x, y: pt.y })));
  saveJSON(data, 'lines_config.json');
}

function handleConfigFile(file) {
  if (!file || !file.data) return;

  try {
    // file.data is usually a string here
    let parsed = (typeof file.data === 'string') ? JSON.parse(file.data) : file.data;

    // Expecting an array of segments, each segment is [ {x,y}, {x,y} ]
    lines = parsed.map(seg =>
      seg.map(pt => createVector(pt.x, pt.y))
    );

    // Recalculate angles for loaded lines
    calculateAngles();
  } catch (e) {
    console.error('Failed to load lines config:', e);
  }
}
