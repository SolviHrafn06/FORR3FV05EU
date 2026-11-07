import { animate, createTimeline, stagger, svg, utils } from '../lib/anime.esm.min.js';

const leikur = document.querySelector('#leikur');
const ahrif = document.querySelector('#ahrif');
const bitar = document.querySelectorAll('.bit');
const mot = document.querySelectorAll('.mot');
const utlinur = svg.createDrawable('.utlina');

const HALDA_MS = 400; // hvað þarf að halda lengi á bita áður en hann lyftist
let buid = false;

mot.forEach((m) => {
  utils.set(m, { translateX: m.dataset.x, translateY: m.dataset.y });
});

bitar.forEach((bit) => {
  bit.snuningur = Number(bit.dataset.snuningur);
  bit.mot = document.querySelector('#' + bit.dataset.mot);
  bit.kominn = false;
  utils.set(bit, { rotate: bit.snuningur });
});

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
    translateX: bit.mot.dataset.x,
    translateY: bit.mot.dataset.y,
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
  animate(bit, { rotate: [r, r - 10, r + 10, r], scale: 1, duration: 400 });
}

function snua(bit) {
  bit.snuningur += 90;
  animate(bit, { rotate: bit.snuningur, duration: 300, ease: 'outBack(2)' });
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

    const horn = i * Math.PI / 4;
    utils.set(stjarna, { translateX: x, translateY: y });
    animate(stjarna, {
      translateX: x + Math.cos(horn) * 120,
      translateY: y + Math.sin(horn) * 120,
      scale: [0, 1.4, 0],
      rotate: 180,
      duration: 800,
      ease: 'outQuart',
      onComplete: () => stjarna.remove(),
    });
  }
}

function nyrHringur(x, y, radius, klasi) {
  const hringur = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hringur.setAttribute('r', radius);
  hringur.setAttribute('class', klasi);
  ahrif.appendChild(hringur);
  utils.set(hringur, { translateX: x, translateY: y });
  return hringur;
}

// hringur sem teiknast utan um fingurinn meðan haldið er inni
function haldHringur(x, y) {
  const hringur = nyrHringur(x, y, 80, 'fingurhringur');
  hringur.hreyfing = animate(svg.createDrawable(hringur), {
    draw: ['0 0', '0 1'],
    duration: HALDA_MS,
    ease: 'linear',
  });
  return hringur;
}

function fjarlaegjaHring(hringur) {
  hringur.hreyfing.pause();
  animate(hringur, { scale: 1.5, opacity: 0, duration: 300, onComplete: () => hringur.remove() });
}

function sleppHringur(x, y) {
  const hringur = nyrHringur(x, y, 40, 'slepphringur');
  animate(hringur, { scale: [0.5, 2], opacity: [1, 0], duration: 500, onComplete: () => hringur.remove() });
}


// --- leikurinn ---

function byrjun() {
  utils.set(bitar, { scale: 0 });
  utils.set('.gat', { opacity: 0 });

  createTimeline()
    .add(utlinur, { draw: ['0 0', '0 1'], duration: 900, delay: stagger(200) })
    .add('.gat', { opacity: 1, duration: 400, delay: stagger(200) }, '-=600')
    .add(bitar, { scale: [0, 1], duration: 600, delay: stagger(150), ease: 'outBack(2)' });
}

function sleppa(bit) {
  const motX = Number(bit.mot.dataset.x);
  const motY = Number(bit.mot.dataset.y);
  const x = utils.get(bit, 'translateX', false);
  const y = utils.get(bit, 'translateY', false);
  const fjarlaegd = Math.hypot(x - motX, y - motY);
  const snyrRett = bit.snuningur % 360 === 0;

  bit.classList.remove('lyftur');

  if (fjarlaegd < 90 && snyrRett) {
    bit.kominn = true;
    bit.classList.add('kominn');
    bit.parentNode.prepend(bit); // svo lausir bitar fari yfir hann
    smella(bit);
    solin('storbros');
    stjornur(motX, motY);

    if ([...bitar].every((b) => b.kominn)) setTimeout(sigur, 600);
  } else {
    fljugaHeim(bit);
    solin('hissa');
  }
}

function sigur() {
  buid = true;
  const leid = svg.createMotionPath('#leid');

  createTimeline()
    .add('#munnur', { d: svg.morphTo('#storbros'), duration: 400 })
    .add('#sky-form', { d: svg.morphTo('#sky-hjarta'), fill: '#ff70a6', duration: 700 }, 0)
    .add(bitar, { scale: [1, 1.3, 1], duration: 500, delay: stagger(150) }, 0)
    .call(() => {
      bitar.forEach((bit) => stjornur(Number(bit.mot.dataset.x), Number(bit.mot.dataset.y)));
    }, 0)
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
  bitar.forEach((bit) => {
    bit.kominn = false;
    bit.classList.remove('kominn');
    bit.snuningur = Number(bit.dataset.snuningur);
  });

  utils.remove('#or');
  createTimeline()
    .add('#or', { opacity: 0, scale: 0, duration: 300 })
    .add('#munnur', { d: svg.morphTo('#bros'), duration: 300 }, 0)
    .add('#sky-form', { d: svg.morphTo('#sky-venjulegt'), fill: '#ffffff', duration: 500 }, 0)
    .add(bitar, {
      translateX: (bit) => bit.heimaX,
      translateY: (bit) => bit.heimaY,
      rotate: (bit) => bit.snuningur,
      duration: 700,
      delay: stagger(100),
      ease: 'inOutQuad',
    }, 0)
    .add(utlinur, { draw: ['0 0', '0 1'], duration: 700, delay: stagger(150) }, 300);
}


// --- snerting ---

// geymir alla fingur sem eru á skjánum, lykillinn er pointerId
const fingur = {};

// breytir pixlum í hnit innan svg-sins
function svgPunktur(e) {
  const p = new DOMPoint(e.clientX, e.clientY);
  return p.matrixTransform(leikur.getScreenCTM().inverse());
}

leikur.addEventListener('pointerdown', (e) => {
  const p = svgPunktur(e);
  const bit = e.target.closest('.bit');
  leikur.setPointerCapture(e.pointerId);

  const f = { startX: p.x, startY: p.y, startTimi: Date.now() };
  fingur[e.pointerId] = f;

  // ef annar fingur er að draga bita þá snýr þessi fingur honum
  const dragari = Object.values(fingur).find((annar) => annar.dregur);
  if (dragari && (bit === null || bit === dragari.bit)) {
    if (dragari.bit.classList.contains('snyst')) snua(dragari.bit);
    else vagga(dragari.bit);
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

  if (f.dregur) {
    utils.set(f.bit, { translateX: p.x + f.bilX, translateY: p.y + f.bilY });
  } else if (f.hringur && Math.hypot(p.x - f.startX, p.y - f.startY) > 25) {
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
    sleppa(f.bit);
  } else if (f.hringur) {
    clearTimeout(f.timi);
    fjarlaegjaHring(f.hringur);
    vagga(f.bit);
  } else if (buid) {
    // swipe = langt til hliðar á stuttum tíma
    const dx = p.x - f.startX;
    const dy = p.y - f.startY;
    const timi = Date.now() - f.startTimi;
    if (Math.abs(dx) > 120 && Math.abs(dx) > Math.abs(dy) && timi < 800) {
      nyUmferd();
    }
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
