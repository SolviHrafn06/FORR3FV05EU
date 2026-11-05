// =============================================================
//  main.js – Leikurinn sjálfur: uppsetning, borð og leikreglur
// -------------------------------------------------------------
//  Flæðið:
//   1. layout()      reiknar viewBox og staðsetningar eftir skjástærð
//   2. buildLevel()  býr til mót (holes) og púslbita (pieces) í SVG
//   3. intro()       Timeline: útlínur teiknast, bitar skoppa inn
//   4. Barnið spilar – input.js kallar á handlers hér fyrir neðan
//   5. levelComplete() Timeline: fögnuður, svo örin og stroka (swipe)
//   6. nextLevel()   borðið rennur út og nýtt borð rennur inn
// =============================================================

import { PIECES, LEVELS } from './levels.js';
import * as fx from './fx.js';
import { animate, createTimeline, stagger, svg, utils } from './fx.js';
import { setupInput } from './input.js';
import { sound, unlockAudio } from './sound.js';

const $ = (s) => document.querySelector(s);
const svgEl = $('#game');
const holesLayer = $('#holes');
const piecesLayer = $('#layer-pieces');

const BASE_LIFT = 8;     // hve hátt bitinn "liggur" á borðinu (lengd skuggans)
const HELD_LIFT = 30;    // hve hátt bitinn lyftist þegar haldið er á honum
const HELD_SCALE = 1.12; // bitinn stækkar aðeins þegar honum er lyft

/** Allt ástand leiksins á einum stað */
const game = {
  level: 0,
  mode: 'intro',          // 'intro' | 'play' | 'complete' | 'transition'
  pieces: [],             // púslbitar í núverandi borði
  holes: new Map(),       // id → mót
  placedCount: 0,
  scale: 1,               // stærð bita miðað við skjá
  L: null,                // niðurstöður layout()
  held: new Set(),        // bitar sem fingur heldur á núna
  pressRings: new Map(),  // piece → hringurinn sem fyllist við long press
  grabOffset: new Map(),  // piece → bil frá fingri að miðju bitans
  idleTimer: null,
  firstHintDone: false,
  rotHintPiece: null,
};

// =============================================================
//  LAYOUT – passar fyrir síma og spjaldtölvur, upprétt og á hlið
// =============================================================

/** Raðar n hlutum í rist innan í rétthyrningi þannig að hver reitur verði sem stærstur */
function grid(rect, n, pad = 20) {
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (rect.w - 2 * pad) / cols;
    const ch = (rect.h - 2 * pad) / rows;
    const cell = Math.min(cw, ch);
    if (!best || cell > best.cell) best = { cols, rows, cw, ch, cell };
  }
  const { cols, rows, cw, ch } = best;
  const pos = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = row === rows - 1 ? n - (rows - 1) * cols : cols;
    pos.push({
      x: rect.x + pad + (rect.w - 2 * pad - inRow * cw) / 2 + (col + 0.5) * cw,
      y: rect.y + pad + (rect.h - 2 * pad - rows * ch) / 2 + (row + 0.5) * ch,
    });
  }
  return { pos, cell: best.cell };
}

function setRect(sel, r) {
  const e = typeof sel === 'string' ? $(sel) : sel;
  e.setAttribute('x', r.x); e.setAttribute('y', r.y);
  e.setAttribute('width', r.w); e.setAttribute('height', r.h);
}

