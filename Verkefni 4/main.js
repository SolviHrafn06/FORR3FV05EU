import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { KORT } from './kort.js';

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const BENDINGALIKAN = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const ARASIR = {
  Closed_Fist: { nafn: 'Árás', skadi: 10, bid: 1.2 },
  Victory: { nafn: 'Ofurárás', skadi: 25, bid: 3 },
};

const stada = document.getElementById('stada');
const vista = document.getElementById('vista');
const merkiLag = document.getElementById('merki');
const hendur = document.getElementById('hendur');
const ctx = hendur.getContext('2d');
const teikna = new DrawingUtils(ctx);
const HREYFING = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;

const segja = (texti) => { stada.textContent = texti; };
const bida = (sek) => new Promise((r) => setTimeout(r, sek * 1000));

// ---------- Litlar tween-hreyfingar, keyrðar í hverjum ramma ----------
const tweens = [];
function tween(sek, fall) {
  tweens.push({ byrjun: performance.now(), lengd: sek * 1000, fall });
}
function uppfaeraTweens(nu) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const t = tweens[i];
    const p = t.lengd > 0 ? Math.min(1, (nu - t.byrjun) / t.lengd) : 1;
    t.fall(p);
    if (p === 1) tweens.splice(i, 1);
  }
}
const easeOutBack = (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;

// ---------- Mörk (targets): tilbúin targets.mind eða búin til í vafranum ----------
async function saekjaMork() {
  const svar = await fetch('kort/targets.mind').catch(() => null);
  if (svar?.ok) return 'kort/targets.mind';

  segja('Hleð inn myndum af spilunum…');
  const myndir = await Promise.all(KORT.map((k) => new Promise((res, rej) => {
    const mynd = new Image();
    mynd.crossOrigin = 'anonymous';
    mynd.onload = () => res(mynd);
    mynd.onerror = () => rej(new Error(`Fann ekki mynd af spili: ${k.mynd}`));
    mynd.src = k.mynd;
  })));

  const { Compiler } = await import('mindar-image');
  const compiler = new Compiler();
  await compiler.compileImageTargets(myndir, (p) => segja(`Bý til mörk úr spilunum… ${Math.round(p)}%`));
  const url = URL.createObjectURL(new Blob([compiler.exportData()]));
  vista.href = url;
  vista.hidden = false;
  return url;
}

// ---------- Líkön ----------
const gltfLoader = new GLTFLoader();

// Einföld vera svo hægt sé að prófa áður en alvöru líkön koma. Horfir í +Z.
function stadgengill(litur) {
  const vera = new THREE.Group();
  const efni = new THREE.MeshStandardMaterial({ color: litur, roughness: 0.6 });
  const svart = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const bolur = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), efni);
  bolur.position.y = 0.5;
  vera.add(bolur);
  for (const x of [-0.18, 0.18]) {
    const auga = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 8), svart);
    auga.position.set(x, 0.65, 0.43);
    const eyra = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 16), efni);
    eyra.position.set(x * 1.7, 1.08, 0);
    eyra.rotation.z = -x * 2;
    vera.add(auga, eyra);
  }
  return vera;
}

async function hladaLikani(k) {
  try {
    const gltf = await gltfLoader.loadAsync(k.likan);
    return { likan: gltf.scene, klippur: gltf.animations };
  } catch {
    console.info(`Líkan fannst ekki (${k.likan}), nota staðgengil.`);
    return { likan: stadgengill(k.litur), klippur: [] };
  }
}

// Hæð ≈ 0,75 spilabreiddir × skali, fætur á y=0, miðjað
function jafna(likan, skali) {
  const haed = 0.75 * skali;
  const kassi = new THREE.Box3().setFromObject(likan);
  likan.scale.multiplyScalar(haed / (kassi.getSize(new THREE.Vector3()).y || 1));
  kassi.setFromObject(likan);
  const midja = kassi.getCenter(new THREE.Vector3());
  likan.position.x -= midja.x;
  likan.position.z -= midja.z;
  likan.position.y -= kassi.min.y;
  return haed;
}

function finnaKlippu(klippur, nofn, lykill) {
  return klippur.find((k) => k.name === nofn?.[lykill])
    ?? klippur.find((k) => k.name.toLowerCase().includes(lykill));
}

