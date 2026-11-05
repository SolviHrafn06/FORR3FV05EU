// =============================================================
//  fx.js – Allar hreyfingar (kvikun) með anime.js v4.5
// -------------------------------------------------------------
//  Hér eru notuð:
//   - animate()             → stakar hreyfingar (Animation)
//   - createTimeline()      → samsettar hreyfingar (Timeline)
//   - svg.createDrawable()  → línuteikning (Line drawing)
//   - svg.morphTo()         → formbreyting (Morphing)
//   - svg.createMotionPath()→ fylgja ferli (Follow motion path)
//   - stagger()             → tímadreifing á milli margra hluta
//
//  Regla: anime.js setur CSS transform (translateX, rotate, scale…)
//  á element. Element sem eru staðsett með transform="..." eigindi í
//  HTML eru því aldrei kvikuð beint – heldur innri <g> inni í þeim.
// =============================================================

import { animate, createTimeline, stagger, svg, utils } from '../lib/anime.esm.min.js';
import { starPoints, roundedPoly } from './levels.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);

/** Býr til SVG element með eigindum og bætir því við foreldri */
export function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

const fxLayer = () => $('#layer-fx');
const STAR_D = roundedPoly(starPoints(5, 20, 9), 3);

// -------------------------------------------------------------
//  SNERTING: sjónræn endurgjöf fyrir fingur
// -------------------------------------------------------------

/** Lítill hringur sem birtist alls staðar þar sem fingur snertir skjáinn */
export function touchDot(x, y) {
  const c = el('circle', { r: 26, fill: '#fff', opacity: 0.6 }, fxLayer());
  utils.set(c, { translateX: x, translateY: y, scale: 0.4 });
  animate(c, {
    scale: 1.4, opacity: 0, duration: 450, ease: 'outQuad',
    onComplete: () => c.remove(),
  });
}

/**
 * Hringur sem fyllist í kringum fingurinn á meðan haldið er inni (long press).
 * Þegar hringurinn er fullur má byrja að draga bitann.
 * Notar LINE DRAWING (createDrawable + draw).
 */
export function pressRing(x, y, duration, radius = 70) {
  const g = el('g', {}, fxLayer());
  utils.set(g, { translateX: x, translateY: y });
  el('circle', { r: radius, fill: 'none', stroke: '#fff', 'stroke-width': 12, opacity: 0.3 }, g);
  const dot = el('circle', { r: radius * 0.45, fill: '#fff', opacity: 0.35 }, g);
  const ring = el('circle', {
    r: radius, fill: 'none', stroke: '#fff', 'stroke-width': 12,
    'stroke-linecap': 'round', transform: 'rotate(-90)',
  }, g);
  const [drawable] = svg.createDrawable(ring);

  utils.set(dot, { scale: 0 });
  const a1 = animate(drawable, { draw: ['0 0', '0 1'], duration, ease: 'linear' });
  const a2 = animate(dot, { scale: 1, duration, ease: 'outQuad' });

  return {
    /** Fingri lyft eða hann hreyfður of snemma – hringurinn dregst til baka */
    cancel() {
      a1.pause(); a2.pause();
      animate(drawable, { draw: '0 0', duration: 200, ease: 'inQuad' });
      animate(g, { opacity: 0, duration: 250, onComplete: () => g.remove() });
    },
    /** Haldið nógu lengi – hringurinn "springur" út */
    burst() {
      animate(g, {
        scale: [1, 1.6], opacity: [1, 0], duration: 380, ease: 'outQuad',
        onComplete: () => g.remove(),
      });
    },
  };
}

/** Tveir hringir sem breiðast út þegar fingri er lyft af skjánum */
export function releaseRings(x, y, color = '#fff') {
  const g = el('g', {}, fxLayer());
  utils.set(g, { translateX: x, translateY: y });
  const rings = [0, 1].map(() =>
    el('circle', { r: 50, fill: 'none', stroke: color, 'stroke-width': 8 }, g));
  animate(rings, {
    scale: [0.3, 1.5], opacity: [0.9, 0], duration: 600,
    delay: stagger(110), ease: 'outQuad',
    onComplete: () => g.remove(),
  });
}

// -------------------------------------------------------------
//  FÖGNUÐUR
// -------------------------------------------------------------

