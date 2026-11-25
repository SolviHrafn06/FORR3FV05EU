import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
import { HandStada, Mykir, Sia1D, paraSpor, lofaMidja, klipuPunktur, handStaerd, handGrunnur, fjarlaegd, THUMB_TIP, INDEX_TIP, INDEX_MCP } from './hond.js';
import { BendingaHald } from './bendingar.js';
import { aresktur } from './edlisfraedi.js';
import { Agnir } from './agnir.js';
import { SKRA, RADIUS, LITIR, SLOD_N, buaTilHlut, setjaISenu, takaUrSenu, setjaXray } from './hlutir.js';

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const LIKAN_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const MIN_STAERD = 0.3, MAX_STAERD = 3.5;
const MIN_FJ = 1.5, MAX_FJ = 9;   // fjarlægð hluta frá myndavél
const GOLF = -1.4;
const ZOOM_NAEMNI = 2.0;          // stærð = s0 * e^(breyting á klípubili * þetta)
const TYND_SLEPPIR = 120;         // ms: ef gríphöndin hverfur (hreyfiþoka í kasti) sleppir hún strax
const GRIP_NAD = 350;             // ms: hönd sem var yfir hlut rétt áður en hún krepptist má grípa
const KALLA_TIMI = 900;           // ms: miða leysi á hlut svona lengi = kalla hann til sín
const MAX_HLUTIR = 8;
const CSS = { blar: '#5fe0ff', skaer: '#2fc8ff', gulur: '#ffb35c', hvitur: '#e8fbff', raudur: '#ff4d6d' };
const GOMAR = [4, 8, 12, 16, 20];
const SKIPUN_TEXTI = { Victory: 'RÖNTGEN', Thumb_Up: 'NÝR HLUTUR', Thumb_Down: 'EYÐA', ILoveYou: 'ENDURSTILLA' };
const SKIPUN_LISTI = { Victory: 'xray', Thumb_Up: 'nyr', Thumb_Down: 'eyda', ILoveYou: 'nullstilla' };

const $ = (id) => document.getElementById(id);
const stadaEl = $('stada'), adgerdEl = $('adgerd'), afkostEl = $('afkost'), sena = $('sena');
const video = $('video'), hendur = $('hendur'), ctx = hendur.getContext('2d');
const drawingUtils = new DrawingUtils(ctx);

// ---------- three.js: myndavélin er bakgrunnur INNI í senunni svo bloom virki á hólógrömin ----------
const renderer = new THREE.WebGLRenderer({ canvas: sena, powerPreference: 'high-performance' });
const PR = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(PR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1116);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
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
  composer.setSize(innerWidth, innerHeight);
  merkjaRenderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
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
  if (tvaerKlipa?.hlutur === o) tvaerKlipa = null;
  if (virkur === o) virkur = null;
  agnir.spraut(o.group.position, 450, { radius: RADIUS * o.group.scale.x, hradi: 2.8, lif: 1.1, litur: LITIR.gulur, styrkur: 3.5 });
  hljod(1200, 80, 0.5, 0.05);
}