// Spilar klippu; skilar lengd hennar eða 0 ef hún er ekki til
function spila(p, lykill, endurtaka = false) {
  const klippa = p.klippur[lykill];
  if (!klippa) return 0;
  const adgerd = p.mixer.clipAction(klippa);
  adgerd.reset();
  adgerd.setLoop(endurtaka ? THREE.LoopRepeat : THREE.LoopOnce);
  adgerd.clampWhenFinished = lykill === 'faint';
  if (p.virk && p.virk !== adgerd) adgerd.crossFadeFrom(p.virk, 0.2, false);
  adgerd.play();
  p.virk = adgerd;
  return klippa.duration;
}

// ---------- Ástand leiksins ----------
let mindarThree;
let umferd = 0;
const pokemon = [];

const synilegir = () => pokemon.filter((p) => p.synilegt && !p.rotad);

function naestiAndstaedingur(p) {
  const minn = p.anchor.group.getWorldPosition(new THREE.Vector3());
  let besti = null;
  let minnst = Infinity;
  for (const a of synilegir()) {
    if (a === p) continue;
    const fjarlaegd = a.anchor.group.getWorldPosition(new THREE.Vector3()).distanceTo(minn);
    if (fjarlaegd < minnst) { minnst = fjarlaegd; besti = a; }
  }
  return besti;
}

function synaHp(p) {
  const hlutfall = p.hp / p.kort.hp;
  p.hpStika.style.width = `${hlutfall * 100}%`;
  p.hpTexti.textContent = `${p.hp} HP`;
  p.merki.classList.toggle('lagt', hlutfall <= 0.3);
  p.merki.classList.toggle('rotad', p.rotad);
}

function buaTilPokemon(k, i) {
  const anchor = mindarThree.addAnchor(i);
  const stand = new THREE.Group();
  stand.rotation.x = Math.PI / 2; // +Y líkansins = þvervigur spilsins
  const yaw = new THREE.Group();
  const lunge = new THREE.Group();
  const pop = new THREE.Group();
  const toppur = new THREE.Object3D();
  anchor.group.add(stand);
  stand.add(yaw);
  yaw.add(lunge);
  lunge.add(pop, toppur);

  const merki = document.createElement('div');
  merki.className = 'merki';
  merki.hidden = true;
  merki.innerHTML = '<strong></strong> <span class="hptexti"></span><div class="hp"><span></span></div>';
  merki.querySelector('strong').textContent = k.leikmadur ? `${k.nafn} (þú)` : k.nafn;
  merkiLag.append(merki);

  const p = {
    kort: k, anchor, yaw, lunge, pop, toppur, merki,
    hpTexti: merki.querySelector('.hptexti'),
    hpStika: merki.querySelector('.hp span'),
    hp: k.hp, rotad: false, synilegt: false, upptekinn: false, tilbuin: 0,
    mixer: null, klippur: {}, virk: null, skjar: { x: 0, y: 0 },
  };
  synaHp(p);

  hladaLikani(k).then(({ likan, klippur }) => {
    const haed = jafna(likan, k.skali);
    toppur.position.y = haed * 1.1;
    pop.add(likan);
    p.mixer = new THREE.AnimationMixer(likan);
    for (const lykill of ['idle', 'attack', 'hit', 'faint']) p.klippur[lykill] = finnaKlippu(klippur, k.klippur, lykill);
    p.mixer.addEventListener('finished', (e) => {
      if (e.action === p.virk && !p.rotad) spila(p, 'idle', true);
    });
    spila(p, 'idle', true);
  });

  anchor.onTargetFound = () => {
    p.synilegt = true;
    merki.hidden = false;
    pop.scale.setScalar(0.001);
    tween(0.6 * HREYFING, (t) => pop.scale.setScalar(Math.max(0.001, easeOutBack(t))));
    segja(synilegir().length >= 2 ? 'Bardagi! ✊ Árás · ✌️ Ofurárás' : 'Það þarf tvö spil í mynd til að berjast.');
  };
  anchor.onTargetLost = () => {
    p.synilegt = false;
    merki.hidden = true;
  };

  pokemon.push(p);
}

