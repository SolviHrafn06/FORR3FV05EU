"use strict";

const $ = (id) => document.getElementById(id);
const canvas = $("drawing");
const ctx = canvas.getContext("2d");
const playground = $("playground");
const colors = ["#197962", "#d75437", "#5468c9", "#ad418c", "#b77b08"];

// Sérhver fingur hefur eigið pointerId. Map geymir stöðu hvers bendils.
const drawingPointers = new Map();
const gesturePointers = new Map();
let colorIndex = 0;
let pose = { x: 0, y: 0, scale: 1, angle: 0 };
let baseline = null;
let lastTap = null;
let longPressTimer;

$("support").textContent = "PointerEvent" in window
  ? `Pointer Events tilbúin · Tækið tilkynnir ${navigator.maxTouchPoints || 0} snertipunkta`
  : "Þessi vafri styður ekki Pointer Events. Prófaðu nýrri vafra.";

function log(message) {
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString("is-IS")}  ${message}`;
  $("log").prepend(li);
  while ($("log").children.length > 12) $("log").lastChild.remove();
}

function report(message) {
  $("gesture").textContent = message;
  log(message);
}

// client-hnit mínus staðsetning flatar gefa staðbundin hnit í CSS-pixlum.
function localPoint(event, surface) {
  const rect = surface.getBoundingClientRect();
  return { x: event.clientX - rect.left - surface.clientLeft,
    y: event.clientY - rect.top - surface.clientTop };
}

function inspect(event, surface) {
  const point = localPoint(event, surface);
  const pair = (x, y) => `${Math.round(x)} / ${Math.round(y)}`;
  $("device").textContent = `${event.pointerType} / ${event.pointerId}`;
  $("count").textContent = drawingPointers.size + gesturePointers.size;
  $("client").textContent = pair(event.clientX, event.clientY);
  $("page").textContent = pair(event.pageX, event.pageY);
  $("offset").textContent = pair(event.offsetX, event.offsetY);
  $("screen").textContent = pair(event.screenX, event.screenY);
  $("local").textContent = pair(point.x, point.y);
  $("pressure").textContent = `${event.pressure.toFixed(2)} / ${event.isPrimary}`;
}

// Stækka innri upplausn canvas fyrir skarpa teikningu á háupplausnarskjám.
function resizeCanvas() {
  const snapshot = document.createElement("canvas");
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  snapshot.getContext("2d").drawImage(canvas, 0, 0);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientHeight * ratio);
  ctx.drawImage(snapshot, 0, 0, canvas.width, canvas.height);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}
new ResizeObserver(resizeCanvas).observe(canvas);

function draw(event, previous) {
  const point = localPoint(event, canvas);
  const width = event.pointerType === "pen" ? 2 + event.pressure * 16 : 5;
  ctx.strokeStyle = previous.color;
  ctx.fillStyle = previous.color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(previous.x, previous.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(point.x, point.y, width / 2, 0, Math.PI * 2);
  ctx.fill();
  Object.assign(previous, point);
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  // Heldur áfram að senda viðburði hingað þó fingur/mús fari út fyrir flötinn.
  canvas.setPointerCapture(event.pointerId);
  const point = { ...localPoint(event, canvas), color: colors[colorIndex++ % colors.length] };
  drawingPointers.set(event.pointerId, point);
  draw(event, point);
});
canvas.addEventListener("pointermove", (event) => {
  const point = drawingPointers.get(event.pointerId);
  if (point) draw(event, point);
});
function finishDrawing(event) {
  const point = drawingPointers.get(event.pointerId);
  if (point && event.type === "pointerup") draw(event, point);
  drawingPointers.delete(event.pointerId);
}
canvas.addEventListener("pointerup", finishDrawing);
canvas.addEventListener("pointercancel", finishDrawing);
canvas.addEventListener("lostpointercapture", finishDrawing);
$("clear").addEventListener("click", () => ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight));

function renderPose() {
  // Takmarka færslu svo hluturinn týnist ekki utan flatarins.
  const limitX = playground.clientWidth / 2 - 30;
  const limitY = playground.clientHeight / 2 - 30;
  pose.x = Math.max(-limitX, Math.min(limitX, pose.x));
  pose.y = Math.max(-limitY, Math.min(limitY, pose.y));
  pose.scale = Math.max(0.4, Math.min(2.5, pose.scale));
  $("tile").style.transform = `translate(${pose.x}px, ${pose.y}px) rotate(${pose.angle}deg) scale(${pose.scale})`;
  $("transform").textContent = `${Math.round(pose.scale * 100)}% · ${Math.round(pose.angle)}°`;
}

function geometry(points) {
  const [a, b] = points;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
}

// Ný viðmið þegar fingur bætist við eða fer af: hluturinn hoppar ekki.
function rebase() {
  const points = [...gesturePointers.values()];
  baseline = points.length ? { ...pose, points: points.map(p => ({ x: p.x, y: p.y })) } : null;
}

playground.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  playground.setPointerCapture(event.pointerId);
  const point = localPoint(event, playground);
  gesturePointers.set(event.pointerId, {
    ...point, startX: point.x, startY: point.y, started: performance.now(),
    moved: false, multi: gesturePointers.size > 0, held: false
  });
  clearTimeout(longPressTimer);
  if (gesturePointers.size > 1) {
    gesturePointers.forEach(p => p.multi = true);
    lastTap = null;
  } else {
    longPressTimer = setTimeout(() => {
      const current = gesturePointers.get(event.pointerId);
      if (current && !current.moved && !current.multi) {
        current.held = true;
        lastTap = null;
        report("Langt ýt · long press (600 ms)");
      }
    }, 600);
  }
  rebase();
});

playground.addEventListener("pointermove", (event) => {
  const point = gesturePointers.get(event.pointerId);
  if (!point) return;
  Object.assign(point, localPoint(event, playground));
  if (Math.hypot(point.x - point.startX, point.y - point.startY) > 10) {
    point.moved = true;
    clearTimeout(longPressTimer);
  }
  const points = [...gesturePointers.values()];
  if (points.length === 1) {
    pose.x = baseline.x + point.x - baseline.points[0].x;
    pose.y = baseline.y + point.y - baseline.points[0].y;
    if (point.moved) $("gesture").textContent = "Dregið · drag";
  } else {
    const start = geometry(baseline.points);
    const now = geometry(points);
    pose.x = baseline.x + now.x - start.x;
    pose.y = baseline.y + now.y - start.y;
    pose.scale = baseline.scale * now.distance / Math.max(1, start.distance);
    const delta = ((now.angle - start.angle + 540) % 360) - 180;
    pose.angle = baseline.angle + delta;
    $("gesture").textContent = "Tveir fingur · pinch / rotate";
  }
  renderPose();
});

function finishGesture(event) {
  const point = gesturePointers.get(event.pointerId);
  if (!point) return;
  clearTimeout(longPressTimer);
  if (event.type === "pointerup" && !point.multi && !point.held) {
    const end = localPoint(event, playground);
    const dx = end.x - point.startX;
    const dy = end.y - point.startY;
    const distance = Math.hypot(dx, dy);
    const elapsed = performance.now() - point.started;
    if (distance >= 70 && elapsed < 500) {
      const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "hægri" : "vinstri") : (dy > 0 ? "niður" : "upp");
      report(`Swipe ${direction} · ${Math.round(distance)} px á ${Math.round(elapsed)} ms`);
      lastTap = null;
    } else if (!point.moved && distance <= 10) {
      const now = performance.now();
      if (lastTap && now - lastTap.time < 350 && Math.hypot(end.x - lastTap.x, end.y - lastTap.y) < 30) {
        report("Tvíýtt · double tap");
        lastTap = null;
      } else {
        report("Stutt ýt · tap");
        lastTap = { ...end, time: now };
      }
    } else {
      report("Drætti lokið · drag end");
      lastTap = null;
    }
  }
  gesturePointers.delete(event.pointerId);
  rebase();
}
playground.addEventListener("pointerup", finishGesture);
playground.addEventListener("pointercancel", finishGesture);
playground.addEventListener("lostpointercapture", finishGesture);

// Sameiginleg skoðun keyrir á eftir sérhæfðum hlusturum svo talning sé rétt.
for (const surface of [canvas, playground]) {
  for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture", "pointerenter", "pointerleave"]) {
    surface.addEventListener(type, (event) => {
      inspect(event, surface);
      if (type !== "pointermove") log(`${surface === canvas ? "teikning" : "hreyfingar"} · ${type} · id ${event.pointerId}`);
    });
  }
  surface.addEventListener("contextmenu", (event) => event.preventDefault());
}

$("reset").addEventListener("click", () => {
  pose = { x: 0, y: 0, scale: 1, angle: 0 };
  lastTap = null;
  renderPose();
  rebase();
  report("Hlutur endurstilltur");
});
$("smaller").addEventListener("click", () => { pose.scale /= 1.2; renderPose(); rebase(); });
$("larger").addEventListener("click", () => { pose.scale *= 1.2; renderPose(); rebase(); });
$("rotate").addEventListener("click", () => { pose.angle += 15; renderPose(); rebase(); });
$("clear-log").addEventListener("click", () => $("log").replaceChildren());
window.addEventListener("resize", renderPose);
renderPose();
log("Tilbúið. Prófaðu að teikna eða snerta hreyfiflötinn.");
