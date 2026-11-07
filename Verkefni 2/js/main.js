import { animate, createTimeline, stagger, svg, utils } from '../lib/anime.esm.min.js';

const leikur = document.querySelector('#leikur');
const ahrif = document.querySelector('#ahrif');
const bitar = [...document.querySelectorAll('.bit')];
const mot = document.querySelectorAll('.mot');
const utlinur = svg.createDrawable('.utlina');
const timaHringur = svg.createDrawable('#tima-hringur');
const hondHringur = svg.createDrawable('#hond-hringur');

const HALDA_MS = 400; // halda á bita áður en hann lyftist
const HALDA_SOL_MS = 2000; // halda á sólinni til að byrja upp á nýtt

// allir fingur sem eru á skjánum, lykillinn er pointerId
const fingur = {};

let buid = false;
let sigurBid = null;
let sigurTl = null;
let kennsla = null;
let kennsluBid = null;

mot.forEach((m) => {
  utils.set(m, { translateX: m.dataset.x, translateY: m.dataset.y });
});

bitar.forEach((bit) => {
  const m = document.querySelector('#' + bit.dataset.mot);
  bit.motX = Number(m.dataset.x);
  bit.motY = Number(m.dataset.y);
  bit.snuningur = Number(bit.dataset.snuningur);
  bit.kominn = false;
  utils.set(bit, { rotate: bit.snuningur });
});

utils.set([timaHringur, hondHringur], { draw: '0 0' });

// bitarnir eru undir borðinu ef skjárinn er uppréttur, annars við hliðina á því
function radaUpp() {
  const aHlid = window.innerWidth > window.innerHeight;
  leikur.setAttribute('viewBox', aHlid ? '0 0 1240 700' : '0 0 700 1000');

  bitar.forEach((bit) => {
    bit.heimaX = Number(aHlid ? bit.dataset.lx : bit.dataset.x);
    bit.heimaY = Number(aHlid ? bit.dataset.ly : bit.dataset.y);
    if (!bit.kominn) utils.set(bit, { translateX: bit.heimaX, translateY: bit.heimaY });
  });
}


// --- hreyfingar ---

function lyfta(bit) {
  bit.classList.add('lyftur');
  animate(bit, { scale: 1.15, duration: 250, ease: 'outBack(3)' });
}

function smella(bit) {
  animate(bit, {
    translateX: bit.motX,
    translateY: bit.motY,
    rotate: bit.snuningur,
    scale: [1.15, 0.9, 1],
    duration: 500,
    ease: 'outQuad',
  });
}

// vaggar fyrst og fer svo aftur á sinn stað
function fljugaHeim(bit) {
  const r = bit.snuningur;
  createTimeline()
    .add(bit, { rotate: [r, r - 15, r + 15, r], duration: 400 })
    .add(bit, {
      translateX: bit.heimaX,
      translateY: bit.heimaY,
      scale: [1.15, 1.3, 1],
      duration: 600,
      ease: 'inOutQuad',
    });
}

function vagga(bit) {
  const r = bit.snuningur;
  animate(bit, { rotate: [r, r - 10, r + 10, r], duration: 400 });
}

// svipur er 'bros', 'hissa' eða 'storbros'
function solin(svipur) {
  createTimeline()
    .add('#munnur', { d: svg.morphTo('#' + svipur), duration: 300 })
    .add('#sol-innri', { scale: [1, 1.2, 1], duration: 500 }, 0)
    .add('#munnur', { d: svg.morphTo('#bros'), duration: 300 }, '+=1000');
}

function stjornur(x, y) {
  for (let i = 0; i < 8; i++) {
    const stjarna = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    stjarna.setAttribute('href', '#stjarna');
    stjarna.setAttribute('class', 'stjarna');
    ahrif.appendChild(stjarna);

    const att = i * Math.PI / 4;
    utils.set(stjarna, { translateX: x, translateY: y });
    animate(stjarna, {
      translateX: x + Math.cos(att) * 120,
      translateY: y + Math.sin(att) * 120,
      scale: [0, 1.4, 0],
      rotate: 180,
      duration: 800,
      ease: 'outQuart',
      onComplete: () => stjarna.remove(),
    });
  }
}

function nyrHringur(x, y, r, klasi) {
  const hringur = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hringur.setAttribute('r', r);
  hringur.setAttribute('class', klasi);
  ahrif.appendChild(hringur);
  utils.set(hringur, { translateX: x, translateY: y });
  return hringur;
}