// ---------- Bardagi ----------
function aras(p, a, andstaedingur = naestiAndstaedingur(p)) {
  const nu = performance.now();
  if (p.upptekinn || nu < p.tilbuin) return false;
  if (!andstaedingur) {
    // eftir sigur stendur úrslitatextinn þar til 👍 er gefið
    if (!pokemon.some((s) => s.rotad)) segja('Það þarf tvö spil í mynd til að berjast!');
    return false;
  }
  p.tilbuin = nu + a.bid * 1000;
  p.upptekinn = true;
  segja(`${p.kort.nafn} notaði ${a.nafn}!`);

  let lengd = spila(p, 'attack');
  if (!lengd) {
    lengd = 0.6;
    tween(lengd, (t) => { p.lunge.position.z = Math.sin(t * Math.PI) * 0.35; });
  }
  const u = umferd;
  bida(lengd / 2).then(() => { if (u === umferd) hitta(p, andstaedingur, a.skadi); });
  bida(lengd).then(() => { p.upptekinn = false; });
  return true;
}

function hitta(arasar, p, skadi) {
  if (p.rotad) return;
  p.hp = Math.max(0, p.hp - skadi);
  if (p.hp > 0) {
    synaHp(p);
    if (!spila(p, 'hit')) {
      tween(0.4 * HREYFING, (t) => { p.lunge.position.x = Math.sin(t * Math.PI * 6) * 0.05 * (1 - t); });
    }
    return;
  }
  p.rotad = true;
  synaHp(p);
  if (!spila(p, 'faint')) tween(0.8, (t) => { p.lunge.rotation.z = t * Math.PI / 2; });
  const urslit = p.kort.leikmadur ? 'Þú tapaðir! 👍 fyrir nýja umferð.' : 'Þú vannst! 🎉';
  segja(`${p.kort.nafn} rotaðist! ${arasar.kort.nafn} vann. ${urslit}`);
}

function nyUmferd() {
  umferd++;
  for (const p of pokemon) {
    p.hp = p.kort.hp;
    p.rotad = false;
    p.upptekinn = false;
    p.tilbuin = 0;
    p.naestaAras = 0;
    p.lunge.position.set(0, 0, 0);
    p.lunge.rotation.set(0, 0, 0);
    if (p.mixer) spila(p, 'idle', true);
    synaHp(p);
  }
  segja('Ný umferð! Allir með fullt líf.');
  return true;
}

// Skilar true ef aðgerðin var framkvæmd (þá telst bendingin notuð)
function framkvaema(bending) {
  if (bending === 'Thumb_Up') return nyUmferd();
  const a = ARASIR[bending];
  if (!a) return false;
  const p = pokemon.find((s) => s.kort.leikmadur);
  if (p?.rotad) return false; // tapaði; 👍 byrjar nýja umferð
  if (!p?.synilegt) {
    segja('Sýndu spilið þitt og spil andstæðingsins!');
    return false;
  }
  return aras(p, a);
}

// Andstæðingarnir (allir nema leikmaðurinn) ráðast sjálfir á leikmanninn
function tolvanGerir(nu) {
  const leikmadur = pokemon.find((p) => p.kort.leikmadur);
  if (!leikmadur?.synilegt || leikmadur.rotad) return;
  for (const p of synilegir()) {
    if (p === leikmadur) continue;
    if (!p.naestaAras) p.naestaAras = nu + 3000; // smá frestur þegar bardaginn byrjar
    if (nu < p.naestaAras || p.upptekinn) continue;
    if (aras(p, Math.random() < 0.3 ? ARASIR.Victory : ARASIR.Closed_Fist, leikmadur)) {
      p.naestaAras = nu + 2000 + Math.random() * 2000;
    }
  }
}

// ---------- Handagreining ----------
let greinir = null;
let sidastiTimi = -1;
const sidastaBending = {};

async function raesaGreini() {
  const vision = await FilesetResolver.forVisionTasks(MP_URL);
  for (const delegate of ['GPU', 'CPU']) {
    try {
      greinir = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: BENDINGALIKAN, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        // á vefmyndavél er "None" oft efst; bönnum það og síum út veikar bendingar
        cannedGesturesClassifierOptions: { categoryDenylist: ['None'], scoreThreshold: 0.5 },
      });
      return;
    } catch (e) {
      console.warn(`Handagreining með ${delegate} tókst ekki`, e);
    }
  }
  throw new Error('Gat ekki ræst handagreiningu');
}