function layout() {
  const cw = svgEl.clientWidth || innerWidth;
  const ch = svgEl.clientHeight || innerHeight;
  const aspect = cw / ch;
  const landscape = aspect >= 1;

  // Styttri hliðin er alltaf 1000 einingar – hin lagar sig að skjánum
  let W, H;
  if (landscape) { H = 1000; W = Math.round(1000 * Math.min(aspect, 2.4)); }
  else { W = 1000; H = Math.round(1000 / Math.max(aspect, 1 / 2.4)); }
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const m = 30;        // spássía
  const top = 150;     // efsta röndin er himinn (lás, ský, sól)
  let board, tray;
  if (landscape) {
    const bw = (W - 3 * m) * 0.58;
    board = { x: m, y: top, w: bw, h: H - top - m };
    tray = { x: 2 * m + bw, y: top, w: W - 3 * m - bw, h: H - top - m };
  } else {
    const bh = (H - top - 3 * m) * 0.52;
    board = { x: m, y: top, w: W - 2 * m, h: bh };
    tray = { x: m, y: top + bh + m, w: W - 2 * m, h: H - top - bh - 2 * m };
  }

  // Bakgrunnur
  setRect('#sky', { x: 0, y: 0, w: W, h: H });
  $('#hills').setAttribute('d',
    `M0 ${top + 20} Q${W * 0.22} ${top - 60} ${W * 0.48} ${top + 10} T${W} ${top - 10} V${H} H0 Z`);
  $('#hills-front').setAttribute('d',
    `M0 ${top + 90} Q${W * 0.3} ${top + 30} ${W * 0.62} ${top + 80} T${W} ${top + 60} V${H} H0 Z`);
  $('#sun').setAttribute('transform', `translate(${W - 90} 82)`);
  $('#cloud').setAttribute('transform', `translate(${W * 0.5} 72)`);
  $('#lock').setAttribute('transform', 'translate(78 78)');

  // Viðarborðið
  for (const id of ['#board', '#board-light', '#board-edge', '#board-clip-rect']) setRect(id, board);
  setRect('#board-shadow', { ...board, x: board.x + 8, y: board.y + 12 });
  drawGrain(board);

  // Örin birtist á miðju borðinu
  $('#next').setAttribute('transform', `translate(${board.x + board.w / 2} ${board.y + board.h / 2})`);

  // Ferillinn sem býflugan flýgur eftir: kemur inn vinstra megin, tekur lykkju og fer út hægra megin
  const px = W * 0.5, py = H * 0.5, R = Math.min(W, H) * 0.14;
  $('#bee-path').setAttribute('d',
    `M-80 ${H * 0.7} C${W * 0.15} ${H * 0.3} ${W * 0.35} ${py} ${px} ${py} ` +
    `A${R} ${R} 0 1 0 ${px} ${py - 2 * R} A${R} ${R} 0 1 0 ${px} ${py} ` +
    `C${W * 0.65} ${py} ${W * 0.8} ${H * 0.2} ${W + 80} ${H * 0.3}`);

  // Mót og bitar
  const n = game.pieces.length || 1;
  const holeGrid = grid(board, n, 30);
  const trayGrid = grid(tray, n, 10);
  game.scale = Math.min(Math.min(holeGrid.cell * 0.8, trayGrid.cell * 0.84) / 150, 2.2);
  game.L = { W, H, board, tray, landscape, holeGrid, trayGrid };
}

/** Viðaræðar á borðinu – bylgjulínur */
function drawGrain(b) {
  const g = $('#board-grain');
  g.innerHTML = '';
  const lines = 14;
  for (let i = 0; i < lines; i++) {
    const y = b.y + ((i + 0.5) / lines) * b.h;
    const amp = 10 + (i % 3) * 6;
    const seg = b.w / 4;
    fx.el('path', {
      d: `M${b.x - 20} ${y} q${seg / 2} ${-amp} ${seg} 0 t${seg} 0 t${seg} 0 t${seg} 0 t${seg} 0`,
    }, g);
  }
}

/** Setur mót og bita á réttan stað eftir layout (t.d. þegar síma er snúið) */
function applyLayout(instant = true) {
  const { holeGrid, trayGrid } = game.L;
  game.pieces.forEach((p, i) => {
    const h = game.holes.get(p.id);
    h.x = holeGrid.pos[i].x;
    h.y = holeGrid.pos[i].y;
    h.g.setAttribute('transform', `translate(${h.x} ${h.y}) scale(${game.scale})`);

    const slot = trayGrid.pos[p.trayIndex];
    p.home = {
      x: slot.x + p.jitter.x * trayGrid.cell,
      y: slot.y + p.jitter.y * trayGrid.cell,
    };
    if (!instant || game.held.has(p)) return;
    const s = p.state;
    if (p.placed) { s.x = h.x; s.y = h.y; }
    else { s.x = p.home.x; s.y = p.home.y; }
    if (s.scale > 0) s.scale = game.scale;
    render(p);
  });
}

// =============================================================
//  BÚA TIL MÓT OG PÚSLBITA (SVG í DOM)
// =============================================================

