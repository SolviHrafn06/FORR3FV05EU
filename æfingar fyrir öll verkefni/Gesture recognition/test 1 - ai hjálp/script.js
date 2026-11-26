import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { HandLandmarker, DrawingUtils } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
import { HandStada, flokkaBendingu, Mykir, Sia1D, paraSpor, lofaMidja, klipuPunktur, handStaerd, handGrunnur, fjarlaegd, THUMB_TIP, INDEX_TIP, INDEX_MCP } from './hond.js';
import { BendingaHald } from './bendingar.js';
import { aresktur } from './edlisfraedi.js';
import { Agnir } from './agnir.js';
import { SKRA, RADIUS, LITIR, SLOD_N, buaTilHlut, setjaISenu, takaUrSenu, setjaXray } from './hlutir.js';

const MP_MODUL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const MP_URL = MP_MODUL + '/wasm';
const LIKAN_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const MIN_STAERD = 0.3, MAX_STAERD = 3.5;
const MIN_FJ = 1.5, MAX_FJ = 9;   // fjarlægð hluta frá myndavél
const GOLF = -1.4;
const ZOOM_NAEMNI = 1.2;          // minnkun = e^(hve mikið klípan lokaðist * þetta)
const THENSLA_NAEMNI = 1.8;       // stækkun = e^(hve mikið gómarnir glenntust út * þetta); saman->glennt ≈ 2.2×
const TYND_SLEPPIR = 300;         // ms: gríphönd sem hverfur lengur (hreyfiþoka í kasti) sleppir; styttri brottföll þolast
const GRIP_NAD = 350;             // ms: hönd sem var yfir hlut rétt áður en hún krepptist má grípa
const KALLA_TIMI = 900;           // ms: miða leysi á hlut svona lengi = kalla hann til sín
const MAX_HLUTIR = 8;
const CSS = { blar: '#5fe0ff', skaer: '#2fc8ff', gulur: '#ffb35c', hvitur: '#e8fbff', raudur: '#ff4d6d' };
const GOMAR = [4, 8, 12, 16, 20];
const SKIPUN_TEXTI = { Victory: 'RÖNTGEN', Thumb_Up: 'NÝR HLUTUR', Thumb_Down: 'EYÐA', ILoveYou: 'ENDURSTILLA' };
const SKIPUN_LISTI = { Victory: 'xray', Thumb_Up: 'nyr', Thumb_Down: 'eyda', ILoveYou: 'nullstilla' };

const $ = (id) => document.getElementById(id);
const stadaEl = $('stada'), adgerdEl = $('adgerd'), afkostEl = $('afkost'), sena = $('sena');
const rakningAfkostEl = $('rakningAfkost');
const skyringar = [...document.querySelectorAll('#skyring li')];
const video = $('video'), hendur = $('hendur'), ctx = hendur.getContext('2d');
const drawingUtils = new DrawingUtils(ctx);

// ---------- three.js: myndavélin er bakgrunnur INNI í senunni svo bloom virki á hólógrömin ----------
const renderer = new THREE.WebGLRenderer({ canvas: sena, powerPreference: 'high-performance' });
const PR = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(PR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1116);
const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.04).texture;
room.dispose(); pmrem.dispose();
scene.environmentIntensity = 0.8;
const videoTex = new THREE.VideoTexture(video);
videoTex.colorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 50);
camera.position.set(0, 0, 4);

// hóflegt ljós: raunverulegi hluturinn má ekki fara yfir bloom-þröskuldinn, bara hólógrömin
const sol = new THREE.DirectionalLight(0xffffff, 1.4);
sol.position.set(2, 5, 3);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
sol.shadow.radius = 6;
Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
scene.add(sol, new THREE.HemisphereLight(0xcfe8ff, 0x203028, 0.6));

const golf = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.3 }));
golf.rotation.x = -Math.PI / 2;
golf.position.y = GOLF;
golf.receiveShadow = true;
scene.add(golf);

// bloom-þröskuldur 1.15: aðeins HDR-litir (hólógrömm) glóa, ekki myndavélarmyndin né dósin
const composer = new EffectComposer(renderer);
composer.setPixelRatio(PR);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.5, 1.15);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const merkjaRenderer = new CSS2DRenderer();
merkjaRenderer.domElement.id = 'merkjalag';
document.body.appendChild(merkjaRenderer.domElement);

const agnir = new Agnir(scene);

let va = 4 / 3; // hlutfall myndavélar
// object-fit: cover sker af myndinni; þessir stuðlar segja hve mikið
function skurdur() {
  const sa = innerWidth / innerHeight;
  return sa > va ? { sx: 1, sy: sa / va } : { sx: va / sa, sy: 1 };
}
/** Sami skurður og speglun á myndavélarbakgrunninum og á handa-striganum (CSS cover). */
function stillaBakgrunn() {
  const { sx, sy } = skurdur();
  videoTex.repeat.set(-1 / sx, 1 / sy);
  videoTex.offset.set(0.5 + 0.5 / sx, 0.5 - 0.5 / sy);
}

function stillaStaerd() {
  renderer.setSize(innerWidth, innerHeight, false);
  // Bloom og myndavélin deila GPU með rakningunni; takmarka innri teikningu við 720p.
  composer.setPixelRatio(Math.min(PR, Math.sqrt(1280 * 720 / (innerWidth * innerHeight))));
  composer.setSize(innerWidth, innerHeight);
  merkjaRenderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(Math.PI / 8) * Math.max(1, 1.4 / camera.aspect)));
  camera.updateProjectionMatrix();
  stillaBakgrunn();
}
addEventListener('resize', stillaStaerd);
stillaStaerd();

// ---------- hljóð (vafrinn leyfir það eftir fyrsta smell/takka) ----------
let hljodCtx = null, sud = null;
function opnaHljod() {
  if (!hljodCtx) {
    hljodCtx = new AudioContext();
    // lágt suð meðan haldið er á hlut; tíðnin fylgir hraðanum
    const o = hljodCtx.createOscillator(), f = hljodCtx.createBiquadFilter(), g = hljodCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 60;
    f.type = 'lowpass';
    f.frequency.value = 420;
    g.gain.value = 0;
    o.connect(f).connect(g).connect(hljodCtx.destination);
    o.start();
    sud = { o, g };
  }
  hljodCtx.resume();
}
addEventListener('pointerdown', opnaHljod);
addEventListener('keydown', opnaHljod);
function hljod(f0, f1, lengd = 0.09, styrkur = 0.05) {
  if (hljodCtx?.state !== 'running') return;
  const t = hljodCtx.currentTime, o = hljodCtx.createOscillator(), g = hljodCtx.createGain();
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + lengd);
  g.gain.setValueAtTime(styrkur, t);
  g.gain.exponentialRampToValueAtTime(1e-4, t + lengd);
  o.connect(g).connect(hljodCtx.destination);
  o.start(t);
  o.stop(t + lengd);
}

