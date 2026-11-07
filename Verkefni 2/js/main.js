// =========================================================
//  TRÉPÚSL – main.js
//
//  1. Undirbúningur
//  2. Hreyfingar (anime.js)
//  3. Leikurinn: byrjun, rétt/rangt, sigur, ný umferð
//  4. Snerting (Pointer Events)
//  5. Ræsa
// =========================================================

// Sækjum föllin sem við notum úr anime.js
import { animate, createTimeline, stagger, svg, utils } from '../lib/anime.esm.min.js';


// =========================================================
//  1. UNDIRBÚNINGUR
// =========================================================

const leikur = document.querySelector('#leikur');
const ahrif = document.querySelector('#ahrif');
const bitar = document.querySelectorAll('.bit');
const mot = document.querySelectorAll('.mot');

// svg.createDrawable() gerir útlínurnar "teiknanlegar" (fyrir line drawing)
const utlinur = svg.createDrawable('.utlina');

let buid = false;     // true þegar allir bitar eru komnir á sinn stað

// Setja mótin á sinn stað (lesum data-x og data-y úr HTML)
mot.forEach((m) => {
  utils.set(m, { translateX: m.dataset.x, translateY: m.dataset.y });
});

// Hver biti fær nokkrar breytur sem við notum í leiknum
bitar.forEach((bit) => {
  bit.snuningur = Number(bit.dataset.snuningur);   // Number() breytir texta í tölu
  bit.mot = document.querySelector('#' + bit.dataset.mot);
  bit.kominn = false;
  utils.set(bit, { rotate: bit.snuningur });       // utils.set = setja STRAX, án hreyfingar
});

// Uppréttur skjár eða á hlið? Velur viewBox og hvar bitarnir eiga heima.
function radaUpp() {
  const aHlid = window.innerWidth > window.innerHeight;
  leikur.setAttribute('viewBox', aHlid ? '0 0 1240 700' : '0 0 700 1000');

  bitar.forEach((bit) => {
    // Á hlið: data-lx / data-ly.  Uppréttur: data-x / data-y.
    bit.heimaX = Number(aHlid ? bit.dataset.lx : bit.dataset.x);
    bit.heimaY = Number(aHlid ? bit.dataset.ly : bit.dataset.y);
    // Bitar sem eru ekki komnir í mót eru settir heim
    if (!bit.kominn) utils.set(bit, { translateX: bit.heimaX, translateY: bit.heimaY });
  });
}


// =========================================================
//  2. HREYFINGAR MEÐ ANIME.JS
// =========================================================
//  animate(HVAÐ, { HVAÐ Á AÐ BREYTAST, duration, ease })
//
//  scale: 1.2          → fara úr núverandi gildi í 1.2
//  scale: [0, 1]       → fara úr 0 í 1
//  rotate: [0, 10, 0]  → 0 → 10 → 0 (fleiri gildi = fleiri skref)
//  duration: 500       → hálf sekúnda
//  ease: 'outBack(2)'  → hvernig hraðinn breytist (hér: smá skopp í lokin)
// ---------------------------------------------------------

// Bitanum lyft: stækkar (og CSS-klasinn "lyftur" gefur honum stærri skugga)
function lyfta(bit) {
  bit.classList.add('lyftur');
  animate(bit, { scale: 1.15, duration: 250, ease: 'outBack(3)' });
}

// Bitinn smellur í mótið
function smella(bit) {
  animate(bit, {
    translateX: bit.mot.dataset.x,
    translateY: bit.mot.dataset.y,
    rotate: bit.snuningur,
    scale: [1.15, 0.9, 1],          // þrýstist niður og skoppar upp
    duration: 500,
    ease: 'outQuad',
  });
}

// Bitinn vaggar og flýgur aftur heim
function fljugaHeim(bit) {
  createTimeline()
    .add(bit, { rotate: [bit.snuningur, bit.snuningur - 15, bit.snuningur + 15, bit.snuningur], duration: 400 })
    .add(bit, {
      translateX: bit.heimaX,
      translateY: bit.heimaY,
      scale: [1.15, 1.3, 1],        // stækkar á leiðinni = lítur út eins og hopp
      duration: 600,
      ease: 'inOutQuad',
    });
}

// Bitinn vaggar (t.d. ef bankað er á hann í stað þess að halda inni)
function vagga(bit) {
  animate(bit, {
    rotate: [bit.snuningur, bit.snuningur - 10, bit.snuningur + 10, bit.snuningur],
    scale: 1,
    duration: 400,
  });
}