/** Dekkir eða lýsir lit (#rrggbb) – notað fyrir brúnina á bitunum */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, v + amt)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function createHole(id) {
  const def = PIECES[id];
  const g = fx.el('g', { class: 'hole', 'data-hole': id }, holesLayer);
  // Ljós brún í kringum mótið. Hún er teiknuð UNDIR fyllingunni svo aðeins
  // ytri helmingur línunnar sést. Þessi lína er "teiknuð upp" í intro (line drawing).
  const lip = fx.el('path', {
    d: def.silhouette, fill: 'none', stroke: '#f7dcb4', 'stroke-width': 14,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  }, g);
  const fill = fx.el('path', { d: def.silhouette, fill: 'url(#g-hole)', opacity: 0 }, g);
  // Glóandi útlína sem er notuð í vísbendingum
  const glow = fx.el('path', {
    d: def.silhouette, fill: 'none', stroke: '#fff', 'stroke-width': 9,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  }, g);
  const [lipDraw] = svg.createDrawable(lip);
  const [glowDraw] = svg.createDrawable(glow);
  return { id, g, lip, fill, glow, lipDraw, glowDraw, x: 0, y: 0 };
}

function createPiece(id) {
  const def = PIECES[id];
  const wrap = fx.el('g', { class: 'piece', 'data-id': id }, piecesLayer);

  // Skugginn – sér element svo hann snúist ekki með fráviki þegar bitinn snýst
  const shadow = fx.el('g', { class: 'piece-shadow', opacity: 0.28 }, wrap);
  fx.el('path', {
    d: def.silhouette, fill: '#2b1a0e', stroke: '#2b1a0e', 'stroke-width': 9, 'stroke-linejoin': 'round',
  }, shadow);

  // Sjálfur bitinn. data-piece segir input.js hvaða bita var snert.
  const body = fx.el('g', { class: 'piece-body', 'data-piece': id }, wrap);
  // Ósýnilegur hringur sem stækkar snertiflötinn – litlir fingur eru ónákvæmir
  fx.el('circle', { r: 84, fill: 'transparent' }, body);
  fx.el('path', {
    d: def.silhouette, fill: 'none', stroke: shade(def.color, -45), 'stroke-width': 9, 'stroke-linejoin': 'round',
  }, body);
  fx.el('path', { d: def.silhouette, fill: def.color }, body);
  fx.el('path', { d: def.silhouette, fill: 'url(#g-board-light)', class: 'piece-detail' }, body);
  for (const dt of def.details) {
    fx.el('path', {
      d: dt.d, fill: dt.fill || 'none', stroke: dt.stroke || 'none', 'stroke-width': dt.width || 0,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'piece-detail',
    }, body);
  }

  return {
    id, def, wrap, shadow, body,
    placed: false,
    // Staða bitans. anime.js kvikar þennan hlut og render() uppfærir SVG.
    state: { x: 0, y: 0, rot: def.startRot, scale: 0, lift: BASE_LIFT, jump: 0 },
    home: { x: 0, y: 0 },
    trayIndex: 0,
    jitter: { x: (Math.random() - 0.5) * 0.12, y: (Math.random() - 0.5) * 0.12 },
    rotHints: 0,
  };
}

/** Skrifar stöðu bitans (state) í transform-eigindi SVG-sins */
function render(p) {
  const { x, y, rot, scale, lift, jump } = p.state;
  p.body.setAttribute('transform', `translate(${x} ${y - jump}) rotate(${rot}) scale(${scale})`);
  p.shadow.setAttribute('transform',
    `translate(${x + lift * 0.45} ${y + lift - jump * 0.3}) rotate(${rot}) scale(${scale})`);
}
const renderAll = () => game.pieces.forEach(render);