function greinaHendur(nu) {
  const video = mindarThree.video;
  if (!greinir || !video || video.readyState < 2 || video.currentTime === sidastiTimi) return;
  sidastiTimi = video.currentTime;
  const nidurstada = greinir.recognizeForVideo(video, nu);

  // Strigann liggur nákvæmlega yfir myndbandinu eins og það birtist á skjánum
  const r = video.getBoundingClientRect();
  Object.assign(hendur.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  if (hendur.width !== video.videoWidth || hendur.height !== video.videoHeight) {
    hendur.width = video.videoWidth;
    hendur.height = video.videoHeight;
  }
  ctx.clearRect(0, 0, hendur.width, hendur.height);

  const saest = new Set();
  nidurstada.landmarks.forEach((landmarks, i) => {
    teikna.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: '#ffcb05', lineWidth: 4 });
    teikna.drawLandmarks(landmarks, { color: '#e5484d', lineWidth: 1, radius: 3 });

    // Hver hönd er auðkennd með handedness; ef tvær fá sama gildi bætist númerið við
    let lykill = nidurstada.handedness[i]?.[0]?.categoryName ?? 'Hond';
    if (saest.has(lykill)) lykill += i;
    saest.add(lykill);

    const bending = nidurstada.gestures[i]?.[0]?.categoryName ?? null;
    if (bending === sidastaBending[lykill]) return;
    if (!bending) { sidastaBending[lykill] = null; return; }
    if (framkvaema(bending)) sidastaBending[lykill] = bending;
  });
  for (const lykill of Object.keys(sidastaBending)) if (!saest.has(lykill)) delete sidastaBending[lykill];
}

// ---------- Rammi ----------
const v = new THREE.Vector3();

function snuaAdHvorOdrum(dt) {
  const lifandi = synilegir();
  if (lifandi.length < 2) return;
  for (const p of lifandi) {
    const a = naestiAndstaedingur(p);
    const stadur = p.anchor.group.worldToLocal(a.anchor.group.getWorldPosition(v));
    const mark = Math.atan2(stadur.x, -stadur.y);
    const munur = Math.atan2(Math.sin(mark - p.yaw.rotation.y), Math.cos(mark - p.yaw.rotation.y));
    p.yaw.rotation.y += munur * Math.min(1, dt * 8);
  }
}

function uppfaeraMerki() {
  for (const p of pokemon) {
    if (!p.synilegt) continue;
    p.toppur.getWorldPosition(v).project(mindarThree.camera);
    p.skjar.x = (v.x + 1) / 2 * innerWidth;
    p.skjar.y = (1 - v.y) / 2 * innerHeight;
    p.merki.style.left = `${p.skjar.x}px`;
    p.merki.style.top = `${p.skjar.y}px`;
  }
}

async function raesa() {
  try {
    const imageTargetSrc = await saekjaMork();
    mindarThree = new MindARThree({
      container: document.getElementById('ar'),
      imageTargetSrc,
      maxTrack: KORT.length,
      uiLoading: 'no',
      uiScanning: 'no',
    });
    const { renderer, scene, camera } = mindarThree;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.5));
    const sol = new THREE.DirectionalLight(0xffffff, 1.5);
    sol.position.set(0.5, 1, 2);
    scene.add(sol);
    KORT.forEach(buaTilPokemon);

    segja('Ræsi myndavél…');
    await mindarThree.start();
    segja('Beindu myndavélinni að tveimur spilum.');

    const klukka = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = klukka.getDelta();
      const nu = performance.now();
      uppfaeraTweens(nu);
      for (const p of pokemon) p.mixer?.update(dt);
      scene.updateMatrixWorld();
      snuaAdHvorOdrum(dt);
      greinaHendur(nu);
      tolvanGerir(nu);
      renderer.render(scene, camera);
      uppfaeraMerki();
    });

    raesaGreini().catch((e) => {
      console.error(e);
      segja('Handagreining fór ekki í gang.');
    });
  } catch (e) {
    console.error(e);
    segja(`Villa: ${e.message}`);
  }
}

raesa();