function nullstilla() {
  for (const o of hlutir) {
    if (o.fara !== null) continue;
    o.kalla = o.heima.clone();
    o.kallaQ = true;
    o.staerdMark = 1;
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
  if (zoom?.hlutur === o || tvaerKlipa?.hlutur === o) return 'zoom';
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
let naestaId = 0, greinir = null, sidastiTimi = -1, rakningMs = 0;
const gripir = [];          // { tegund: 'ein'|'tvaer', hlutur, hendur: [id], ... }
let zoom = null, tvaerKlipa = null, mus = null, kastT = -1e9;
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

function greinaHendur(nu) {
  if (!greinir || video.readyState < 2 || video.currentTime === sidastiTimi) return;
  sidastiTimi = video.currentTime;
  // myndavélin getur skipt um upplausn eftir að hún fer í gang (stundum 2x2 fyrst)
  if (hendur.width !== video.videoWidth || hendur.height !== video.videoHeight) {
    hendur.width = video.videoWidth;
    hendur.height = video.videoHeight;
    va = video.videoWidth / video.videoHeight;
    stillaBakgrunn();
  }
  const t0 = performance.now();
  const r = greinir.recognizeForVideo(video, nu);
  rakningMs += (performance.now() - t0 - rakningMs) * 0.1;

  const sest = new Set();
  const spor = [...handir.values()];
  const lofar = r.landmarks.map(lofaMidja);
  const para = paraSpor(spor.map((h) => h.hrarLofi), lofar);
  r.landmarks.forEach((hrar, i) => {
    let h = para[i] >= 0 ? spor[para[i]] : null;
    if (!h) {
      h = { id: ++naestaId, mykir: new Mykir(), mykirW: new Mykir(), stada: new HandStada(), dyptSia: new Sia1D(0.8, 1.5),
        kSia: new Sia1D(1.2, 2), bend: new BendingaHald(), hnefi: false, zoom: false, v: { x: 0, y: 0 }, sidastYfir: null, sidast: nu };
      handir.set(h.id, h);
    }
    h.hrarLofi = lofar[i];
    sest.add(h.id);
    const fyrr = { hnefi: h.hnefi, zoom: h.zoom };
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
    h.yfir = naestiHlutur(n.x, n.y);
    if (h.yfir) h.sidastYfir = { hlutur: h.yfir, t: nu };
    // dýpt: stærð handar Í MYNDINNI (síuð á log-skala); 5% suð = 5% stökk í fjarlægð ef ósíað
    h.staerdF = Math.exp(h.dyptSia.update(Math.log(handStaerd(h.lm, va)), nu));
    const g = r.gestures[i]?.[0];
    h.bending = g?.categoryName ?? 'None';
    h.vissa = g?.score ?? 0;
    Object.assign(h, h.stada.update(h.wlm, h.bending, h.vissa, h.wAspekt));
    h.kF = h.kSia.update(h.klipuHlutfall, nu);
    h.nyrHnefi = h.hnefi && !fyrr.hnefi;
    h.nyttZoom = h.zoom && !fyrr.zoom;
  });
  for (const [k, h] of handir) if (!sest.has(k) && nu - h.sidast > 400) handir.delete(k);
  const synilegar = [...handir].filter(([k]) => sest.has(k));
  stjorna(synilegar, nu, sest);

  ctx.clearRect(0, 0, hendur.width, hendur.height);
  for (const [id, h] of synilegar) teiknaHond(id, h);
  teiknaTaugar();
}

/**
 * Kasthraði = tilfærsla handar yfir ~120 ms glugga (ekki hraði eins ramma, sem er fullur af suði).
 * Síðustu rammarnir eru sleppt þegar höndin opnaðist, því þá hægir hún á sér.
 */
function kastHradi(saga, sleppaSidustu) {
  const s = saga.slice(0, saga.length - sleppaSidustu);
  const nyjast = s.at(-1);
  const elst = nyjast && s.find((e) => nyjast.t - e.t <= 120);
  const v = new THREE.Vector3();
  if (!elst || nyjast.t - elst.t < 30) return v;
  v.subVectors(nyjast.p, elst.p).divideScalar((nyjast.t - elst.t) / 1000);
  v.z *= 0.5;                                // dýptin er óáreiðanlegasti ásinn
  return v.length() < 0.4 ? v.set(0, 0, 0)   // rólegt slepp = hluturinn verður kyrr og svífur
    : v.clampLength(0, 10);
}

function sleppa(g) {
  gripir.splice(gripir.indexOf(g), 1);
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
    g.hlutur.hradi.copy(g.tegund === 'ein' ? kastHradi(g.saga, h0 && !h0.hnefi ? 3 : 0) : V.set(0, 0, 0));
    if (g.hlutur.hradi.lengthSq() > 0) kastT = nu;
    sleppa(g);
    hljod(900, 420);
  }

  // 2. nýtt grip (eða önnur hönd á sama hlut = tveggja handa stjórn)
  for (const [id, h] of synilegar) {
    if (!h.nyrHnefi || hondIGripi(id)) continue;
    // hönd á leið í hnefa fór kannski í gegnum zoom-stöðu: afturkalla þá stærðarbreytingu
    if (zoom?.lykill === id) { if (nu - zoom.t0 < 600) zoom.hlutur.staerdMark = zoom.fyrir; zoom = null; }
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
      // stökk yfir ~57° á einum ramma er rakningarvilla (höndin á rönd), ekki raunverulegur snúningur
      if (g.qH.angleTo(qNy) < 1) g.qH.slerp(qNy, 0.35);
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
    const strok = o && !o.heldur && !h.hnefi && !h.zoom && !h.klipa && Math.hypot(h.v.x, h.v.y) > 1.6;
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
    const upptekin = h.hnefi || hondIGripi(id) || h.zoom;
    h.skipunStada = h.bend.update(upptekin ? null : h.bending, h.vissa, nu);
    if (h.skipunStada.skipun) framkvaema(h.skipunStada.skipun, h);
  }

  // 7. tvær hendur að klípa: fjarlægð milli þeirra stýrir stærð virks hlutar
  const klipur = synilegar.filter(([id, h]) => h.klipa && !hondIGripi(id));
  if (klipur.length === 2 && (tvaerKlipa || virkur)) {
    const [a, b] = klipur.map(([, h]) => klipuPunktur(h.lm));
    if (!tvaerKlipa) tvaerKlipa = { hlutur: virkur, sia: new Sia1D(1, 1), s0: virkur.staerdMark };
    const d = tvaerKlipa.sia.update(fjarlaegd(a, b, va), nu);
    tvaerKlipa.d0 ??= Math.max(d, 1e-3);
    tvaerKlipa.hlutur.staerdMark = klemma(tvaerKlipa.s0 * d / tvaerKlipa.d0);
    zoom = null;
  } else tvaerKlipa = null;

  // 8. ein hönd: þumall og vísifingur sundur/saman eins og á síma
  if (!tvaerKlipa) {
    if (zoom && (!handir.get(zoom.lykill)?.zoom || zoom.hlutur.fara !== null)) zoom = null;
    if (!zoom) {
      const ny = synilegar.find(([, h]) => h.nyttZoom);
      const mark = ny && (ny[1].yfir || virkur);
      if (mark) zoom = { lykill: ny[0], hlutur: mark, k0: ny[1].kF, s0: mark.staerdMark, fyrir: mark.staerdMark, t0: nu };
    }
    // hlutfall (k/k0) springur ef byrjað er með litlu bili; veldisfall af mismun er jafnt allt sviðið
    if (zoom) zoom.hlutur.staerdMark = klemma(zoom.s0 * Math.exp((handir.get(zoom.lykill).kF - zoom.k0) * ZOOM_NAEMNI));
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
  const litur = hondIGripi(id) ? CSS.skaer : h.leysir ? CSS.raudur : h.zoom || h.klipa ? CSS.gulur : CSS.blar;
  ctx.save();
  ctx.shadowColor = litur;
  ctx.shadowBlur = 14;
  drawingUtils.drawConnectors(lm, GestureRecognizer.HAND_CONNECTIONS, { color: litur, lineWidth: 3 });
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
  if (zoom) { virk.add('zoom'); lysing ??= `Stækka / minnka: ${zoom.hlutur.nafn}`; }
  for (const [, h] of synilegar) {
    if (h.leysir) { virk.add('leysir'); lysing ??= h.leysir.hlutur ? `Miðar á: ${h.leysir.hlutur.nafn}` : 'Leysir'; }
    if (h.skipunStada?.nafn) { virk.add(SKIPUN_LISTI[h.skipunStada.nafn]); lysing ??= `Haltu: ${SKIPUN_TEXTI[h.skipunStada.nafn].toLowerCase()}`; }
    if (h.strokid) virk.add('strok');
  }
  if (nu - kastT < 600) { virk.add('kast'); lysing ??= 'Kastað!'; }
  lysing ??= synilegar.length ? (yfirMork.size ? 'Kreppa hnefa til að grípa' : `${synilegar.length === 2 ? 'Tvær hendur' : 'Hönd'} sést`) : 'Engin hönd';
  adgerdEl.textContent = lysing;
  document.querySelectorAll('#skyring li').forEach((li) => li.classList.toggle('virk', virk.has(li.dataset.a)));
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
  const { n, o } = musHlutur(e);
  if (!o || gripir.some((g) => g.hlutur === o)) return;
  const d0 = camera.position.distanceTo(o.group.position);
  mus = { hlutur: o, d0, offset: o.group.position.clone().sub(geislaPunktur(n.x, n.y, d0)) };
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
    const n = musNdc(e);
    geislaPunktur(n.x, n.y, mus.d0, mus.hlutur.heldur.stada).add(mus.offset);
  } else {
    musYfir = musHlutur(e).o;
    if (musYfir) virkur = musYfir;
  }
});
function musSleppir() {
  if (!mus) return;
  mus.hlutur.heldur = null; // hraðinn sem mældist meðan haldið var heldur áfram = kast
  mus = null;
  sena.classList.remove('heldur');
  hljod(900, 420);
}
sena.addEventListener('pointerup', musSleppir);
sena.addEventListener('pointercancel', musSleppir);
sena.addEventListener('wheel', (e) => {
  e.preventDefault();
  const o = musYfir || virkur;
  if (o) o.staerdMark = klemma(o.staerdMark * Math.exp(-e.deltaY * 0.0015));
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target.closest?.('button')) return;
  const k = e.key.toLowerCase();
  if (k === 'r') nullstilla();
  if (k === 'n') birtaNaesta(new THREE.Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 0.8, -0.3));
  if (k === 'x' && virkur) setjaXray(virkur, !virkur.xray);
  if (e.key === 'Delete' || e.key === 'Backspace') eyda(virkur);
});
$('nullstilla').addEventListener('click', nullstilla);