/** Kvikar stöðu bita með anime.js */
function tweenPiece(p, props, params = {}) {
  utils.remove(p.state);
  return animate(p.state, {
    ...props,
    duration: 400,
    ease: 'outQuad',
    ...params,
    onUpdate: () => render(p),
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildLevel(index) {
  game.level = index;
  const level = LEVELS[index];
  holesLayer.innerHTML = '';
  piecesLayer.innerHTML = '';
  game.holes.clear();
  game.held.clear();
  game.placedCount = 0;
  $('#board').setAttribute('fill', level.board);

  game.pieces = level.pieces.map((id) => {
    game.holes.set(id, createHole(id));
    return createPiece(id);
  });
  // Bitarnir liggja í annarri röð en mótin
  const order = shuffle(game.pieces.map((_, i) => i));
  if (order.every((v, i) => v === i) && order.length > 1) order.push(order.shift());
  game.pieces.forEach((p, i) => { p.trayIndex = order[i]; });

  layout();
  applyLayout(true);
}

// =============================================================
//  TIMELINES: byrjun borðs og fögnuður
// =============================================================

/** Byrjun borðs: útlínur mótanna teiknast (line drawing), svo skoppa bitarnir inn */
function intro() {
  game.mode = 'intro';
  const holes = [...game.holes.values()];
  game.pieces.forEach((p) => { p.state.scale = 0; });
  renderAll();

  createTimeline({
    onComplete: () => {
      // Ef skjástærðin breyttist á meðan, passa að allir bitar séu í réttri stærð
      game.pieces.forEach((p) => { p.state.scale = game.scale; });
      renderAll();
      game.mode = 'play';
      // Fyrst sýnum við strax hvernig á að spila, síðar bara ef ekkert gerist
      scheduleHint(game.firstHintDone ? 5000 : 800);
    },
  })
    .add(holes.map((h) => h.lipDraw), { draw: ['0 0', '0 1'], duration: 900, delay: stagger(220), ease: 'inOutSine' })
    .add(holes.map((h) => h.fill), { opacity: [0, 1], duration: 500, delay: stagger(220) }, '-=700')
    .add(game.pieces.map((p) => p.state), {
      scale: [0, game.scale],
      duration: 650,
      delay: stagger(140),
      ease: 'outBack(1.8)',
      onUpdate: renderAll,
    }, '-=300');
}

/** Allir bitar komnir á sinn stað – stór samsettur fögnuður (Timeline) */
function levelComplete() {
  game.mode = 'complete';
  clearTimeout(game.idleTimer);
  fx.cancelHint();
  fx.cancelRotateHint();
  sound.win();
  const { W, H, board } = game.L;
  const states = game.pieces.map((p) => p.state);

  createTimeline({
    onComplete: () => {
      // Ef barnið strauk strax yfir á næsta borð á örin ekki að birtast
      if (game.mode !== 'complete') return;
      fx.showNext(board.x + board.w / 2, board.y + board.h / 2, Math.min(board.w * 0.6, 500));
    },
  })
    .call(() => { fx.sunMood('grin', 2600); fx.cloudToHeart(); fx.confetti(W, H); }, 0)
    .call(() => fx.beeFlight(3400), 300)
    // Bitarnir hoppa hver á eftir öðrum – tvisvar
    .add(states, { jump: [0, 90, 0], duration: 650, delay: stagger(130), ease: 'outQuad', onUpdate: renderAll }, 0)
    .add(states, { jump: [0, 60, 0], duration: 550, delay: stagger(130), ease: 'outQuad', onUpdate: renderAll })
    // Mótin "anda" (stækka og minnka)
    .add([...game.holes.values()].map((h) => h.glowDraw), { draw: ['0 0', '0 1'], duration: 800, delay: stagger(120) }, '<')
    .add([...game.holes.values()].map((h) => h.glowDraw), { draw: '1 1', duration: 500 })
    .call(() => {
      game.pieces.forEach((p) => fx.sparkle(p.state.x, p.state.y, p.def.color, 8, 110 * game.scale));
    }, '-=300');
}

/** Strokið → borðið rennur út og næsta borð rennur inn */
function nextLevel(dir) {
  if (game.mode !== 'complete') return;
  game.mode = 'transition';
  fx.hideNext();
  sound.whoosh();
  const W = game.L.W;
  const layers = ['#layer-board', '#layer-pieces'];
  animate(layers, {
    translateX: dir * W,
    duration: 550,
    ease: 'inQuad',
    onComplete: () => {
      buildLevel((game.level + 1) % LEVELS.length);
      utils.set(layers, { translateX: -dir * W });
      animate(layers, { translateX: 0, duration: 650, ease: 'outCubic', onComplete: intro });
    },
  });
}

/** Lásinn opnaður (haldið í 2 sek) → byrja borðið upp á nýtt */
function restartLevel() {
  fx.lockOpen();
  sound.unlock();
  if (game.mode === 'transition') return;
  fx.cancelHint();
  fx.cancelRotateHint();
  if (game.mode === 'complete') fx.hideNext();
  game.mode = 'intro';
  game.placedCount = 0;

  const order = shuffle(game.pieces.map((_, i) => i));
  game.pieces.forEach((p, i) => {
    p.trayIndex = order[i];
    p.placed = false;
    p.wrap.classList.remove('placed');
  });
  applyLayout(false);

  const holes = [...game.holes.values()];
  createTimeline({ onComplete: () => { game.mode = 'play'; scheduleHint(5000); } })
    .add(game.pieces.map((p) => p.state), {
      x: (s, i) => game.pieces[i].home.x,
      y: (s, i) => game.pieces[i].home.y,
      rot: (s, i) => game.pieces[i].def.startRot,
      scale: game.scale,
      lift: BASE_LIFT,
      jump: [0, 120, 0],
      duration: 800,
      delay: stagger(90),
      ease: 'inOutQuad',
      onUpdate: renderAll,
    })
    .add(holes.map((h) => h.lipDraw), { draw: ['0 0', '0 1'], duration: 700, delay: stagger(150) }, 0);
}

// =============================================================
//  VÍSBENDINGAR ef barnið gerir ekkert
// =============================================================

function scheduleHint(ms) {
  clearTimeout(game.idleTimer);
  game.idleTimer = setTimeout(showHint, ms);
}

function showHint() {
  if (game.mode !== 'play') return;
  if (game.held.size > 0) return scheduleHint(4000);
  const p = game.pieces.find((q) => !q.placed);
  if (!p) return;
  const hole = game.holes.get(p.id);
  game.firstHintDone = true;
  fx.playHint({
    from: { x: p.state.x, y: p.state.y },
    to: { x: hole.x, y: hole.y },
    glowDrawable: hole.glowDraw,
    pieceBody: p.body,
    pieceRot: p.state.rot,
    targetRot: correctRotation(p, p.state.rot),
    scale: game.scale,
  });
  scheduleHint(9000);
}

// =============================================================
//  REGLUR: snúningur og hvort biti passi
// =============================================================

/** Passar bitinn í mótið með þessum snúningi? */
function rotationOk(def, rot) {
  const sym = def.symmetry;
  if (!sym) return true;
  const n = ((Math.round(rot) % 360) + 360) % 360;
  const m = n % sym;
  return m < 2 || sym - m < 2;
}

/** Næsti snúningur (í 90° þrepum) sem passar */
function correctRotation(p, rot) {
  const base = Math.round(rot / 90) * 90;
  for (const d of [0, 90, -90, 180, -180, 270, -270]) {
    if (rotationOk(p.def, base + d)) return base + d;
  }
  return base;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function clampToView(x, y) {
  const r = 60 * game.scale;
  const { W, H } = game.L;
  return { x: Math.max(r, Math.min(W - r, x)), y: Math.max(r, Math.min(H - r, y)) };
}

/** Biti smellur á sinn stað */
function placePiece(p, hole, rot) {
  const s = p.state;
  p.placed = true;
  p.wrap.classList.add('placed');
  piecesLayer.prepend(p.wrap);           // lausir bitar fara yfir þá sem eru komnir á sinn stað
  utils.remove(s);
  sound.snap();
  fx.sunMood('grin', 800);
  game.placedCount++;
  const sc = game.scale;

  const up = () => render(p);
  createTimeline()
    .add(s, { x: hole.x, y: hole.y, rot, scale: sc * HELD_SCALE, lift: 16, duration: 220, ease: 'outQuad', onUpdate: up })
    // "Smellur": bitinn þrýstist ofan í mótið og skoppar örlítið
    .add(s, { scale: [sc * HELD_SCALE, sc * 0.9, sc * 1.05, sc], lift: 0, duration: 600, ease: 'outQuad', onUpdate: up })
    .call(() => fx.sparkle(hole.x, hole.y, p.def.color, 10, 150 * sc), 230);

  if (game.placedCount === game.pieces.length) setTimeout(levelComplete, 750);
}

// =============================================================
//  HANDLERS – input.js kallar á þessi föll
// =============================================================

const handlers = {
  getPiece: (id) => game.pieces.find((p) => p.id === id),
  canGrab: (p) => !!p && game.mode === 'play' && !p.placed,
  getRotation: (p) => p.state.rot,

  /** Hver einasta snerting: lítill hringur undir fingrinum */
  onAnyDown(pos) {
    unlockAudio();
    fx.touchDot(pos.x, pos.y);
    fx.cancelHint();
    if (game.mode === 'play') scheduleHint(7000);
  },

  /** Fingri lyft af skjá: hringir breiðast út */
  onAnyUp(pos, kind) {
    fx.releaseRings(pos.x, pos.y, kind === 'drag' ? '#ffe066' : '#ffffff');
  },

  /** Byrjað að halda inni á bita: hringur fyllist og bitinn þrýstist aðeins niður */
  onPressStart(p, pos, ms) {
    game.pressRings.set(p, fx.pressRing(pos.x, pos.y, ms, 62 + 20 * game.scale));
    tweenPiece(p, { scale: game.scale * 0.94 }, { duration: ms, ease: 'outQuad' });
  },

  /** Hætt við long press (fingur hreyfðist of snemma eða var lyft) */
  onPressCancel(p, moved) {
    const ring = game.pressRings.get(p);
    if (ring) { ring.cancel(); game.pressRings.delete(p); }
    const r = p.state.rot;
    if (moved) {
      // Bitinn vaggar: "haltu fingrinum kyrrum á mér fyrst"
      tweenPiece(p, { scale: game.scale, rot: [r, r - 10, r + 10, r - 6, r] }, { duration: 500, ease: 'inOutSine' });
    } else {
      tweenPiece(p, { scale: game.scale }, { duration: 200 });
    }
  },

  /** Haldið nógu lengi → bitinn lyftist og má draga hann */
  onLift(p, pos) {
    const ring = game.pressRings.get(p);
    if (ring) { ring.burst(); game.pressRings.delete(p); }
    game.held.add(p);
    game.grabOffset.set(p, { dx: p.state.x - pos.x, dy: p.state.y - pos.y });
    piecesLayer.appendChild(p.wrap);       // efst
    sound.lift();
    tweenPiece(p, { scale: game.scale * HELD_SCALE, lift: HELD_LIFT }, { duration: 300, ease: 'outBack(2.5)' });
    fx.cancelRotateHint();

    // Ef bitinn snýr vitlaust sýnum við (fyrstu tvö skiptin) hvernig á að snúa honum
    if (!rotationOk(p.def, p.state.rot) && p.rotHints < 2) {
      p.rotHints++;
      game.rotHintPiece = p;
      fx.rotateHint(p.state.x, p.state.y, game.scale);
    }
  },

  /** PAN: bitinn fylgir fingrinum */
  onDrag(p, pos) {
    const off = game.grabOffset.get(p) || { dx: 0, dy: 0 };
    const c = clampToView(pos.x + off.dx, pos.y + off.dy);
    p.state.x = c.x;
    p.state.y = c.y;
    render(p);
    if (game.rotHintPiece === p) utils.set('#rot-hint', { translateX: c.x, translateY: c.y });
  },

  /** MULTI-TOUCH: annar fingur byrjar að snúa bitanum */
  onRotateStart(p) {
    fx.cancelRotateHint();
    game.rotHintPiece = null;
    p._lastTick = Math.round(p.state.rot / 45);
  },

  onRotate(p, deg) {
    p.state.rot = deg;
    render(p);
    const tick = Math.round(deg / 45);
    if (tick !== p._lastTick) { p._lastTick = tick; sound.rotate(); }
  },

  /** Snúningsfingri lyft → bitinn smellur í næsta 90° þrep */
  onRotateEnd(p) {
    const wasOk = rotationOk(p.def, p.state.rot);
    const target = Math.round(p.state.rot / 90) * 90;
    animate(p.state, { rot: target, duration: 260, ease: 'outBack(2)', onUpdate: () => render(p) });
    if (!wasOk && rotationOk(p.def, target)) fx.sunMood('grin', 500);
  },

  /** Músarhjól (fyrir prófanir á tölvu) */
  onWheelRotate(p, d) {
    const target = Math.round((p.state.rot + d) / 90) * 90;
    sound.rotate();
    animate(p.state, { rot: target, duration: 260, ease: 'outBack(2)', onUpdate: () => render(p) });
  },

  /** Bitanum sleppt – passar hann? */
  onDrop(p) {
    game.held.delete(p);
    game.grabOffset.delete(p);
    if (game.rotHintPiece === p) game.rotHintPiece = null;
    const s = p.state;
    const rot = Math.round(s.rot / 90) * 90;
    const hole = game.holes.get(p.id);
    const snapR = 105 * game.scale;     // rúmt svæði – litlir fingur eru ónákvæmir

    // 1) Rétt mót
    if (dist(s, hole) < snapR) {
      if (rotationOk(p.def, rot)) return placePiece(p, hole, rot);

      // Rétt mót en snýr vitlaust: bitinn vaggar og sýnt er hvernig á að snúa
      sound.wrong();
      fx.sunMood('o', 700);
      utils.remove(s);
      const up = () => render(p);
      createTimeline()
        .add(s, { x: hole.x, y: hole.y, rot, scale: game.scale, lift: BASE_LIFT + 6, duration: 300, onUpdate: up })
        .add(s, { rot: [rot, rot - 14, rot + 14, rot - 8, rot], duration: 600, ease: 'inOutSine', onUpdate: up });
      fx.rotateHint(hole.x, hole.y, game.scale);
      return;
    }

    // 2) Rangt mót: bitinn hristist og fer aftur á sinn stað. Rétta mótið glóir.
    const wrongHole = [...game.holes.values()].find((h) => h.id !== p.id && dist(s, h) < snapR);
    if (wrongHole) {
      sound.wrong();
      fx.sunMood('o', 800);
      utils.remove(s);
      const x0 = s.x;
      const up = () => render(p);
      createTimeline()
        .add(s, { x: [x0, x0 - 22, x0 + 22, x0 - 14, x0 + 14, x0], scale: game.scale, duration: 500, ease: 'inOutSine', onUpdate: up })
        .add(s, { x: p.home.x, y: p.home.y, rot, lift: BASE_LIFT, jump: [0, 80, 0], duration: 650, ease: 'inOutQuad', onUpdate: up })
        .add(hole.glowDraw, { draw: ['0 0', '0 1'], duration: 700, ease: 'inOutSine' }, '-=300')
        .add(hole.glowDraw, { draw: '1 1', duration: 500 }, '+=400');
      return;
    }

    // 3) Sleppt einhvers staðar annars staðar: bitinn dettur niður
    sound.drop();
    tweenPiece(p, { rot, scale: game.scale, lift: BASE_LIFT }, { duration: 450, ease: 'outBounce' });
  },

  /** Stutt bank á bita */
  onTap(p) {
    if (!p) return;
    sound.tap();
    if (p.placed) {
      // Bitar á sínum stað hoppa glaðir
      animate(p.state, { jump: [0, 40, 0], duration: 450, ease: 'outQuad', onUpdate: () => render(p) });
    } else {
      const r = p.state.rot;
      tweenPiece(p, { rot: [r, r - 8, r + 8, r], scale: game.scale }, { duration: 400 });
    }
  },

  /** SWIPE: strokið til hliðar þegar borðið er klárað */
  onSwipe(dir) {
    if (game.mode === 'complete') nextLevel(dir);
  },
  onNextTap() {
    if (game.mode === 'complete') nextLevel(-1);
  },

  /** TÍMABUNDIN BENDING: haldið á lásnum */
  onLockStart(ms) { fx.lockStart(ms); },
  onLockCancel() { fx.lockCancel(); },
  onLockComplete() { restartLevel(); },
};

// =============================================================
//  RÆSING
// =============================================================

function buildSunRays() {
  const g = $('#sun-rays');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 360;
    fx.el('path', { d: 'M-9 -64 L0 -88 L9 -64 Z', transform: `rotate(${a})`, 'stroke-linejoin': 'round' }, g);
  }
}

function start() {
  buildSunRays();
  buildLevel(0);
  setupInput(svgEl, handlers);
  fx.initLock();
  fx.ambient();

  // Borðið rennur inn í byrjun
  utils.set(['#layer-board', '#layer-pieces'], { translateY: game.L.H });
  animate(['#layer-board', '#layer-pieces'], {
    translateY: 0, duration: 900, ease: 'outBack(1.2)', onComplete: intro,
  });

  // Skjástærð breytist (síma snúið, gluggi stækkaður)
  new ResizeObserver(() => { layout(); applyLayout(true); }).observe(svgEl);
}

start();

// Aðgengilegt í console til að skoða ástand leiksins við prófanir
window.game = game;