// ---------- hlutir ----------
const hlutir = [];
let naestaSkra = 0, virkur = null;
const V = new THREE.Vector3(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion();
const EINING = new THREE.Quaternion(), LITUR = new THREE.Color();
const klemma = (s) => THREE.MathUtils.clamp(s, MIN_STAERD, MAX_STAERD);
const virkir = () => hlutir.filter((o) => o.fara === null && o.birting > 0.3);
const utBak = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2; // fer aðeins yfir og til baka

function birta(def, stada) {
  if (hlutir.filter((o) => o.fara === null).length >= MAX_HLUTIR) return null;
  const o = buaTilHlut(def);
  o.group.position.copy(stada);
  o.group.scale.setScalar(1e-3);
  o.heima.copy(stada);
  o.fyrriPos.copy(stada);
  setjaISenu(o, scene);
  hlutir.push(o);
  agnir.spraut(stada, 260, { inn: true, radius: 1.3, lif: 0.55, litur: LITIR.blar, styrkur: 3 });
  hljod(200, 900, 0.35, 0.04);
  virkur = o;
  return o;
}
const birtaNaesta = (stada) => birta(SKRA[naestaSkra++ % SKRA.length], stada);

function eyda(o) {
  if (!o || o.fara !== null) return;
  o.fara = 0;
  for (const g of [...gripir]) if (g.hlutur === o) sleppa(g);
  if (mus?.hlutur === o) musSleppir();
  if (zoom?.hlutur === o) zoom = null;
  if (thensla?.hlutur === o) thensla = null;
  if (tvaerKlipa?.hlutur === o) tvaerKlipa = null;
  if (virkur === o) virkur = null;
  agnir.spraut(o.group.position, 450, { radius: RADIUS * o.group.scale.x, hradi: 2.8, lif: 1.1, litur: LITIR.gulur, styrkur: 3.5 });
  hljod(1200, 80, 0.5, 0.05);
}

function nullstilla() {
  for (const g of [...gripir]) sleppa(g);
  musSleppir();
  zoom = thensla = tvaerKlipa = null;
  for (const o of hlutir) {
    if (o.fara !== null) continue;
    o.kalla = o.heima.clone();
    o.kallaQ = true;
    o.staerdMark = 1;
    o.hradi.set(0, 0, 0);
    o.snHradi.set(0, 0, 0);
    if (o.xray) setjaXray(o, false);
  }
  hljod(900, 300, 0.4, 0.04);
}

function kalla(o) {
  o.kalla = new THREE.Vector3(0, -0.1, 1.0);
  o.snHradi.multiplyScalar(0.2);
  o.pulsT = 0;
  agnir.spraut(o.group.position, 120, { radius: RADIUS * o.group.scale.x, hradi: 1, lif: 0.6, litur: LITIR.raudur });
  hljod(300, 1500, 0.3, 0.04);
}

function gripAhrif(o) {
  o.pulsT = 0;
  o.svif.scale.setScalar(1.08);
  agnir.spraut(o.group.position, 60, { radius: RADIUS * o.group.scale.x, hradi: 1.4, lif: 0.4, litur: LITIR.skaer });
  hljod(420, 1100);
}

/** Punktur á geisla frá myndavél gegnum skjáhnit (ndc) í fjarlægð d. */
function geislaPunktur(nx, ny, d, ut = new THREE.Vector3()) {
  ut.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
  return ut.multiplyScalar(d).add(camera.position);
}

/** Hnit hlutar á skjá og radíus hans (í ndc-y einingum). */
function skjaHlutur(o) {
  const p = o.group.position.clone().project(camera);
  const d = camera.position.distanceTo(o.group.position);
  return { x: p.x, y: p.y, r: (RADIUS * o.group.scale.x) / (d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) };
}

/** Næsti hlutur undir skjápunkti (innan grip-svæðis), eða null. */
function naestiHlutur(nx, ny) {
  let best = null, bs = Infinity;
  for (const o of virkir()) {
    const s = skjaHlutur(o);
    const d = Math.hypot((nx - s.x) * camera.aspect, ny - s.y);
    if (d < s.r * 1.25 + 0.2 && d / (s.r + 0.1) < bs) { bs = d / (s.r + 0.1); best = o; }
  }
  return best;
}

// ---------- eðlisfræði ----------
function uppfaeraHlut(o, dt, t) {
  const p = o.group.position, q = o.group.quaternion;
  if (o.heldur) {
    const a = 1 - Math.exp(-28 * dt);
    p.lerp(o.heldur.stada, a);
    if (o.heldur.snuningur) q.slerp(o.heldur.snuningur, a);
    // hraði mældur meðan haldið er: fyrir árekstra og músarkast (handarkast mælir höndina sjálfa)
    o.hradi.lerp(V.subVectors(p, o.fyrriPos).divideScalar(dt), 0.35);
    Q.copy(o.fyrriQ).invert().premultiply(q);
    if (Q.w < 0) { Q.x = -Q.x; Q.y = -Q.y; Q.z = -Q.z; Q.w = -Q.w; }
    const horn = 2 * Math.acos(Math.min(1, Q.w));
    V.set(Q.x, Q.y, Q.z);
    if (V.lengthSq() > 1e-12) V.normalize().multiplyScalar(horn / dt); else V.set(0, 0, 0);
    o.snHradi.lerp(V, 0.35);
  } else {
    if (o.kalla) { // gormur að áfangastað (kalla / endurstilla)
      o.hradi.addScaledVector(V.subVectors(o.kalla, p), 14 * dt).multiplyScalar(Math.exp(-7 * dt));
      if (p.distanceTo(o.kalla) < 0.02 && o.hradi.length() < 0.05) o.kalla = null;
    } else o.hradi.multiplyScalar(Math.exp(-1.6 * dt));
    p.addScaledVector(o.hradi, dt);
    if (o.kallaQ) {
      q.slerp(EINING, 1 - Math.exp(-5 * dt));
      o.snHradi.set(0, 0, 0);
      if (q.angleTo(EINING) < 0.01) o.kallaQ = false;
    } else {
      const w = o.snHradi.length();
      if (w > 1e-4) q.premultiply(Q2.setFromAxisAngle(V.copy(o.snHradi).divideScalar(w), w * dt));
      o.snHradi.multiplyScalar(Math.exp(-0.9 * dt));
    }
    haldaInnan(o);
  }
  o.hradi.clampLength(0, 12);
  o.snHradi.clampLength(0, 20);
  o.fyrriPos.copy(p);
  o.fyrriQ.copy(q);

  o.birting = Math.min(1, o.birting + dt / 0.6);
  if (o.fara !== null) o.fara += dt / 0.35;
  o.kvardi = THREE.MathUtils.lerp(o.kvardi, klemma(o.staerdMark), 1 - Math.exp(-14 * dt));
  o.group.scale.setScalar(Math.max(1e-3, o.kvardi * utBak(o.birting) * (o.fara === null ? 1 : Math.max(0, 1 - o.fara))));

  const flot = o.heldur ? 0 : 1;
  o.svif.position.y = THREE.MathUtils.lerp(o.svif.position.y, flot * Math.sin(t * 1.6 + o.heima.x) * 0.05, 0.1);
  o.svif.rotation.z = THREE.MathUtils.lerp(o.svif.rotation.z, flot * Math.sin(t * 0.7 + o.heima.x) * 0.06, 0.1);
  o.svif.scale.setScalar(THREE.MathUtils.lerp(o.svif.scale.x, 1, 1 - Math.exp(-10 * dt)));
  o.update(t);
}

const BOP = -0.55; // endurkast frá veggjum
function haldaInnan(o) {
  const p = o.group.position, h = o.hradi, r = RADIUS * o.group.scale.x;
  if (p.y - r < GOLF) { p.y = GOLF + r; if (h.y < 0) h.y *= BOP; }
  const zMin = camera.position.z - MAX_FJ, zMax = camera.position.z - MIN_FJ;
  if (p.z < zMin) { p.z = zMin; if (h.z < 0) h.z *= BOP; }
  if (p.z > zMax) { p.z = zMax; if (h.z > 0) h.z *= BOP; }
  const n = V.copy(p).project(camera);
  if (Math.abs(n.x) > 0.92 && Math.sign(n.x) === Math.sign(h.x)) h.x *= BOP;
  if (n.y > 0.92 && h.y > 0) h.y *= BOP;
  if (Math.abs(n.x) > 0.98) h.x -= Math.sign(n.x) * 0.05; // sleppt utan skjás: dregst hægt inn
  if (n.y > 0.98) h.y -= 0.05;
}

function arekstrar(t) {
  const vh = virkir();
  for (let i = 0; i < vh.length; i++) {
    for (let j = i + 1; j < vh.length; j++) {
      const a = vh[i], b = vh[j];
      const hogg = a.hradi.distanceTo(b.hradi);
      const snerting = aresktur(
        { p: a.group.position, v: a.hradi, r: RADIUS * a.group.scale.x * 0.8, kyrr: !!a.heldur },
        { p: b.group.position, v: b.hradi, r: RADIUS * b.group.scale.x * 0.8, kyrr: !!b.heldur });
      if (snerting && hogg > 1.2 && t - a.hoggT > 0.15) {
        a.hoggT = b.hoggT = t;
        agnir.spraut(V.addVectors(a.group.position, b.group.position).multiplyScalar(0.5), Math.min(120, hogg * 30), { hradi: hogg, lif: 0.5, litur: LITIR.hvitur });
        hljod(180 + hogg * 40, 60, 0.15, Math.min(0.08, hogg * 0.015));
      }
    }
  }
}

// ---------- útlit hvers hlutar ----------
const STYRKUR = { tvaer: 1, grip: 1, zoom: 0.85, midad: 0.9, yfir: 0.55, virkur: 0.18, ekkert: 0 };
const STADA_LITUR = { tvaer: LITIR.hvitur, grip: LITIR.skaer, zoom: LITIR.gulur, midad: LITIR.raudur, yfir: LITIR.blar, virkur: LITIR.blar, ekkert: LITIR.blar };
let yfirMork = new Set(), leysirMork = new Set(), musYfir = null;

function stadaHlutar(o) {
  const g = gripir.find((x) => x.hlutur === o);
  if (g) return g.tegund === 'tvaer' ? 'tvaer' : 'grip';
  if (mus?.hlutur === o) return 'grip';
  if (zoom?.hlutur === o || thensla?.hlutur === o || tvaerKlipa?.hlutur === o) return 'zoom';
  if (leysirMork.has(o)) return 'midad';
  if (yfirMork.has(o) || musYfir === o) return 'yfir';
  return virkur === o ? 'virkur' : 'ekkert';
}

function uppfaeraUtlit(o, dt, t) {
  const stada = stadaHlutar(o), p = o.group.position, s = o.group.scale.x;
  const mjukt = 1 - Math.exp(-10 * dt), kvardi = RADIUS * s * 1.25;
  const birtingGloi = 1 - o.birting; // nýr hlutur glóir sterkt fyrst

  o.holo.position.copy(p);
  o.holo.quaternion.copy(camera.quaternion);
  o.holo.scale.setScalar(kvardi);
  const hratt = stada === 'grip' || stada === 'tvaer';
  o.hringA.rotation.z += dt * (hratt ? 1.6 : 0.4);
  o.hringB.rotation.z -= dt * (hratt ? 0.8 : 0.15);
  o.holoEfni.opacity += (Math.max(STYRKUR[stada], birtingGloi) - o.holoEfni.opacity) * mjukt;
  o.holoEfni.color.lerp(LITUR.setHex(STADA_LITUR[stada]).multiplyScalar(1.8), mjukt);

  o.gloi.uniforms.timi.value = t;
  o.gloi.uniforms.styrkur.value += (0.12 + Math.max(STYRKUR[stada], birtingGloi) * 0.6 - o.gloi.uniforms.styrkur.value) * mjukt;
  o.gloi.uniforms.litur.value.setHex(STADA_LITUR[stada]);

  o.pulsT = Math.min(1, o.pulsT + dt / 0.45);
  o.puls.position.copy(p);
  o.puls.quaternion.copy(camera.quaternion);
  o.puls.scale.setScalar(kvardi * (1 + o.pulsT * 0.9));
  o.puls.material.opacity = (1 - o.pulsT) * 0.9;

  // kastslóð
  const fart = o.hradi.length();
  if (fart > (o.heldur ? 2 : 1.2)) o.slodPts.unshift(p.clone()); else if (o.slodPts.length) o.slodPts.pop();
  if (o.slodPts.length > SLOD_N) o.slodPts.length = SLOD_N;
  const pos = o.slod.geometry.attributes.position, lit = o.slod.geometry.attributes.color, n = o.slodPts.length;
  for (let i = 0; i < n; i++) {
    const k = (1 - i / n) * 2.4;
    pos.setXYZ(i, o.slodPts[i].x, o.slodPts[i].y, o.slodPts[i].z);
    lit.setXYZ(i, 0.37 * k, 0.88 * k, 1 * k);
  }
  o.slod.geometry.setDrawRange(0, n);
  pos.needsUpdate = lit.needsUpdate = true;

  // gagnamerki
  const r = RADIUS * s;
  o.merki.position.set(p.x + r * 1.05, p.y + r * 0.85, p.z);
  o.merki.element.classList.toggle('synilegt', stada !== 'ekkert' && o.fara === null);
  o.merki.element.dataset.stada = stada;
  if (t - o.merkiT > 0.1) {
    o.merkiT = t;
    o.merkiTexti.textContent = `${o.kvardi.toFixed(2)}× · ${camera.position.distanceTo(p).toFixed(1)} m · ${fart.toFixed(1)} m/s${o.xray ? ' · RÖNTGEN' : ''}`;
  }
}

// ---------- hendur ----------
const handir = new Map();   // auðkenni -> ástand handar (parað eftir staðsetningu, ekki Left/Right)
let naestaId = 0, sidastiTimi = -1, rakningMs = 0;
const gripir = [];          // { tegund: 'ein'|'tvaer', hlutur, hendur: [id], ... }
let zoom = null, thensla = null, tvaerKlipa = null, mus = null, kastT = -1e9;
const M = new THREE.Matrix4(), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();

/** Snúningur handar út frá raunverulegum 3D liðum (worldLandmarks) þegar þeir eru til. */
function handQ(h, ut = new THREE.Quaternion()) {
  const [a, b, c] = handGrunnur(h.wlm, h.wAspekt);
  M.makeBasis(A.set(a.x, a.y, a.z), B.set(b.x, b.y, b.z), C.set(c.x, c.y, c.z));
  return ut.setFromRotationMatrix(M);
}
/** Myndhnit (0..1) -> skjáhnit (ndc), speglað, svo punkturinn lendi nákvæmlega á hendinni í myndinni. */
function handNdc(p) {
  const { sx, sy } = skurdur();
  return { x: (0.5 - p.x) * 2 * sx, y: (0.5 - p.y) * 2 * sy };
}
/** Öfugt: skjáhnit -> myndhnit, til að teikna á handa-strigann. */
function ndcTilMyndar(n) {
  const { sx, sy } = skurdur();
  return { x: 0.5 - n.x / (2 * sx), y: 0.5 - n.y / (2 * sy) };
}
const hondIGripi = (id) => gripir.find((g) => g.hendur.includes(id));

let vinnari = null, vinnariUpptekinn = false, nyrRammi = false, rammaVakt = null;
let videoCallback = null;
let sidastaSvar = 0;
let myndRammar = 0, greindirRammar = 0, talningT = performance.now(), myndFps = 0, rakningFps = 0, svarMs = 0, handMs = 0;
// currentTime breytist ~190x/s í beinum straumi, svo það segir ekki hvort nýr rammi kom; rVFC gerir það
const HEFUR_RVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
function hlustaARamma() {
  myndRammar++; nyrRammi = true;
  greinaHendur(performance.now());
  videoCallback = video.requestVideoFrameCallback(hlustaARamma);
}
const RAKNING_BREIDD = 480; // Lófaleitin notar litla mynd; flytjum ekki 720p milli þráða.

function hreinsaHendur() {
  for (const g of [...gripir]) { g.hlutur.hradi.set(0, 0, 0); sleppa(g); }
  handir.clear();
  zoom = thensla = tvaerKlipa = null;
  yfirMork.clear(); leysirMork.clear();
  ctx.clearRect(0, 0, hendur.width, hendur.height);
  uppfaeraHud([], performance.now());
}

function rakningarVilla(e) {
  clearTimeout(rammaVakt);
  vinnari?.terminate(); vinnari = null; vinnariUpptekinn = false;
  delegateNafn = ''; rakningMs = 0;
  hreinsaHendur();
  stadaEl.textContent = `Handarakning stöðvaðist (${e.message}) – endurhlaðið síðuna; mús og lyklaborð virka áfram`;
  console.error(e);
}

/** Kallað í hverjum ramma: sendir nýjan myndavélarramma til greiningar ef ekkert er í vinnslu. */
function greinaHendur(nu) {
  if (document.hidden) return;
  const tilbuinn = vinnari && !vinnariUpptekinn;
  if (!tilbuinn || video.readyState < 2 || (HEFUR_RVFC ? !nyrRammi : video.currentTime === sidastiTimi)) return;
  nyrRammi = false;
  sidastiTimi = video.currentTime;
  // myndavélin getur skipt um upplausn eftir að hún fer í gang (stundum 2x2 fyrst)
  if (hendur.width !== video.videoWidth || hendur.height !== video.videoHeight) {
    hendur.width = video.videoWidth;
    hendur.height = video.videoHeight;
    va = video.videoWidth / video.videoHeight;
    stillaBakgrunn();
  }
  vinnariUpptekinn = true;
  const w = vinnari;
  rammaVakt = setTimeout(() => rakningarVilla(new Error('greining svaraði ekki')), sidastaSvar ? 3000 : 15000);
  createImageBitmap(video, { resizeWidth: RAKNING_BREIDD, resizeHeight: Math.round(RAKNING_BREIDD / va) })
    .then((bmp) => {
      if (vinnari !== w) { bmp.close(); return; }
      try { w.postMessage({ bmp, t: nu }, [bmp]); }
      catch (e) { bmp.close(); throw e; }
    })
    .catch((e) => { if (vinnari === w) rakningarVilla(e); });
}

function vinnaUrHondum(r, nu) {
  sidastaSvar = performance.now();
  greindirRammar++;
  svarMs = sidastaSvar - nu;
  const sest = new Set();
  const spor = [...handir.values()];
  const lofar = r.landmarks.map(lofaMidja);
  // spáð staðsetning (síðasta + hraði × tími): hröð hönd sem birtist aftur langt frá heldur auðkenni og gripi
  const spad = spor.map((h) => { const dt = Math.min(nu - h.sidast, 300) / 1000;
    return { x: h.hrarLofi.x + h.vMynd.x * dt, y: h.hrarLofi.y + h.vMynd.y * dt }; });
  const para = paraSpor(spad, lofar, 0.45);
  r.landmarks.forEach((hrar, i) => {
    let h = para[i] >= 0 ? spor[para[i]] : null;
    if (!h) {
      h = { id: ++naestaId, mykir: new Mykir(), mykirW: new Mykir(), stada: new HandStada(), dyptSia: new Sia1D(3, 2.5),
        kSia: new Sia1D(3, 3), uSia: new Sia1D(3, 3), bend: new BendingaHald(), hnefi: false, zoom: false, v: { x: 0, y: 0 }, vMynd: { x: 0, y: 0 }, sidastYfir: null, sidast: nu };
      handir.set(h.id, h);
    }
    if (h.hrarLofi) { // hraði í myndhnitum (á sek) fyrir spána hér að ofan
      const dtm = Math.max((nu - h.sidast) / 1000, 1e-3);
      h.vMynd.x += ((lofar[i].x - h.hrarLofi.x) / dtm - h.vMynd.x) * 0.6;
      h.vMynd.y += ((lofar[i].y - h.hrarLofi.y) / dtm - h.vMynd.y) * 0.6;
    }
    h.hrarLofi = lofar[i];
    sest.add(h.id);
    const fyrr = { hnefi: h.hnefi, zoom: h.zoom, thensla: h.thensla };
    h.lm = h.mykir.update(hrar, nu);              // myndhnit: staðsetning á skjá og teikning
    // worldLandmarks: liðir í raunverulegum metrum (3D). Kreppa, klípa og snúningur verða miklu áreiðanlegri
    // en úr flötum myndhnitum, sérstaklega þegar höndin hallar. Án þeirra (t.d. í prófunum) er notað myndhnit.
    const heimur = r.worldLandmarks?.[i];
    h.wlm = heimur?.length === 21 ? h.mykirW.update(heimur, nu) : h.lm;
    h.wAspekt = heimur?.length === 21 ? 1 : va;
    const n = handNdc(lofaMidja(h.lm));
    if (h.ndc) {
      const dtv = Math.max((nu - h.sidast) / 1000, 1e-3);
      h.v.x += ((n.x - h.ndc.x) / dtv - h.v.x) * 0.5;
      h.v.y += ((n.y - h.ndc.y) / dtv - h.v.y) * 0.5;
    }
    h.ndc = n;
    h.sidast = nu;
    h.saest = sidastaSvar;
    h.yfir = naestiHlutur(n.x, n.y);
    if (h.yfir) h.sidastYfir = { hlutur: h.yfir, t: nu };
    // dýpt: stærð handar Í MYNDINNI (síuð á log-skala); 5% suð = 5% stökk í fjarlægð ef ósíað
    h.staerdF = Math.exp(h.dyptSia.update(Math.log(handStaerd(h.lm, va)), nu));
    const g = heimur?.length === 21 ? flokkaBendingu(heimur) : flokkaBendingu(hrar, va);
    h.bending = g?.categoryName ?? 'None';
    h.vissa = g?.score ?? 0;
    // Flokka hráa liði: síun fyrir teikningu má ekki bæta töf ofan á staðfestingu bendingar.
    Object.assign(h, h.stada.update(heimur?.length === 21 ? heimur : hrar, h.bending, h.vissa, h.wAspekt, nu));
    h.kF = h.kSia.update(h.klipuHlutfall, nu);
    h.nyrHnefi = h.hnefi && !fyrr.hnefi;
    h.nyttZoom = h.zoom && !fyrr.zoom;
    h.uF = h.uSia.update(h.utbreidsla, nu);
    h.nyThensla = h.thensla && !fyrr.thensla;
  });
  for (const [k, h] of handir) if (!sest.has(k) && nu - h.sidast > 600) handir.delete(k);
  const synilegar = [...handir].filter(([k]) => sest.has(k));
  stjorna(synilegar, nu, sest);

  ctx.clearRect(0, 0, hendur.width, hendur.height);
  for (const [id, h] of handir) if (sidastaSvar - h.saest <= 150) teiknaHond(id, h);
  teiknaTaugar();
  handMs = performance.now() - sidastaSvar;
  svarMs = performance.now() - nu;
}

/**
 * Kasthraði = tilfærsla handar yfir ~120 ms glugga (ekki hraði eins ramma, sem er fullur af suði).
 * Síðustu rammarnir eru sleppt þegar höndin opnaðist, því þá hægir hún á sér.
 */
function kastHradi(saga, sleppaMs) {
  const sidast = saga.at(-1)?.t ?? 0;
  const s = saga.filter((e) => e.t <= sidast - sleppaMs);
  const nyjast = s.at(-1);
  const elst = nyjast && (s.find((e) => e !== nyjast && nyjast.t - e.t <= 120) || s.at(-2));
  const v = new THREE.Vector3();
  if (!elst || nyjast.t - elst.t < 30 || nyjast.t - elst.t > 250) return v;
  v.subVectors(nyjast.p, elst.p).divideScalar((nyjast.t - elst.t) / 1000);
  v.z *= 0.5;                                // dýptin er óáreiðanlegasti ásinn
  return v.length() < 0.4 ? v.set(0, 0, 0)   // rólegt slepp = hluturinn verður kyrr og svífur
    : v.clampLength(0, 10);
}

function sleppa(g) {
  const i = gripir.indexOf(g);
  if (i < 0) return;
  gripir.splice(i, 1);
  g.hlutur.heldur = null;
}

function byrjaGrip(h, id, o, nu, hljodlaust = false) {
  const d0 = camera.position.distanceTo(o.group.position);
  const q = handQ(h);
  gripir.push({
    tegund: 'ein', hlutur: o, hendur: [id], d0, s0: h.staerdF,
    offset: o.group.position.clone().sub(geislaPunktur(h.ndc.x, h.ndc.y, d0)),
    qH: q, qH0inv: q.clone().invert(), qO0: o.group.quaternion.clone(), saga: [],
  });
  o.heldur = { stada: o.group.position.clone(), snuningur: o.group.quaternion.clone() };
  o.kalla = null; o.kallaQ = false;
  o.hradi.set(0, 0, 0); o.snHradi.set(0, 0, 0);
  virkur = o;
  if (!hljodlaust) gripAhrif(o);
}

/** Vigur milli handa á dýpt d (dýptarmunur út frá stærðarmun handa) og miðpunktur þeirra. */
function tvaerVigur(ha, hb, d) {
  const pa = geislaPunktur(ha.ndc.x, ha.ndc.y, d), pb = geislaPunktur(hb.ndc.x, hb.ndc.y, d);
  const v = new THREE.Vector3().subVectors(pb, pa);
  v.z += Math.log(hb.staerdF) - Math.log(ha.staerdF); // stærri hönd = nær
  return { v, mid: pa.add(pb).multiplyScalar(0.5) };
}
/** Bil milli handa á skjá deilt með handarstærð: óháð því hvort báðar hendur færast nær. */
const skjaBil = (ha, hb) => Math.hypot((ha.ndc.x - hb.ndc.x) * camera.aspect, ha.ndc.y - hb.ndc.y) / Math.sqrt(ha.staerdF * hb.staerdF);

function byrjaTvaer(g, nu) {
  const [ha, hb] = g.hendur.map((id) => handir.get(id)), o = g.hlutur;
  g.tegund = 'tvaer';
  g.d0 = camera.position.distanceTo(o.group.position);
  g.sz0 = Math.sqrt(ha.staerdF * hb.staerdF);
  const { v, mid } = tvaerVigur(ha, hb, g.d0);
  g.v0 = v.normalize();
  g.bil0 = Math.max(skjaBil(ha, hb), 1e-3);
  g.q0 = o.group.quaternion.clone();
  g.s0 = o.staerdMark;
  g.offset = o.group.position.clone().sub(mid);
  g.tFyrri = nu;
  o.pulsT = 0;
  hljod(600, 1400, 0.12, 0.05);
}

/**
 * Einátta stærðarbending. att=-1: gildið (klípubil) lækkar = minnka; att=1: gildið (útbreiðsla) hækkar = stækka.
 * "best" er lengsta sem höndin hefur náð; bakki hún um >0.15 byrjar ný umferð frá núverandi stærð.
 */
function staerdBending(st, stadaLykill, nyLykill, gildiLykill, att, naemni, synilegar, nu) {
  if (st && (!handir.has(st.lykill) || st.hlutur.fara !== null)) st = null;
  if (st && !handir.get(st.lykill)[stadaLykill]) {
    const h = handir.get(st.lykill);
    // Full glenna lýkur bendingunni en síðasta sýnið þarf samt að stækka hlutinn.
    if (stadaLykill === 'thensla' && h.utbreidsla > 0.6 && synilegar.some(([id]) => id === st.lykill)) {
      st.hlutur.staerdMark = klemma(st.s0 * Math.exp((Math.max(st.best, h.utbreidsla) - st.v0) * naemni));
    }
    return null;
  }
  if (!st) {
    const ny = synilegar.find(([, h]) => h[nyLykill]);
    const mark = ny && (ny[1].yfir || virkur);
    if (!mark) return null;
    const v = ny[1][gildiLykill];
    st = { lykill: ny[0], hlutur: mark, v0: v, best: v, s0: mark.staerdMark, fyrir: mark.staerdMark, t0: nu };
  }
  if (!synilegar.some(([id]) => id === st.lykill)) return st;
  const v = handir.get(st.lykill)[gildiLykill];
  if ((v - st.best) * att > 0) st.best = v;
  else if ((st.best - v) * att > 0.15) { st.s0 = st.hlutur.staerdMark; st.v0 = st.best = v; }
  st.hlutur.staerdMark = klemma(st.s0 * Math.exp((st.best - st.v0) * naemni));
  return st;
}

function framkvaema(skipun, h) {
  const mark = h.yfir || virkur;
  if (skipun === 'xray' && mark) { setjaXray(mark, !mark.xray); mark.pulsT = 0; hljod(500, 800, 0.15, 0.04); }
  if (skipun === 'nyr') birtaNaesta(geislaPunktur(h.ndc.x, h.ndc.y, 4));
  if (skipun === 'eyda') eyda(mark);
  if (skipun === 'nullstilla') nullstilla();
}

function stjorna(synilegar, nu, sest) {
  // 1. sleppa: hnefi opnaður eða höndin hvarf (t.d. hreyfiþoka í hröðu kasti)
  for (const g of [...gripir]) {
    const lifandi = g.hendur.filter((id) => { const h = handir.get(id); return h && h.hnefi && nu - h.sidast <= TYND_SLEPPIR; });
    if (lifandi.length === g.hendur.length) continue;
    if (g.tegund === 'tvaer' && lifandi.length === 1) { // önnur höndin sleppti: hin heldur áfram
      sleppa(g);
      byrjaGrip(handir.get(lifandi[0]), lifandi[0], g.hlutur, nu, true);
      continue;
    }
    const h0 = handir.get(g.hendur[0]);
    g.hlutur.hradi.copy(g.tegund === 'ein' ? kastHradi(g.saga, h0 && !h0.hnefi ? 100 : 0) : V.set(0, 0, 0));
    if (g.hlutur.hradi.lengthSq() > 0) kastT = nu;
    sleppa(g);
    hljod(900, 420);
  }

  // 2. nýtt grip (eða önnur hönd á sama hlut = tveggja handa stjórn)
  for (const [id, h] of synilegar) {
    if (!h.nyrHnefi || hondIGripi(id)) continue;
    // hönd á leið í hnefa fór kannski í gegnum zoom-stöðu: afturkalla þá stærðarbreytingu
    if (zoom?.lykill === id) { if (nu - zoom.t0 < 600) zoom.hlutur.staerdMark = zoom.fyrir; zoom = null; }
    if (thensla?.lykill === id) { if (nu - thensla.t0 < 600) thensla.hlutur.staerdMark = thensla.fyrir; thensla = null; }
    // lófinn færist meðan höndin krepptist, svo "yfir hlutnum rétt áðan" dugar
    const o = h.sidastYfir && nu - h.sidastYfir.t <= GRIP_NAD ? h.sidastYfir.hlutur : null;
    if (!o || o.fara !== null || mus?.hlutur === o) continue;
    const til = gripir.find((g) => g.hlutur === o);
    if (til?.tegund === 'ein') { til.hendur.push(id); byrjaTvaer(til, nu); } else if (!til) byrjaGrip(h, id, o, nu);
  }

  // 3. uppfæra grip, bara ef hendurnar sáust í þessum ramma (annars gömul staða með nýjum tíma = falskur hraði)
  for (const g of gripir) {
    const o = g.hlutur;
    if (g.tegund === 'ein' && sest.has(g.hendur[0])) {
      const h = handir.get(g.hendur[0]);
      const saga = g.saga, dtv = saga.length ? Math.max((nu - saga.at(-1).t) / 1000, 1e-3) : 1 / 30;
      // stærri hönd í mynd = nær myndavél = hluturinn kemur nær
      const d = THREE.MathUtils.clamp(g.d0 * g.s0 / Math.max(h.staerdF, 1e-3), MIN_FJ, MAX_FJ);
      const p = geislaPunktur(h.ndc.x, h.ndc.y, d);
      saga.push({ t: nu, p: p.clone() });       // kast mælt af höndinni sjálfri, án tilfærslunnar inn í lófann
      if (saga.length > 20) saga.shift();
      g.offset.multiplyScalar(Math.exp(-5 * dtv)); // hluturinn dregst inn í lófann
      o.heldur.stada.copy(p).add(g.offset);
      const qNy = handQ(h, Q2);
      // Hunsa stakt stórt stökk, en samþykkja nýja stöðu ef næsta sýni staðfestir hana.
      if (g.qH.angleTo(qNy) < 1 || g.qSidast?.angleTo(qNy) < 0.25) g.qH.slerp(qNy, 1 - Math.exp(-20 * dtv));
      (g.qSidast ??= new THREE.Quaternion()).copy(qNy);
      o.heldur.snuningur.copy(g.qH).multiply(g.qH0inv).multiply(g.qO0);
    } else if (g.tegund === 'tvaer' && g.hendur.every((id) => sest.has(id))) {
      const [ha, hb] = g.hendur.map((id) => handir.get(id));
      const dtv = Math.max((nu - g.tFyrri) / 1000, 1e-3);
      g.tFyrri = nu;
      const d = THREE.MathUtils.clamp(g.d0 * g.sz0 / Math.sqrt(ha.staerdF * hb.staerdF), MIN_FJ, MAX_FJ);
      const { v, mid } = tvaerVigur(ha, hb, d);
      o.staerdMark = klemma(g.s0 * skjaBil(ha, hb) / g.bil0);
      o.heldur.snuningur.copy(Q.setFromUnitVectors(g.v0, v.normalize())).multiply(g.q0);
      g.offset.multiplyScalar(Math.exp(-5 * dtv));
      o.heldur.stada.copy(mid).add(g.offset);
    }
  }

  // 4. opinn lófi strokinn hratt yfir lausan hlut = snúa honum (eins og að snúa hnetti)
  for (const [, h] of synilegar) {
    const o = h.yfir;
    const strok = o && !o.heldur && !h.hnefi && !h.zoom && !h.thensla && !h.klipa && Math.hypot(h.v.x, h.v.y) > 1.6;
    if (strok) {
      o.snHradi.y = THREE.MathUtils.clamp(o.snHradi.y + h.v.x * 0.25, -14, 14);
      o.snHradi.x = THREE.MathUtils.clamp(o.snHradi.x - h.v.y * 0.25, -14, 14);
      o.kallaQ = false;
      if (!h.strokid) hljod(300, 650, 0.12, 0.03);
    }
    h.strokid = !!strok;
  }

  // 5. ☝️ leysir: geisli frá vísifingri; haldið á hlut = kalla hann til sín
  leysirMork = new Set();
  for (const [id, h] of synilegar) {
    const bendir = h.bending === 'Pointing_Up' && h.vissa >= 0.55 && !h.hnefi && !hondIGripi(id);
    if (!bendir) { h.leysir = null; h.leysirHlutur = null; continue; }
    const fra = handNdc(h.lm[INDEX_TIP]), hnui = handNdc(h.lm[INDEX_MCP]);
    let dx = (fra.x - hnui.x) * camera.aspect, dy = fra.y - hnui.y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    let best = null, bt = Infinity;
    for (const o of virkir()) {
      const s = skjaHlutur(o);
      const wx = (s.x - fra.x) * camera.aspect, wy = s.y - fra.y, t = wx * dx + wy * dy;
      if (t > 0 && Math.abs(wx * dy - wy * dx) < s.r * 1.1 + 0.04 && t < bt) { bt = t; best = o; }
    }
    const lengd = best ? bt : 4;
    h.leysir = { fra, til: { x: fra.x + (dx * lengd) / camera.aspect, y: fra.y + dy * lengd }, hlutur: best, framvinda: 0 };
    if (best !== h.leysirHlutur) { h.leysirHlutur = best; h.leysirT0 = nu; h.leysirKallad = false; }
    if (best) {
      leysirMork.add(best);
      virkur = best;
      h.leysir.framvinda = Math.min(1, (nu - h.leysirT0) / KALLA_TIMI);
      if (!h.leysirKallad && h.leysir.framvinda >= 1) { kalla(best); h.leysirKallad = true; }
    }
  }

  // 6. skipanir: halda ✌️ 👍 👎 🤟
  for (const [id, h] of synilegar) {
    const upptekin = h.hnefi || hondIGripi(id) || h.zoom || h.thensla;
    h.skipunStada = h.bend.update(upptekin ? null : h.bending, h.vissa, nu);
    if (h.skipunStada.skipun) framkvaema(h.skipunStada.skipun, h);
  }

  // 7. tvær hendur að klípa: fjarlægð milli þeirra stýrir stærð virks hlutar
  const klipur = synilegar.filter(([id, h]) => h.klipa && !h.thensla && !hondIGripi(id));
  if (klipur.length === 2 && (tvaerKlipa || virkur)) {
    const [a, b] = klipur.map(([, h]) => klipuPunktur(h.lm));
    if (!tvaerKlipa) tvaerKlipa = { hlutur: virkur, sia: new Sia1D(1, 1), s0: virkur.staerdMark };
    const d = tvaerKlipa.sia.update(fjarlaegd(a, b, va), nu);
    tvaerKlipa.d0 ??= Math.max(d, 1e-3);
    tvaerKlipa.hlutur.staerdMark = klemma(tvaerKlipa.s0 * d / tvaerKlipa.d0);
    zoom = thensla = null;
  } else tvaerKlipa = null;

  // 8. ein hönd: klípa saman = minnka; allir gómar saman og glennt út = stækka.
  //    Hvor um sig virkar bara í eina átt og má endurtaka (opna klípuna og klípa aftur = minnka meira).
  if (!tvaerKlipa) {
    zoom = staerdBending(zoom, 'zoom', 'nyttZoom', 'kF', -1, ZOOM_NAEMNI, synilegar, nu);
    thensla = staerdBending(thensla, 'thensla', 'nyThensla', 'uF', 1, THENSLA_NAEMNI, synilegar, nu);
  }

  yfirMork = new Set(synilegar.map(([, h]) => h.yfir).filter(Boolean));
  uppfaeraHud(synilegar, nu);
}

// ---------- teikning handa (drawingUtils, eins og verkefnið biður um) ----------
function texti(str, x, y, litur) {
  // striginn er speglaður með CSS, svo texti er speglaður aftur til að lesast rétt
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = litur;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

function teiknaHond(id, h) {
  const W = hendur.width, H = hendur.height, lm = h.lm;
  const litur = hondIGripi(id) ? CSS.skaer : h.leysir ? CSS.raudur : h.zoom || h.thensla || h.klipa ? CSS.gulur : CSS.blar;
  ctx.save();
  ctx.shadowColor = litur;
  ctx.shadowBlur = 14;
  drawingUtils.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { color: litur, lineWidth: 3 });
  if (h.zoom || h.klipa) drawingUtils.drawConnectors(lm, [{ start: THUMB_TIP, end: INDEX_TIP }], { color: CSS.gulur, lineWidth: 2 });
  drawingUtils.drawLandmarks(lm, { color: litur, fillColor: '#06121a', lineWidth: 2, radius: 3 });
  ctx.strokeStyle = litur;
  ctx.lineWidth = 1.5;
  for (const i of GOMAR) { ctx.beginPath(); ctx.arc(lm[i].x * W, lm[i].y * H, 9, 0, Math.PI * 2); ctx.stroke(); }
  const p = lofaMidja(lm), px = p.x * W, py = p.y * H;
  if (h.yfir && !h.hnefi && !h.leysir) { // "læsing" á lófa yfir hlut
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(px, py, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  // framvinduhringur fyrir haldskipun
  const sk = h.skipunStada;
  if (sk?.nafn) {
    ctx.strokeStyle = CSS.gulur; ctx.shadowColor = CSS.gulur; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(px, py, 46, -Math.PI / 2, -Math.PI / 2 + sk.framvinda * Math.PI * 2); ctx.stroke();
    texti(SKIPUN_TEXTI[sk.nafn], px, py - 58, CSS.gulur);
  }
  // leysigeisli
  if (h.leysir) {
    const a = ndcTilMyndar(h.leysir.fra), b = ndcTilMyndar(h.leysir.til);
    const grad = ctx.createLinearGradient(a.x * W, a.y * H, b.x * W, b.y * H);
    grad.addColorStop(0, CSS.raudur);
    grad.addColorStop(1, h.leysir.hlutur ? CSS.raudur : 'rgba(255,77,109,0)');
    ctx.strokeStyle = grad; ctx.shadowColor = CSS.raudur; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H); ctx.stroke();
    if (h.leysir.hlutur) {
      ctx.strokeStyle = CSS.raudur; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x * W, b.y * H, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.x * W, b.y * H, 22, -Math.PI / 2, -Math.PI / 2 + h.leysir.framvinda * Math.PI * 2); ctx.stroke();
      if (h.leysir.framvinda < 1) texti('KALLA', b.x * W, b.y * H - 32, CSS.raudur);
    }
  }
  ctx.restore();
}

function teiknaTaugar() {
  const W = hendur.width, H = hendur.height;
  ctx.save();
  ctx.strokeStyle = CSS.blar; ctx.shadowColor = CSS.blar; ctx.shadowBlur = 10;
  ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
  for (const g of gripir) {
    const m = ndcTilMyndar(skjaHlutur(g.hlutur));
    ctx.beginPath();
    for (const id of g.hendur) {
      const h = handir.get(id);
      if (!h) continue;
      const p = lofaMidja(h.lm);
      ctx.moveTo(p.x * W, p.y * H);
      ctx.lineTo(m.x * W, m.y * H);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- HUD ----------
function uppfaeraHud(synilegar, nu) {
  const virk = new Set();
  let lysing = null;
  const tvoGrip = gripir.find((g) => g.tegund === 'tvaer');
  if (tvoGrip) { virk.add('tvaerGrip'); lysing ??= `Tveggja handa stjórn: ${tvoGrip.hlutur.nafn}`; }
  if (gripir.length) { virk.add('grip'); lysing ??= gripir.length > 1 ? `Heldur á ${gripir.length} hlutum` : `Heldur á: ${gripir[0].hlutur.nafn}`; }
  if (tvaerKlipa) { virk.add('tvaer'); lysing ??= 'Tveggja handa klípa'; }
  if (zoom) { virk.add('zoom'); lysing ??= `Minnka: ${zoom.hlutur.nafn}`; }
  if (thensla) { virk.add('thensla'); lysing ??= `Stækka: ${thensla.hlutur.nafn}`; }
  for (const [, h] of synilegar) {
    if (h.leysir) { virk.add('leysir'); lysing ??= h.leysir.hlutur ? `Miðar á: ${h.leysir.hlutur.nafn}` : 'Leysir'; }
    if (h.skipunStada?.nafn) { virk.add(SKIPUN_LISTI[h.skipunStada.nafn]); lysing ??= `Haltu: ${SKIPUN_TEXTI[h.skipunStada.nafn].toLowerCase()}`; }
    if (h.strokid) virk.add('strok');
  }
  if (nu - kastT < 600) { virk.add('kast'); lysing ??= 'Kastað!'; }
  lysing ??= synilegar.length ? (yfirMork.size ? 'Kreppa hnefa til að grípa' : `${synilegar.length === 2 ? 'Tvær hendur' : 'Hönd'} sést`) : 'Engin hönd';
  if (adgerdEl.textContent !== lysing) adgerdEl.textContent = lysing;
  skyringar.forEach((li) => li.classList.toggle('virk', virk.has(li.dataset.a)));
}

// ---------- mús og lyklaborð (virkar líka án myndavélar) ----------
const geisli = new THREE.Raycaster();
const musNdc = (e) => ({ x: (e.clientX / innerWidth) * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 });
/** Kúlupróf í stað mesh-raycast: línur hafa breiðan raycast-þröskuld og myndu hitta allt. */
function musHlutur(e) {
  const n = musNdc(e);
  geisli.setFromCamera(n, camera);
  let best = null, bt = Infinity;
  for (const o of virkir()) {
    const c = o.group.position, r = RADIUS * o.group.scale.x * 0.9;
    if (geisli.ray.distanceSqToPoint(c) < r * r) {
      const t = geisli.ray.origin.distanceTo(c);
      if (t < bt) { bt = t; best = o; }
    }
  }
  return { n, o: best };
}
sena.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary || e.button !== 0 || mus) return;
  const { n, o } = musHlutur(e);
  if (!o || gripir.some((g) => g.hlutur === o)) return;
  const d0 = camera.position.distanceTo(o.group.position);
  mus = { hlutur: o, d0, pointerId: e.pointerId, offset: o.group.position.clone().sub(geislaPunktur(n.x, n.y, d0)) };
  o.heldur = { stada: o.group.position.clone(), snuningur: null };
  o.kalla = null;
  o.hradi.set(0, 0, 0);
  virkur = o;
  sena.setPointerCapture(e.pointerId);
  sena.classList.add('heldur');
  gripAhrif(o);
});
sena.addEventListener('pointermove', (e) => {
  if (mus) {
    if (e.pointerId !== mus.pointerId) return;
    const n = musNdc(e);
    geislaPunktur(n.x, n.y, mus.d0, mus.hlutur.heldur.stada).add(mus.offset);
  } else {
    musYfir = musHlutur(e).o;
    if (musYfir) virkur = musYfir;
  }
});
function musSleppir(e) {
  if (!mus) return;
  if (e?.pointerId !== undefined && e.pointerId !== mus.pointerId) return;
  const { pointerId } = mus;
  if (e?.type === 'pointercancel' || e?.type === 'lostpointercapture' || e?.type === 'blur') mus.hlutur.hradi.set(0, 0, 0);
  mus.hlutur.heldur = null; // hraðinn sem mældist meðan haldið var heldur áfram = kast
  mus = null;
  if (sena.hasPointerCapture(pointerId)) sena.releasePointerCapture(pointerId);
  sena.classList.remove('heldur');
  hljod(900, 420);
}
sena.addEventListener('pointerup', musSleppir);
sena.addEventListener('pointercancel', musSleppir);
sena.addEventListener('lostpointercapture', musSleppir);
addEventListener('blur', musSleppir);
sena.addEventListener('wheel', (e) => {
  e.preventDefault();
  const o = mus?.hlutur || musHlutur(e).o;
  const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
  if (o) { virkur = o; o.staerdMark = klemma(o.staerdMark * Math.exp(-delta * 0.0015)); }
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  const k = e.key.toLowerCase();
  if (k === 'r') nullstilla();
  if (k === 'n') birtaNaesta(new THREE.Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 0.8, -0.3));
  if (k === 'x' && virkur) setjaXray(virkur, !virkur.xray);
  if (e.key === 'Delete' || e.key === 'Backspace') eyda(virkur);
});
$('nullstilla').addEventListener('click', nullstilla);