// ---------- MediaPipe ----------
async function buaTilGreini() {
  const vision = await FilesetResolver.forVisionTasks(MP_URL);
  for (const delegate of ['GPU', 'CPU']) {
    try {
      const g = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: LIKAN_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      return { g, delegate };
    } catch (e) {
      console.warn(`delegate ${delegate} tókst ekki`, e);
    }
  }
  throw new Error('Gat ekki búið til GestureRecognizer');
}

let delegateNafn = '';
async function byrja() {
  try {
    // 60 fps helmingar töfina milli handarhreyfingar og rakningar (myndavélin gefur minna ef hún getur ekki meira)
    const straumur = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 }, facingMode: 'user' },
    });
    video.srcObject = straumur;
    await video.play();
    scene.background = videoTex;
    scene.backgroundIntensity = 0.9;
    stadaEl.textContent = 'Hleð inn handalíkani…';
    const { g, delegate } = await buaTilGreini();
    greinir = g;
    delegateNafn = delegate;
    const fpsMyndavel = straumur.getVideoTracks()[0]?.getSettings().frameRate;
    stadaEl.textContent = `Kerfi virkt · ${delegate} · ${fpsMyndavel ? Math.round(fpsMyndavel) + ' fps myndavél · ' : ''}allt að 2 hendur`;
  } catch (e) {
    stadaEl.textContent = `Myndavél ekki tiltæk (${e.message}) – notaðu mús og lyklaborð`;
    console.error(e);
  }
}
byrja();