// Bitanum snúið um 90° (með öðrum fingri)
function snua(bit) {
  bit.snuningur = bit.snuningur + 90;
  animate(bit, { rotate: bit.snuningur, duration: 300, ease: 'outBack(2)' });
}

// MORPHING: munnur sólarinnar breytir um form (bros / hissa / storbros)
function solin(svipur) {
  createTimeline()
    .add('#munnur', { d: svg.morphTo('#' + svipur), duration: 300 })
    .add('#sol-innri', { scale: [1, 1.2, 1], duration: 500 }, 0)            // sólin hoppar smá á sama tíma
    .add('#munnur', { d: svg.morphTo('#bros'), duration: 300 }, '+=1000');  // aftur í bros eftir 1 sek
}

// Stjörnur skjótast út í hring frá punkti (x, y)
function stjornur(x, y) {
  for (let i = 0; i < 8; i++) {
    // Búa til afrit af <polygon id="stjarna"> úr <defs>
    const stjarna = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    stjarna.setAttribute('href', '#stjarna');
    stjarna.setAttribute('class', 'stjarna');
    ahrif.appendChild(stjarna);

    const horn = (i * 45 * Math.PI) / 180;     // 8 stjörnur × 45° = heill hringur
    utils.set(stjarna, { translateX: x, translateY: y });
    animate(stjarna, {
      translateX: x + Math.cos(horn) * 120,    // cos/sin: hvert stjarnan fer
      translateY: y + Math.sin(horn) * 120,
      scale: [0, 1.4, 0],                      // birtist, stækkar og hverfur
      rotate: 180,
      duration: 800,
      ease: 'outQuart',
      onComplete: () => stjarna.remove(),
    });
  }
}

// LINE DRAWING: hringur sem "teiknast" í kringum fingurinn á meðan haldið er inni.
// draw: '0 0' = ekkert sést,  draw: '0 1' = öll línan sést
function haldHringur(x, y) {
  const hringur = nyrHringur(x, y, 80, 'fingurhringur');
  hringur.hreyfing = animate(svg.createDrawable(hringur), {
    draw: ['0 0', '0 1'],
    duration: HALDA_MS,
    ease: 'linear',
  });
  return hringur;
}

// Hringurinn hverfur (scale upp + fade út) og er svo fjarlægður
function fjarlaegjaHring(hringur) {
  hringur.hreyfing.pause();
  animate(hringur, { scale: 1.5, opacity: 0, duration: 300, onComplete: () => hringur.remove() });
}

// Gulur hringur sem breiðist út þegar fingri er lyft
function sleppHringur(x, y) {
  const hringur = nyrHringur(x, y, 40, 'slepphringur');
  animate(hringur, { scale: [0.5, 2], opacity: [1, 0], duration: 500, onComplete: () => hringur.remove() });
}

// Býr til <circle> í #ahrif (SVG element þarf createElementNS)
function nyrHringur(x, y, radius, klasi) {
  const hringur = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hringur.setAttribute('r', radius);
  hringur.setAttribute('class', klasi);
  ahrif.appendChild(hringur);
  utils.set(hringur, { translateX: x, translateY: y });
  return hringur;
}


// =========================================================
//  3. LEIKURINN
// =========================================================

// TIMELINE: byrjun – útlínur teiknast, götin birtast, bitarnir skoppa inn.
// stagger(200) = hver hlutur byrjar 200 ms á eftir þeim á undan
function byrjun() {
  utils.set(bitar, { scale: 0 });
  utils.set('.gat', { opacity: 0 });

  createTimeline()
    .add(utlinur, { draw: ['0 0', '0 1'], duration: 900, delay: stagger(200) })
    .add('.gat', { opacity: 1, duration: 400, delay: stagger(200) }, '-=600')  // byrjar 600 ms áður en útlínurnar klárast
    .add(bitar, { scale: [0, 1], duration: 600, delay: stagger(150), ease: 'outBack(2)' });
}