// ---------- MediaPipe ----------
// lágir þröskuldar: rakning heldur höndinni frekar en að missa hana og leita upp á nýtt (hæga lófaleitin)
const VALKOSTIR = { runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.3, minTrackingConfidence: 0.3 }; // lágt: óskýr hönd á hraðferð á að haldast í rakningu, ekki falla út

/** Rakning keyrir eingöngu í worker: líkanið má aldrei stöðva teikningu eða mús. */
function raesaVinnara() {
  return new Promise((leysa, hafna) => {
    const w = new Worker(new URL('./greinir-worker.js', import.meta.url));
    let tilbuinn = false;
    const villa = (e) => {
      clearTimeout(vakt);
      if (tilbuinn) { if (vinnari === w) rakningarVilla(e); }
      else { w.terminate(); hafna(e); }
    };
    const vakt = setTimeout(() => villa(new Error('worker ræsing svaraði ekki')), 30000);
    w.onerror = (e) => villa(new Error(e.message || 'worker villa'));
    w.onmessageerror = () => villa(new Error('worker skilaboð skemmdust'));
    w.onmessage = (e) => {
      if (e.data.villa) { villa(new Error(e.data.villa)); return; }
      if (e.data.tilbuinn) { clearTimeout(vakt); tilbuinn = true; vinnari = w; leysa(e.data.tilbuinn); return; }
      if (vinnari !== w) return;
      clearTimeout(rammaVakt);
      vinnariUpptekinn = false;
      if (!e.data.r) return;
      if (document.hidden) return;
      rakningMs += (e.data.ms - rakningMs) * 0.1;
      vinnaUrHondum(e.data.r, e.data.t);
      greinaHendur(performance.now());
    };
    w.postMessage({ init: true, mpModul: MP_MODUL, mpWasm: MP_URL, likan: LIKAN_URL, valkostir: VALKOSTIR });
  });
}