// ræsing: hlutirnir birtast einn af öðrum
[[0, 0, 0], [-1.7, 0.15, -0.4], [1.7, 0.15, -0.4]].forEach((p, i) =>
  setTimeout(() => birtaNaesta(new THREE.Vector3(...p)), 250 + i * 320));

// ---------- lykkja ----------
let sidastT = 0, fps = 60;
renderer.setAnimationLoop((t) => {
  const dt = THREE.MathUtils.clamp((t - sidastT) / 1000, 1e-3, 0.05);
  sidastT = t;
  const ts = t / 1000;
  greinaHendur(performance.now());
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

  fps += (1 / dt - fps) * 0.05;
  if (Math.floor(ts * 4) !== Math.floor((ts - dt) * 4)) {
    const hendurSest = [...handir.values()].filter((h) => performance.now() - h.sidast < 200).length;
    afkostEl.textContent = `${Math.round(fps)} fps · rakning ${rakningMs.toFixed(0)} ms${delegateNafn ? ` (${delegateNafn})` : ''} · ${hendurSest} hendur · ${virkir().length} hlutir`;
  }

  composer.render(dt);
  merkjaRenderer.render(scene, camera);
});

// fyrir prófanir í vafra
window.__kerfi = { hlutir, gripir, get virkur() { return virkur; }, setjaGreini(g) { greinir = g; }, birtaNaesta, eyda, setjaXray, nullstilla };