// hringur sem teiknast utan um fingurinn meðan haldið er inni
function haldHringur(x, y) {
  const hringur = nyrHringur(x, y, 80, 'fingurhringur');
  hringur.teikning = animate(svg.createDrawable(hringur), {
    draw: ['0 0', '0 1'],
    duration: HALDA_MS,
    ease: 'linear',
  });
  return hringur;
}

function fjarlaegjaHring(hringur) {
  hringur.teikning.pause();
  animate(hringur, { scale: 1.5, opacity: 0, duration: 300, onComplete: () => hringur.remove() });
}

function sleppHringur(x, y) {
  const hringur = nyrHringur(x, y, 40, 'slepphringur');
  animate(hringur, { scale: [0.5, 2], opacity: [1, 0], duration: 500, onComplete: () => hringur.remove() });
}


// --- snúningur með tveimur fingrum ---

// hornið á línunni milli tveggja fingra, í gráðum
function horn(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

// dragari er fingurinn sem heldur á bitanum, annar er fingurinn sem snýr
function byrjaSnuning(dragari, annar) {
  dragari.annar = annar;
  annar.dragari = dragari;
  dragari.horn = horn(dragari, annar);
}

function uppfaeraSnuning(dragari) {
  const nytt = horn(dragari, dragari.annar);
  let breyting = nytt - dragari.horn;
  // atan2 hoppar á milli 180 og -180
  if (breyting > 180) breyting -= 360;
  if (breyting < -180) breyting += 360;
  dragari.horn = nytt;

  const r = utils.get(dragari.bit, 'rotate', false);
  utils.set(dragari.bit, { rotate: r + breyting });
}

// bitinn smellur í næstu 90 gráður
function klaraSnuning(dragari) {
  const bit = dragari.bit;
  bit.snuningur = Math.round(utils.get(bit, 'rotate', false) / 90) * 90;
  animate(bit, { rotate: bit.snuningur, duration: 250, ease: 'outBack(2)' });
  dragari.annar.dragari = null;
  dragari.annar = null;
}


// --- kenna á að halda yuhhhhhh ---

// höndin heldur inni á hringnum og dregur hann að mótinu
function synaKennslu() {
  const bit = bitar.find((b) => b.dataset.mot === 'mot-hringur');
  if (bit.kominn || buid) return;

  utils.set('#hond', { translateX: bit.heimaX + 80, translateY: bit.heimaY + 120 });
  utils.set('#hond-innri', { scale: 1 });
  utils.set('#hond-hringur', { opacity: 1 });
  utils.set(hondHringur, { draw: '0 0' });

  kennsla = createTimeline()
    .add('#hond', { opacity: [0, 1], translateX: bit.heimaX, translateY: bit.heimaY, duration: 700, ease: 'outQuad' })
    .add('#hond-innri', { scale: 0.85, duration: 200 })
    .add(hondHringur, { draw: ['0 0', '0 1'], duration: 800, ease: 'linear' }, '<<')
    .add('#draugur', { opacity: 0.7, scale: [1, 1.15], duration: 250 })
    .add('#hond-hringur', { opacity: 0, duration: 200 }, '<<')
    .add('#hond', { translateX: bit.motX, translateY: bit.motY, duration: 1200, ease: 'inOutQuad' })
    .add('#draugur', { scale: 1, duration: 200 })
    .add('#hond-innri', { scale: 1, duration: 200 }, '<<')
    .add(['#hond', '#draugur'], { opacity: 0, duration: 400 }, '+=300');
}

function stoppaKennslu() {
  if (kennsla) kennsla.pause();
  utils.set(['#hond', '#draugur'], { opacity: 0 });
}

// höndin kemur aftur ef ekkert er snert í 10 sek og enginn biti er kominn
function bidaEftirKennslu() {
  clearTimeout(kennsluBid);
  kennsluBid = setTimeout(() => {
    if (bitar.every((b) => !b.kominn)) synaKennslu();
    bidaEftirKennslu();
  }, 10000);
}


// --- leikurinn swaaaaaggggggg ---

function byrjun() {
  utils.set(bitar, { scale: 0 });
  utils.set('.gat', { opacity: 0 });

  createTimeline()
    .add(utlinur, { draw: ['0 0', '0 1'], duration: 900, delay: stagger(200) })
    .add('.gat', { opacity: 1, duration: 400, delay: stagger(200) }, '-=600')
    .add(bitar, { scale: [0, 1], duration: 600, delay: stagger(150), ease: 'outBack(2)' })
    .call(() => {
      synaKennslu();
      bidaEftirKennslu();
    });
}

function sleppa(bit) {
  const x = utils.get(bit, 'translateX', false);
  const y = utils.get(bit, 'translateY', false);
  const naerri = Math.hypot(x - bit.motX, y - bit.motY) < 90;
  const snyrRett = bit.snuningur % 360 === 0;

  bit.classList.remove('lyftur');

  if (naerri && snyrRett) {
    bit.kominn = true;
    bit.classList.add('kominn');
    bit.parentNode.prepend(bit); // svo lausir bitar fari yfir hann
    smella(bit);
    solin('storbros');
    stjornur(bit.motX, bit.motY);

    if (bitar.every((b) => b.kominn)) sigurBid = setTimeout(sigur, 600);
  } else {
    fljugaHeim(bit);
    solin('hissa');
  }
}

function sigur() {
  buid = true;
  const leid = svg.createMotionPath('#leid');

  sigurTl = createTimeline()
    .add('#munnur', { d: svg.morphTo('#storbros'), duration: 400 })
    .add('#sky-form', { d: svg.morphTo('#sky-hjarta'), fill: '#ff70a6', duration: 700 }, 0)
    .add(bitar, { scale: [1, 1.3, 1], duration: 500, delay: stagger(150) }, 0)
    .call(() => bitar.forEach((bit) => stjornur(bit.motX, bit.motY)), 0)
    .add('#byfluga', { opacity: [0, 1], duration: 200 }, 300)
    .add('#byfluga', { ...leid, duration: 3000, ease: 'inOutSine' }, 300)
    .add('#byfluga', { opacity: 0, duration: 200 })
    .add('#or', { opacity: 1, scale: [0, 1], duration: 500, ease: 'outBack(2)' }, 1200)
    .call(() => {
      animate('#or', { translateX: [0, -40, 0], duration: 1000, loop: true });
    });
}

function nyUmferd() {
  buid = false;
  clearTimeout(sigurBid);
  if (sigurTl) sigurTl.pause();
  utils.remove('#or');
  utils.set('#byfluga', { opacity: 0 });

  bitar.forEach((bit) => {
    bit.kominn = false;
    bit.classList.remove('kominn');
    bit.snuningur = Number(bit.dataset.snuningur);
  });

  createTimeline()
    .add('#or', { opacity: 0, scale: 0, duration: 300 })
    .add('#munnur', { d: svg.morphTo('#bros'), duration: 300 }, 0)
    .add('#sky-form', { d: svg.morphTo('#sky-venjulegt'), fill: '#ffffff', duration: 500 }, 0)
    .add(bitar, {
      translateX: (bit) => bit.heimaX,
      translateY: (bit) => bit.heimaY,
      rotate: (bit) => bit.snuningur,
      scale: 1,
      duration: 700,
      delay: stagger(100),
      ease: 'inOutQuad',
    }, 0)
    .add(utlinur, { draw: ['0 0', '0 1'], duration: 700, delay: stagger(150) }, 300);

  bidaEftirKennslu();
}

// hringur teiknast utan um sólina og hún hristist meðan haldið er á henni
function byrjaSolHald(f) {
  f.sol = true;
  f.teikning = animate(timaHringur, { draw: ['0 0', '0 1'], duration: HALDA_SOL_MS, ease: 'linear' });
  f.hristingur = animate('#sol-innri', { rotate: [-6, 6], duration: 120, loop: true, alternate: true });
  f.timi = setTimeout(() => {
    haettaSolHaldi(f);
    const einhverDregur = Object.values(fingur).some((annar) => annar.dregur);
    if (!einhverDregur) nyUmferd();
  }, HALDA_SOL_MS);
}

function haettaSolHaldi(f) {
  clearTimeout(f.timi);
  f.sol = false;
  f.teikning.pause();
  f.hristingur.pause();
  animate(timaHringur, { draw: '0 0', duration: 300 });
  animate('#sol-innri', { rotate: 0, duration: 150 });
}


// --- snerting ekki á perralegan hátt---

// breytir pixlum á skjánum í hnit innan svg-sins
function svgPunktur(e) {
  const p = new DOMPoint(e.clientX, e.clientY);
  return p.matrixTransform(leikur.getScreenCTM().inverse());
}

leikur.addEventListener('pointerdown', (e) => {
  const p = svgPunktur(e);
  const bit = e.target.closest('.bit');
  leikur.setPointerCapture(e.pointerId);

  const f = { x: p.x, y: p.y, startX: p.x, startY: p.y, startTimi: Date.now() };
  fingur[e.pointerId] = f;
  stoppaKennslu();
  bidaEftirKennslu();

  // ef annar fingur heldur á bita þá snýr þessi fingur honum
  const dragari = Object.values(fingur).find((annar) => annar.dregur);
  if (dragari && (bit === null || bit === dragari.bit)) {
    if (dragari.annar) return; // það er þegar verið að snúa honum
    if (dragari.bit.classList.contains('snyst')) byrjaSnuning(dragari, f);
    else vagga(dragari.bit); // hringur og ferningur þurfa ekki að snúast
    return;
  }

  if (e.target.closest('#sol')) {
    byrjaSolHald(f);
    return;
  }

  if (bit && !bit.kominn && !buid) {
    f.bit = bit;
    f.hringur = haldHringur(p.x, p.y);
    f.timi = setTimeout(() => {
      fjarlaegjaHring(f.hringur);
      f.hringur = null;
      f.dregur = true;
      utils.remove(bit);
      f.bilX = utils.get(bit, 'translateX', false) - f.startX;
      f.bilY = utils.get(bit, 'translateY', false) - f.startY;
      bit.parentNode.appendChild(bit); // teiknast ofan á hina
      lyfta(bit);
    }, HALDA_MS);
  }
});

leikur.addEventListener('pointermove', (e) => {
  const f = fingur[e.pointerId];
  if (!f) return;
  const p = svgPunktur(e);
  f.x = p.x;
  f.y = p.y;
  const fjarlaegd = Math.hypot(p.x - f.startX, p.y - f.startY);

  if (f.dregur) {
    utils.set(f.bit, { translateX: p.x + f.bilX, translateY: p.y + f.bilY });
    if (f.annar) uppfaeraSnuning(f);
  } else if (f.dragari) {
    uppfaeraSnuning(f.dragari);
  } else if (f.sol && fjarlaegd > 40) {
    haettaSolHaldi(f);
  } else if (f.hringur && fjarlaegd > 25) {
    // fingurinn fór af stað áður en tíminn var liðinn
    clearTimeout(f.timi);
    fjarlaegjaHring(f.hringur);
    f.hringur = null;
    vagga(f.bit);
  }
});

function fingriLyft(e) {
  const f = fingur[e.pointerId];
  if (!f) return;
  const p = svgPunktur(e);
  delete fingur[e.pointerId];
  sleppHringur(p.x, p.y);

  if (f.dregur) {
    if (f.annar) klaraSnuning(f);
    sleppa(f.bit);
  } else if (f.dragari) {
    klaraSnuning(f.dragari);
  } else if (f.sol) {
    haettaSolHaldi(f);
  } else if (f.hringur) {
    clearTimeout(f.timi);
    fjarlaegjaHring(f.hringur);
    vagga(f.bit);
  } else if (buid) {
    // swipe = langt til hliðar á stuttum tíma
    const dx = p.x - f.startX;
    const dy = p.y - f.startY;
    const timi = Date.now() - f.startTimi;
    if (Math.abs(dx) > 120 && Math.abs(dx) > Math.abs(dy) && timi < 800) nyUmferd();
  }
}

leikur.addEventListener('pointerup', fingriLyft);
leikur.addEventListener('pointercancel', fingriLyft);
leikur.addEventListener('contextmenu', (e) => e.preventDefault());


radaUpp();
window.addEventListener('resize', radaUpp);
byrjun();

animate('#geislar', { rotate: 360, duration: 20000, loop: true, ease: 'linear' });
animate('#augu', { scaleY: [1, 0.1, 1], duration: 300, loop: true, loopDelay: 3000 });
animate('#sky-form', { translateX: [-30, 30], duration: 4000, loop: true, alternate: true, ease: 'inOutSine' });
animate('.vaengur', { scaleY: [1, 0.4], duration: 80, loop: true, alternate: true });