let delegateNafn = '';
let myndStraumur = null;
async function byrja() {
  try {
    // 30 fps: rakningin nær ekki meira, og 60 fps styttir lýsingartíma = dekkri, óskýrari mynd = hönd tapast
    const straumur = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 }, facingMode: 'user' },
    });
    myndStraumur = straumur;
    straumur.getVideoTracks()[0]?.addEventListener('ended', () => rakningarVilla(new Error('myndavélin aftengd')), { once: true });
    video.srcObject = straumur;
    await video.play();
    if (HEFUR_RVFC) videoCallback = video.requestVideoFrameCallback(hlustaARamma);
    scene.background = videoTex;
    scene.backgroundIntensity = 0.9;
    stadaEl.textContent = 'Hleð inn handalíkani…';
    try {
      delegateNafn = `${await raesaVinnara()}, worker`;
    } catch (e) {
      rakningarVilla(e); return;
    }
    const delegate = delegateNafn;
    const fpsMyndavel = straumur.getVideoTracks()[0]?.getSettings().frameRate;
    stadaEl.textContent = `Kerfi virkt · ${delegate} · ${fpsMyndavel ? Math.round(fpsMyndavel) + ' fps myndavél · ' : ''}allt að 2 hendur`;
  } catch (e) {
    myndStraumur?.getTracks().forEach((track) => track.stop()); myndStraumur = null;
    stadaEl.textContent = `Myndavél ekki tiltæk (${e.message}) – notaðu mús og lyklaborð`;
    console.error(e);
  }
}
byrja();
addEventListener('visibilitychange', () => { if (document.hidden) { musSleppir({type:'blur'}); hreinsaHendur(); } });
addEventListener('pagehide', () => {
  clearTimeout(rammaVakt);
  vinnari?.terminate(); vinnari = null;
  vinnariUpptekinn = nyrRammi = false; sidastaSvar = 0;
  if (videoCallback !== null) video.cancelVideoFrameCallback(videoCallback);
  videoCallback = null;
  myndStraumur?.getTracks().forEach((track) => track.stop());
  hreinsaHendur();
});
addEventListener('pageshow', (e) => { if (e.persisted) byrja(); });