/** Stjörnur skjótast út frá punkti (þegar biti fer á réttan stað) */
export function sparkle(x, y, color = '#ffd60a', count = 10, dist = 130) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const s = el('path', { d: STAR_D, fill: i % 2 ? '#fff' : color, stroke: '#fff', 'stroke-width': 2 }, fxLayer());
    utils.set(s, { translateX: x, translateY: y, scale: 0 });
    stars.push(s);
  }
  animate(stars, {
    translateX: (_, i) => x + Math.cos((i / count) * Math.PI * 2) * dist * utils.random(0.7, 1.1),
    translateY: (_, i) => y + Math.sin((i / count) * Math.PI * 2) * dist * utils.random(0.7, 1.1),
    scale: [0, 1.4, 0],
    rotate: () => utils.random(-200, 200),
    duration: 900,
    delay: stagger(25),
    ease: 'outQuart',
    onComplete: (anim) => stars.forEach((s) => s.remove()),
  });
}

/** Litríkt konfetti sem rignir yfir skjáinn */
export function confetti(W, H, count = 46) {
  const colors = ['#e63946', '#3a86ff', '#ffbe0b', '#43aa8b', '#ff70a6', '#8e5bd8', '#fb8500'];
  const bits = [];
  for (let i = 0; i < count; i++) {
    const isStar = i % 3 === 0;
    const b = isStar
      ? el('path', { d: STAR_D, fill: colors[i % colors.length] }, fxLayer())
      : el('rect', { x: -9, y: -5, width: 18, height: 10, rx: 3, fill: colors[i % colors.length] }, fxLayer());
    utils.set(b, { translateX: utils.random(0, W), translateY: utils.random(-200, -40), rotate: utils.random(0, 360) });
    bits.push(b);
  }
  return animate(bits, {
    translateY: H + 60,
    translateX: (b) => `+=${utils.random(-160, 160)}`,
    rotate: () => `+=${utils.random(360, 900)}`,
    duration: () => utils.random(1800, 3000),
    delay: stagger(30),
    ease: 'inQuad',
    onComplete: () => bits.forEach((b) => b.remove()),
  });
}

// -------------------------------------------------------------
//  SÓLIN OG SKÝIÐ  (MORPHING)
// -------------------------------------------------------------

let moodTl = null;

/**
 * Breytir munni sólarinnar með svg.morphTo().
 * mood: 'smile' | 'o' | 'grin'. Eftir holdMs fer hann aftur í bros.
 */
export function sunMood(mood, holdMs = 900) {
  if (moodTl) moodTl.pause();
  moodTl = createTimeline({ defaults: { duration: 280, ease: 'outQuad' } })
    .add('#sun-mouth', { d: svg.morphTo(`#mouth-${mood}`) })
    .add('#sun-inner', { scale: [1, mood === 'o' ? 0.9 : 1.18, 1], duration: 500 }, 0);
  if (mood === 'o') {
    // Sólin hristir höfuðið smá: "nei, ekki þarna"
    moodTl.add('#sun-inner', { rotate: [0, -10, 10, -6, 0], duration: 600 }, 0);
  }
  if (mood !== 'smile') {
    moodTl.add('#sun-mouth', { d: svg.morphTo('#mouth-smile') }, `+=${holdMs}`);
  }
  return moodTl;
}

/** Skýið breytist í hjarta (og verður bleikt) – og svo aftur í ský */
export function cloudToHeart(holdMs = 2200) {
  return createTimeline({ defaults: { duration: 600, ease: 'inOutQuad' } })
    .add('#cloud-shape', { d: svg.morphTo('#cloud-heart'), fill: '#ff70a6' })
    .add('#cloud-inner', { scale: [1, 1.25, 1], duration: 700 }, '<')
    .add('#cloud-shape', { d: svg.morphTo('#cloud-normal'), fill: '#ffffff' }, `+=${holdMs}`);
}

/** Hreyfingar sem eru alltaf í gangi í bakgrunni */
export function ambient() {
  // Sólargeislarnir snúast hægt
  animate('#sun-rays', { rotate: 360, duration: 24000, loop: true, ease: 'linear' });
  // Skýið svífur fram og til baka
  animate('#cloud-inner', { translateX: [-40, 40], duration: 5000, alternate: true, loop: true, ease: 'inOutSine' });
  // Sólin blikkar augunum öðru hvoru
  animate('#sun-eyes', { scaleY: [1, 0.1, 1], duration: 260, loop: true, loopDelay: 3200, ease: 'inOutQuad' });
}

// -------------------------------------------------------------
//  BÝFLUGAN  (FOLLOW MOTION PATH)
// -------------------------------------------------------------

/** Býflugan flýgur eftir #bee-path (með lykkju) þegar borð klárast */
export function beeFlight(duration = 3600) {
  const bee = $('#bee');
  const { translateX, translateY, rotate } = svg.createMotionPath('#bee-path');
  const flap = animate('#bee .wing', { scaleY: [1, 0.35], duration: 80, alternate: true, loop: true });
  return createTimeline({ onComplete: () => flap.pause() })
    .add(bee, { opacity: [0, 1], duration: 200 })
    .add(bee, { translateX, translateY, rotate, duration, ease: 'inOutSine' }, 0)
    .add(bee, { opacity: 0, duration: 200 }, `-=200`);
}