// Kallað þegar bita er sleppt
function sleppa(bit) {
  const motX = Number(bit.mot.dataset.x);
  const motY = Number(bit.mot.dataset.y);
  const bitX = utils.get(bit, 'translateX', false);   // hvar bitinn er núna
  const bitY = utils.get(bit, 'translateY', false);

  const fjarlaegd = Math.hypot(bitX - motX, bitY - motY);   // fjarlægð (Pýþagóras)
  const snyrRett = bit.snuningur % 360 === 0;               // 0°, 360°, 720°...

  bit.classList.remove('lyftur');

  if (fjarlaegd < 90 && snyrRett) {
    // RÉTT!
    bit.kominn = true;
    bit.classList.add('kominn');   // CSS: enginn skuggi = bitinn sökk ofan í gatið
    smella(bit);
    solin('storbros');
    stjornur(motX, motY);
    bit.parentNode.prepend(bit);   // fremst í HTML = teiknaður undir hinum bitunum

    // Eru allir bitar komnir?
    const allirKomnir = [...bitar].every((b) => b.kominn);
    if (allirKomnir) setTimeout(sigur, 600);
  } else {
    // RANGT – aftur heim
    fljugaHeim(bit);
    solin('hissa');
  }
}

// TIMELINE + MOTION PATH: allir bitar komnir!
function sigur() {
  buid = true;
  const leid = svg.createMotionPath('#leid');   // gefur translateX, translateY og rotate eftir ferlinum

  createTimeline()
    .add('#munnur', { d: svg.morphTo('#storbros'), duration: 400 })
    .add('#sky-form', { d: svg.morphTo('#sky-hjarta'), fill: '#ff70a6', duration: 700 }, 0)   // skýið verður hjarta
    .add(bitar, { scale: [1, 1.3, 1], duration: 500, delay: stagger(150) }, 0)
    .call(() => bitar.forEach((bit) => stjornur(Number(bit.mot.dataset.x), Number(bit.mot.dataset.y))), 0)
    .add('#byfluga', { opacity: [0, 1], duration: 200 }, 300)
    .add('#byfluga', { ...leid, duration: 3000, ease: 'inOutSine' }, 300)    // ...leid = translateX, translateY, rotate
    .add('#byfluga', { opacity: 0, duration: 200 })
    .add('#or', { opacity: 1, scale: [0, 1], duration: 500, ease: 'outBack(2)' }, 1200)
    .call(() => {
      // Örin togar til vinstri aftur og aftur = "strjúktu!"  (loop: true = endalaust)
      animate('#or', { translateX: [0, -40, 0], duration: 1000, loop: true });
    });
}

// Strokið eftir sigur: byrja upp á nýtt
function nyUmferd() {
  buid = false;
  bitar.forEach((bit) => {
    bit.kominn = false;
    bit.classList.remove('kominn');
    bit.snuningur = Number(bit.dataset.snuningur);
  });

  utils.remove('#or');   // stöðvar endalausu hreyfinguna á örinni
  createTimeline()
    .add('#or', { opacity: 0, scale: 0, duration: 300 })
    .add('#munnur', { d: svg.morphTo('#bros'), duration: 300 }, 0)
    .add('#sky-form', { d: svg.morphTo('#sky-venjulegt'), fill: '#ffffff', duration: 500 }, 0)
    .add(bitar, {
      translateX: (bit) => bit.heimaX,   // fall: hver biti fær sitt eigið gildi
      translateY: (bit) => bit.heimaY,
      rotate: (bit) => bit.snuningur,
      duration: 700,
      delay: stagger(100),
      ease: 'inOutQuad',
    }, 0)
    .add(utlinur, { draw: ['0 0', '0 1'], duration: 700, delay: stagger(150) }, 300);
}


// =========================================================
//  4. SNERTING (POINTER EVENTS)
// =========================================================
//  pointerdown = fingur snertir,  pointermove = hreyfist,  pointerup = lyft
//  Hver fingur hefur sitt númer: e.pointerId
//  Við geymum hvern fingur í hlutnum "fingur":  fingur[pointerId] = { ... }
// ---------------------------------------------------------

const HALDA_MS = 400;    // hve lengi þarf að halda inni (long press)
const fingur = {};

// Breytir staðsetningu fingurs (pixlar) í SVG-hnit (viewBox). "Uppskrift" sem má afrita.
function svgPunktur(e) {
  const p = new DOMPoint(e.clientX, e.clientY);
  return p.matrixTransform(leikur.getScreenCTM().inverse());
}