// ræsing: hlutirnir birtast einn af öðrum
[[0, 0, 0], [-1.7, 0.15, -0.4], [1.7, 0.15, -0.4]].forEach((p, i) =>
  setTimeout(() => birtaNaesta(new THREE.Vector3(...p)), 250 + i * 320));

// ---------- lykkja ----------
let sidastT = 0, teikniT = 0, rammaMs = 1000 / 60;
renderer.setAnimationLoop((t) => {
  if (!HEFUR_RVFC) greinaHendur(performance.now());
  // 60 teikningar/s skilja GPU-tíma eftir fyrir handalíkanið á 120–240 Hz skjám.
  const bil = 1000 / 60;
  const skref = Math.floor((t - teikniT + 0.5) / bil);
  if (skref < 1) return;
  teikniT += skref * bil;
  const lidinn = sidastT ? t - sidastT : 1000 / 60;
  const dt = THREE.MathUtils.clamp(lidinn / 1000, 1e-3, 0.05);
  sidastT = t;
  const ts = t / 1000;
  if (handir.size && performance.now() - sidastaSvar > 400) hreinsaHendur();
  for (const o of hlutir) uppfaeraHlut(o, dt, ts);
  arekstrar(ts);
  for (let i = hlutir.length - 1; i >= 0; i--) {
    if (hlutir[i].fara >= 1) { takaUrSenu(hlutir[i], scene); hlutir.splice(i, 1); }
  }
  for (const o of hlutir) uppfaeraUtlit(o, dt, ts);
  agnir.uppfaera(dt);

  if (sud) {
    const haldinn = gripir[0]?.hlutur ?? mus?.hlutur;
    const tn = hljodCtx.currentTime;
    sud.g.gain.setTargetAtTime(haldinn ? 0.018 : 0, tn, 0.1);
    sud.o.frequency.setTargetAtTime(55 + (haldinn ? haldinn.hradi.length() * 30 : 0), tn, 0.1);
  }

  rammaMs += (lidinn - rammaMs) * 0.05;
  const nu = performance.now();
  if (nu - talningT >= 1000) {
    myndFps = myndRammar * 1000 / (nu - talningT);
    rakningFps = greindirRammar * 1000 / (nu - talningT);
    myndRammar = greindirRammar = 0; talningT = nu;
  }
  if (Math.floor(ts * 4) !== Math.floor((ts - dt) * 4)) {
    const hendurSest = [...handir.values()].filter((h) => nu - h.saest < 200).length;
    afkostEl.textContent = `${Math.round(1000 / rammaMs)} fps · rakning ${rakningMs.toFixed(0)} ms${delegateNafn ? ` (${delegateNafn})` : ''} · ${hendurSest} hendur · ${virkir().length} hlutir`;
    rakningAfkostEl.textContent = delegateNafn ? `Myndavél ${Math.round(myndFps)} r/s · greining ${Math.round(rakningFps)} r/s · töf ${Math.round(svarMs)} ms` : '';
  }

  composer.render(dt);
  merkjaRenderer.render(scene, camera);
});

// fyrir prófanir í vafra
window.__kerfi = { hlutir, gripir, handir, camera, get virkur() { return virkur; },
  get afkost() { return { renderFps: 1000 / rammaMs, trackingMs: rakningMs, trackingFps: rakningFps, cameraFps: myndFps, latencyMs: svarMs, controlMs: handMs }; },
  birtaNaesta, eyda, setjaXray, nullstilla };