// -------------------------------------------------------------
//  VÍSBENDINGAR (í stað textaleiðbeininga)
// -------------------------------------------------------------

let hintTl = null;
let ghost = null;
let hintGlow = null;

/**
 * Höndin sýnir barninu hvað á að gera:
 *  1. Útlína rétta mótsins teiknast upp (LINE DRAWING)
 *  2. Höndin birtist á bitanum og "heldur inni" (hringur fyllist)
 *  3. Höndin dregur gegnsætt afrit af bitanum eftir bogadregnum ferli
 *     að mótinu (FOLLOW MOTION PATH)
 */
export function playHint({ from, to, glowDrawable, pieceBody, pieceRot, targetRot, scale }) {
  cancelHint();
  hintGlow = glowDrawable;
  const hand = $('#hand');
  const inner = $('#hand-inner');
  const press = $('#hand-press');

  // Bogadreginn ferill frá bitanum að mótinu
  const mx = (from.x + to.x) / 2;
  const my = Math.min(from.y, to.y) - 160;
  $('#hint-path').setAttribute('d', `M${from.x} ${from.y} Q${mx} ${my} ${to.x} ${to.y}`);
  const path = svg.createMotionPath('#hint-path');

  // Gegnsætt afrit ("draugur") af bitanum sem höndin dregur
  ghost = el('g', { opacity: 0 }, fxLayer());
  const ghostRot = el('g', {}, ghost);
  const clone = pieceBody.cloneNode(true);
  clone.removeAttribute('data-piece');
  clone.setAttribute('transform', `scale(${scale})`);
  ghostRot.appendChild(clone);
  utils.set(ghost, { translateX: from.x, translateY: from.y });
  utils.set(ghostRot, { rotate: pieceRot });
  utils.set(hand, { translateX: from.x, translateY: from.y, opacity: 0 });
  utils.set(inner, { scale: 1 });

  const g = ghost;
  hintTl = createTimeline({
    defaults: { ease: 'outQuad' },
    onComplete: () => g.remove(),
  })
    // 1. Útlínan teiknast
    .add(glowDrawable, { draw: ['0 0', '0 1'], duration: 900, ease: 'inOutSine' })
    // 2. Höndin birtist og ýtir á bitann
    .add(hand, { opacity: [0, 1], duration: 250 }, 200)
    .add(inner, { scale: [1.3, 1], duration: 400, ease: 'outBack(2)' }, '<')
    .add(press, { opacity: [0, 0.8], scale: [0.3, 1.4], duration: 500 })
    .add(inner, { scale: 0.85, duration: 300 }, '<')
    .add(g, { opacity: 0.65, duration: 200 }, '<')
    // 3. Dregið eftir ferlinum
    .add([hand, g], { translateX: path.translateX, translateY: path.translateY, duration: 1300, ease: 'inOutSine' })
    .add(ghostRot, { rotate: targetRot, duration: 900, ease: 'inOutSine' }, '-=1100')
    // 4. Sleppt
    .add(inner, { scale: 1, duration: 200 })
    .add(press, { opacity: 0, duration: 200 }, '<')
    .add(g, { scale: [1, 0.9, 1], duration: 300 }, '<')
    .add([hand, g], { opacity: 0, duration: 400 }, '+=250')
    .add(glowDrawable, { draw: '1 1', duration: 500, ease: 'inQuad' }, '<');
  return hintTl;
}

/** Stoppar vísbendingu ef barnið byrjar að leika sér */
export function cancelHint() {
  if (hintTl) { hintTl.pause(); hintTl = null; }
  // Glóandi útlínan hverfur ef vísbendingin var stöðvuð í miðjum klíðum
  if (hintGlow) { animate(hintGlow, { draw: '1 1', duration: 250 }); hintGlow = null; }
  if (ghost) {
    const g = ghost;
    animate(g, { opacity: 0, duration: 150, onComplete: () => g.remove() });
    ghost = null;
  }
  animate('#hand', { opacity: 0, duration: 150 });
}

