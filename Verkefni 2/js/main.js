import { animate, createTimeline, stagger, svg, utils } from '../lib/anime.esm.min.js';

const leikur = document.querySelector('#leikur');
const ahrif = document.querySelector('#ahrif');
const bitar = document.querySelectorAll('.bit');
const mot = document.querySelectorAll('.mot');
const utlinur = svg.createDrawable('.utlina');
const timaHringur = svg.createDrawable('#tima-hringur');
const hondHringur = svg.createDrawable('#hond-hringur');

const HALDA_MS = 400; // hvað þarf að halda lengi á bita áður en hann lyftist
const HALDA_SOL_MS = 2000; // hvað þarf að halda lengi á sólinni til að byrja upp á nýtt
let buid = false;
let sigurBid = null; // setTimeout áður en sigur() byrjar
let sigurTl = null; // timeline-ið í sigur()
let kennsla = null; // timeline-ið sem sýnir höndina
let kennsluBid = null; // setTimeout sem sýnir höndina aftur ef ekkert gerist

utils.set(timaHringur, { draw: '0 0' });
utils.set(hondHringur, { draw: '0 0' });

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
  animate(bit, { rotate: [r, r - 10, r + 10, r], duration: 400 });
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


// hönd sem heldur inni á hringnum og dregur hann að mótinu sínu
function synaKennslu() {
  const bit = [...bitar].find((b) => !b.kominn && !b.classList.contains('snyst'));
  if (!bit || buid) return;
  const fraX = bit.heimaX;
  const fraY = bit.heimaY;
  const tilX = Number(bit.mot.dataset.x);
  const tilY = Number(bit.mot.dataset.y);
  // draugurinn er afrit af forminu sem höndin "dregur"
  const draugur = document.querySelector('#draugur');
  draugur.setAttribute('href', '#' + bit.mot.id.replace('mot-', 'form-'));
  draugur.setAttribute('class', bit.mot.id.replace('mot-', ''));
  utils.set('#hond-innri', { scale: 1 });

  utils.set('#hond', { translateX: fraX + 80, translateY: fraY + 120 });
  utils.set(hondHringur, { draw: '0 0' });
  utils.set('#hond-hringur', { opacity: 1 });

  kennsla = createTimeline()
    .add('#hond', { opacity: [0, 1], translateX: fraX, translateY: fraY, duration: 700, ease: 'outQuad' })
    .add('#hond-innri', { scale: 0.85, duration: 200 })
    .add(hondHringur, { draw: ['0 0', '0 1'], duration: 800, ease: 'linear' }, '<<')
    .add('#draugur', { opacity: 0.7, scale: [1, 1.15], duration: 250 })
    .add('#hond-hringur', { opacity: 0, duration: 200 }, '<<')
    .add('#hond', { translateX: tilX, translateY: tilY, duration: 1200, ease: 'inOutQuad' })
    .add('#draugur', { scale: 1, duration: 200 })
    .add('#hond-innri', { scale: 1, duration: 200 }, '<<')
    .add('#hond', { opacity: 0, duration: 400 }, '+=300')
    .add('#draugur', { opacity: 0, duration: 400 }, '<<');
}

function stoppaKennslu() {
  clearTimeout(kennsluBid);
  if (kennsla) {
    kennsla.pause();
    kennsla = null;
    animate(['#hond', '#draugur'], { opacity: 0, duration: 200 });
  }
}

// ef enginn biti er kominn og ekkert er snert í 10 sek er höndin sýnd aftur
function bidaEftirKennslu() {
  clearTimeout(kennsluBid);
  kennsluBid = setTimeout(() => {
    if ([...bitar].every((b) => !b.kominn)) synaKennslu();
    bidaEftirKennslu();
  }, 10000);
}

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

    if ([...bitar].every((b) => b.kominn)) sigurBid = setTimeout(sigur, 600);
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
  clearTimeout(sigurBid);
  if (sigurTl) sigurTl.pause();
  utils.set('#byfluga', { opacity: 0 });
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
      scale: 1,
      duration: 700,
      delay: stagger(100),
      ease: 'inOutQuad',
    }, 0)
    .add(utlinur, { draw: ['0 0', '0 1'], duration: 700, delay: stagger(150) }, 300);

  bidaEftirKennslu();
}

// haldið á sólinni: hringur teiknast utan um hana og hún hristist
function byrjaSolHald(f) {
  f.sol = true;
  f.solTeikning = animate(timaHringur, { draw: ['0 0', '0 1'], duration: HALDA_SOL_MS, ease: 'linear' });
  f.hristingur = animate('#sol-innri', { rotate: [-6, 6], duration: 120, loop: true, alternate: true });
  f.timi = setTimeout(() => {
    haettaSolHaldi(f);
    if (Object.values(fingur).some((annar) => annar.dregur)) return;
    solin('storbros');
    nyUmferd();
  }, HALDA_SOL_MS);
}

function haettaSolHaldi(f) {
  clearTimeout(f.timi);
  f.sol = false;
  f.solTeikning.pause();
  f.hristingur.pause();
  animate(timaHringur, { draw: '0 0', duration: 300 });
  animate('#sol-innri', { rotate: 0, duration: 150 });
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
  stoppaKennslu();
  bidaEftirKennslu();

  // ef annar fingur er að draga bita þá snýr þessi fingur honum
  const dragari = Object.values(fingur).find((annar) => annar.dregur);
  if (dragari && (bit === null || bit === dragari.bit)) {
    if (dragari.bit.classList.contains('snyst')) snua(dragari.bit);
    else vagga(dragari.bit);
    return;
  }

  // long press á sólina í 2 sek = byrja upp á nýtt
  if (e.target.closest('#sol') && !dragari) {
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

  if (f.dregur) {
    utils.set(f.bit, { translateX: p.x + f.bilX, translateY: p.y + f.bilY });
  } else if (f.sol && Math.hypot(p.x - f.startX, p.y - f.startY) > 40) {
    haettaSolHaldi(f);
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