// ---------- FINGUR SNERTIR ----------
leikur.addEventListener('pointerdown', (e) => {
  const p = svgPunktur(e);
  const bit = e.target.closest('.bit');           // var snertur biti? (annars null)
  leikur.setPointerCapture(e.pointerId);          // fylgjast með fingrinum þótt hann fari út fyrir

  const f = { startX: p.x, startY: p.y, startTimi: Date.now() };
  fingur[e.pointerId] = f;

  // MULTI-TOUCH: er annar fingur nú þegar að draga bita?
  // Object.values(fingur) = listi af öllum fingrum á skjánum
  const dragari = Object.values(fingur).find((annar) => annar.dregur);

  // Nýi fingurinn snerti autt svæði (eða sama bitann) → SNÚA bitanum sem verið er að draga
  if (dragari && (bit === null || bit === dragari.bit)) {
    if (dragari.bit.classList.contains('snyst')) {
      snua(dragari.bit);
    } else {
      vagga(dragari.bit);   // hringur og ferningur þurfa ekki að snúast
    }
    return;
  }
  // (Ef nýi fingurinn snerti ANNAN bita heldur kóðinn áfram hér fyrir neðan,
  //  svo hægt er að draga tvo bita í einu – hvor með sínum fingri.)

  if (bit && !bit.kominn && !buid) {
    // LONG PRESS: bíða í HALDA_MS áður en bitinn lyftist
    f.bit = bit;
    f.hringur = haldHringur(p.x, p.y);
    f.timi = setTimeout(() => {
      // Tíminn er liðinn → nú má draga
      fjarlaegjaHring(f.hringur);
      f.hringur = null;
      f.dregur = true;
      utils.remove(bit);                                  // stöðva hreyfingar sem eru í gangi
      f.bilX = utils.get(bit, 'translateX', false) - f.startX;   // bil frá fingri að miðju bitans
      f.bilY = utils.get(bit, 'translateY', false) - f.startY;
      bit.parentNode.appendChild(bit);                    // aftast í HTML = teiknaður ofan á
      lyfta(bit);
    }, HALDA_MS);
  }
});

// ---------- FINGUR HREYFIST ----------
leikur.addEventListener('pointermove', (e) => {
  const f = fingur[e.pointerId];
  if (!f) return;
  const p = svgPunktur(e);

  if (f.dregur) {
    // PAN: bitinn fylgir fingrinum
    utils.set(f.bit, { translateX: p.x + f.bilX, translateY: p.y + f.bilY });
  } else if (f.hringur && Math.hypot(p.x - f.startX, p.y - f.startY) > 25) {
    // Fingurinn hreyfðist áður en tíminn var liðinn → hætta við
    clearTimeout(f.timi);
    fjarlaegjaHring(f.hringur);
    f.hringur = null;
    vagga(f.bit);
  }
});

// ---------- FINGRI LYFT ----------
function fingriLyft(e) {
  const f = fingur[e.pointerId];
  if (!f) return;
  const p = svgPunktur(e);
  delete fingur[e.pointerId];          // fingurinn er farinn
  sleppHringur(p.x, p.y);

  if (f.dregur) {
    sleppa(f.bit);
  } else if (f.hringur) {
    // Lyft of snemma (bara bank)
    clearTimeout(f.timi);
    fjarlaegjaHring(f.hringur);
    vagga(f.bit);
  } else if (buid) {
    // SWIPE: langt til hliðar á innan við 0,8 sekúndum?
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

// Langt þrýst opnar annars valmynd á sumum símum
leikur.addEventListener('contextmenu', (e) => e.preventDefault());


// =========================================================
//  5. RÆSA
// =========================================================

radaUpp();
window.addEventListener('resize', radaUpp);   // aftur ef síma/spjaldtölvu er snúið
byrjun();

// Hreyfingar sem eru alltaf í gangi (loop: true = endalaust)
animate('#geislar', { rotate: 360, duration: 20000, loop: true, ease: 'linear' });     // geislarnir snúast
animate('#augu', { scaleY: [1, 0.1, 1], duration: 300, loop: true, loopDelay: 3000 });  // sólin blikkar
animate('#sky-form', { translateX: [-30, 30], duration: 4000, loop: true, alternate: true, ease: 'inOutSine' }); // skýið svífur
animate('.vaengur', { scaleY: [1, 0.4], duration: 80, loop: true, alternate: true });   // býflugan blakar vængjunum

// Til að skoða í console (F12): skrifaðu t.d.  bitar[0].snuningur
window.bitar = bitar;