let rotTl = null;
/** Sýnir tvo fingur snúa bitanum – með ör sem teiknast upp (LINE DRAWING) */
export function rotateHint(x, y, scale = 1) {
  if (rotTl) rotTl.pause();
  const g = $('#rot-hint');
  const fingers = g.querySelectorAll('.finger');
  fingers[0].setAttribute('cx', -70); fingers[0].setAttribute('cy', 0);
  fingers[1].setAttribute('cx', 70); fingers[1].setAttribute('cy', 0);
  const head = $('#rot-arrow-head');
  head.setAttribute('transform', 'translate(95 55) rotate(120)');
  const [arrow] = svg.createDrawable('#rot-arrow');
  utils.set(g, { translateX: x, translateY: y, rotate: 0, scale });
  utils.set(head, { opacity: 0 });

  rotTl = createTimeline({ defaults: { ease: 'inOutSine' } })
    .add(g, { opacity: [0, 1], duration: 200 })
    .add(arrow, { draw: ['0 0', '0 1'], duration: 600 }, '<')
    .add(head, { opacity: 1, duration: 150 })
    .add(g, { rotate: 90, duration: 900 })
    .add(g, { opacity: 0, duration: 300 }, '+=150')
    .add(g, { rotate: 0, duration: 0 })
    .add(g, { opacity: [0, 1], duration: 200 })
    .add(g, { rotate: 90, duration: 900 })
    .add(g, { opacity: 0, duration: 300 }, '+=150');
  return rotTl;
}

export function cancelRotateHint() {
  if (rotTl) { rotTl.pause(); rotTl = null; }
  animate('#rot-hint', { opacity: 0, duration: 150 });
}

// -------------------------------------------------------------
//  ÖRIN – strjúka til að fara á næsta borð
// -------------------------------------------------------------

let nextLoop = null;
let swipeHintTl = null;

export function showNext(cx, cy, swipeDist) {
  const next = $('#next');
  next.classList.add('active');
  const inner = $('#next-inner');
  utils.set(inner, { translateX: 0 });
  animate(inner, { opacity: [0, 1], scale: [0, 1], rotate: [-90, 0], duration: 700, ease: 'outBack(1.8)' });
  // Örin "togar" í áttina sem á að strjúka
  nextLoop = animate(inner, {
    translateX: [0, -36, 0], duration: 1100, loop: true, loopDelay: 400, delay: 700, ease: 'inOutSine',
  });
  // Höndin sýnir strokuhreyfingu frá hægri til vinstri
  const hand = $('#hand');
  const inner2 = $('#hand-inner');
  swipeHintTl = createTimeline({ loop: true, loopDelay: 1600, delay: 1200 })
    .add(hand, { translateX: [cx + swipeDist / 2, cx + swipeDist / 2], translateY: [cy + 120, cy + 120], opacity: [0, 1], duration: 250 })
    .add(inner2, { scale: [1, 0.85], duration: 200 })
    .add(hand, { translateX: cx - swipeDist / 2, duration: 700, ease: 'inOutQuad' })
    .add(inner2, { scale: 1, duration: 150 })
    .add(hand, { opacity: 0, duration: 250 });
}

export function hideNext() {
  const next = $('#next');
  next.classList.remove('active');
  if (nextLoop) nextLoop.pause();
  if (swipeHintTl) swipeHintTl.pause();
  animate('#hand', { opacity: 0, duration: 150 });
  return animate('#next-inner', { scale: 0, opacity: 0, duration: 300, ease: 'inBack' });
}

// -------------------------------------------------------------
//  LÁSINN – halda inni í 2 sekúndur (time-based gesture)
// -------------------------------------------------------------

let lockDrawable = null;
let lockAnim = null;

/** Býr til teiknanlega útgáfu af hringnum (hann byrjar ósýnilegur: draw = '0 0') */
export function initLock() {
  if (!lockDrawable) [lockDrawable] = svg.createDrawable('#lock-ring');
}

export function lockStart(duration) {
  initLock();
  if (lockAnim) lockAnim.pause();
  lockAnim = animate(lockDrawable, { draw: ['0 0', '0 1'], duration, ease: 'linear' });
  // Lásinn titrar meira og meira eftir því sem lengur er haldið
  animate('#lock-icon', { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.15], duration, ease: 'inQuad' });
}

export function lockCancel() {
  if (lockAnim) lockAnim.pause();
  if (lockDrawable) animate(lockDrawable, { draw: '0 0', duration: 300, ease: 'outQuad' });
  animate('#lock-icon', { rotate: 0, scale: 1, duration: 250 });
}

/** Lásinn opnast (hespan lyftist), hringurinn hverfur, lásinn lokast aftur */
export function lockOpen() {
  return createTimeline()
    .add('#lock-shackle', { translateY: -12, rotate: -20, duration: 300, ease: 'outBack(2)' })
    .add('#lock-icon', { rotate: 0, scale: [1.15, 1.3, 1], duration: 500 }, '<')
    .add(lockDrawable, { draw: '1 1', duration: 400 })
    .add('#lock-shackle', { translateY: 0, rotate: 0, duration: 300, ease: 'inQuad' }, '+=600')
    .add(lockDrawable, { draw: '0 0', duration: 0 });
}

export { animate, createTimeline, stagger, svg, utils };
