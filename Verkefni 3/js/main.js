import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { animate, utils } from 'animejs';
// Three.js adapterinn kennir anime.js á Three hluti, t.d. x, y, z, rotateY (í gráðum), scale, opacity og intensity
import 'animejs/adapters/three';


// ==================== STILLINGAR ====================

const HALFT_HERBERGI = 10;       // herbergið nær frá -10 til 10 á x og z (20 x 20 m)
const VEGG_HAED = 6;
const ANAKIN_HAED = 1.85;        // Anakin er skalaður í þessa hæð (metrar)
const ANAKIN_RADIUS = 0.35;      // hversu breiður hann er í árekstrum
const ANAKIN_SNUNINGUR = 0;      // breyttu í Math.PI ef Anakin gengur afturábak
const GANGA_HRADI = 2.2;         // metrar á sekúndu
const HLAUPA_HRADI = 4.8;
const MINN_HLUTUR_HAED = 0.3;    // raunveruleg hæð hlutarins sem þú skannaðir (metrar)
const SVERD_STYRKUR = 8;         // birta geislasverðsins
const SVERD_HALLI_X = 35;        // hvíldarstaða sverðsins í gráðum
const SVERD_HALLI_Z = -15;
const MORK = HALFT_HERBERGI - ANAKIN_RADIUS;   // lengst sem Anakin kemst að veggnum


// ==================== RENDERER, SENA OG MYNDAVÉL ====================

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.FogExp2(0x05070d, 0.045);   // þoka sem gleypir fjarlæga hluti

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);

// myndavélin er barn í "rig" hópi. Rig-ið eltir Anakin og myndavélin fylgir með (scene graph)
const myndavelarRig = new THREE.Group();
myndavelarRig.add(camera);
camera.position.set(0, 4.5, 7);
camera.lookAt(0, 1.2, 0);
scene.add(myndavelarRig);

scene.add(new THREE.HemisphereLight(0x6070a0, 0x0a0a12, 1.2));   // dauf grunnbirta


// ==================== HLEÐSLA (LoadingManager) ====================

const hledsla = document.querySelector('#hledsla');
const framvindaStika = document.querySelector('#framvinda-stika');
const framvindaTexti = document.querySelector('#framvinda-texti');
const byrjaTakki = document.querySelector('#byrja');
const hud = document.querySelector('#hud');

// allir loaderar fá sama manager svo hann viti hvenær ALLT er komið
const manager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(manager);
const textureLoader = new THREE.TextureLoader(manager);
const audioLoader = new THREE.AudioLoader(manager);

manager.onProgress = (slod, buid, alls) => {
  const prosent = Math.round((buid / alls) * 100);
  framvindaStika.style.width = prosent + '%';
  framvindaTexti.textContent = `Hleð inn… ${prosent}%`;
};

manager.onLoad = () => {
  framvindaTexti.textContent = 'Allt tilbúið';
  byrjaTakki.hidden = false;
};

// áferð sem endurtekur sig (t.d. 5 sinnum á 20 m gólfi)
function aferd(slod, endurtekningX, endurtekningY) {
  const a = textureLoader.load(slod);
  a.colorSpace = THREE.SRGBColorSpace;
  a.wrapS = THREE.RepeatWrapping;
  a.wrapT = THREE.RepeatWrapping;
  a.repeat.set(endurtekningX, endurtekningY);
  a.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return a;
}

// skalar hlut svo hann verði 'haed' metrar á hæð, stendur á y = 0 og er í miðjunni á x og z
function setjaIRettanSkala(hlutur, haed) {
  hlutur.updateMatrixWorld(true);
  const kassi = new THREE.Box3().setFromObject(hlutur);
  const staerd = kassi.getSize(new THREE.Vector3());
  const midja = kassi.getCenter(new THREE.Vector3());
  const s = haed / staerd.y;
  hlutur.scale.multiplyScalar(s);
  hlutur.position.set(-midja.x * s, -kassi.min.y * s, -midja.z * s);
}


// ==================== ÁREKSTRAR ====================

const hindranir = [];   // hringlaga hlutir (súlur, stallur, droid): { midja, radius } -> .distanceTo()
const kassar = [];      // kassalaga hlutir: THREE.Box3

function rekstA(stada) {
  for (const h of hindranir) {
    if (stada.distanceTo(h.midja) < h.radius + ANAKIN_RADIUS) return true;
  }
  for (const k of kassar) {
    if (k.distanceToPoint(stada) < ANAKIN_RADIUS) return true;
  }
  return false;
}


// ==================== HERBERGIÐ ====================

const golf = new THREE.Mesh(
  new THREE.PlaneGeometry(HALFT_HERBERGI * 2, HALFT_HERBERGI * 2),
  new THREE.MeshStandardMaterial({ map: aferd('aferdir/golf.png', 5, 5), roughness: 0.5, metalness: 0.4 }),
);
golf.rotation.x = -Math.PI / 2;
golf.receiveShadow = true;
scene.add(golf);

const loft = new THREE.Mesh(
  new THREE.PlaneGeometry(HALFT_HERBERGI * 2, HALFT_HERBERGI * 2),
  new THREE.MeshStandardMaterial({ map: aferd('aferdir/golf.png', 5, 5), color: 0x666666, roughness: 0.8 }),
);
loft.rotation.x = Math.PI / 2;
loft.position.y = VEGG_HAED;
scene.add(loft);

const ljosEfni = new THREE.MeshBasicMaterial({ color: 0x9cc4ff });   // lýsandi rendur, óháðar ljósum
const rauttEfni = new THREE.MeshBasicMaterial({ color: 0xff3020 });

// Veggirnir eru einhliða plön sem snúa inn í herbergið.
// Þegar myndavélin er fyrir utan vegg sér hún bakhliðina, sem er ekki teiknuð, og sér því í gegn.
function buaTilVegg(breidd, haed, x, y, z, snuningur) {
  const veggur = new THREE.Mesh(
    new THREE.PlaneGeometry(breidd, haed),
    new THREE.MeshStandardMaterial({ map: aferd('aferdir/veggur.png', breidd / 4, haed / 4), roughness: 0.7, metalness: 0.3 }),
  );
  veggur.position.set(x, y, z);
  veggur.rotation.y = snuningur;
  veggur.receiveShadow = true;
  scene.add(veggur);
  return veggur;
}

// lóðréttar ljósarendur, festar á vegginn sem börn hans
function ljosarendur(veggur) {
  for (const x of [-7.5, -2.5, 2.5, 7.5]) {
    const rond = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 3), ljosEfni);
    rond.position.set(x, 0, 0.02);
    veggur.add(rond);
  }
}

const H = HALFT_HERBERGI;
ljosarendur(buaTilVegg(20, VEGG_HAED, -H, VEGG_HAED / 2, 0, Math.PI / 2));    // vestur
ljosarendur(buaTilVegg(20, VEGG_HAED, H, VEGG_HAED / 2, 0, -Math.PI / 2));    // austur
ljosarendur(buaTilVegg(20, VEGG_HAED, 0, VEGG_HAED / 2, H, Math.PI));         // suður
// norðurveggurinn er í þremur hlutum svo það sé gat (3 x 4 m) fyrir hurðina
buaTilVegg(8.5, VEGG_HAED, -5.75, VEGG_HAED / 2, -H, 0);
buaTilVegg(8.5, VEGG_HAED, 5.75, VEGG_HAED / 2, -H, 0);
buaTilVegg(3, 2, 0, 5, -H, 0);

// rauðar rendur í kringum hurðargatið
for (const x of [-1.75, 1.75]) {
  const rond = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4), rauttEfni);
  rond.position.set(x, 2, -H + 0.02);
  scene.add(rond);
}

// gangur fyrir aftan hurðina (kassi sem er teiknaður að innan)
const gangur = new THREE.Mesh(
  new THREE.BoxGeometry(3, 4, 6),
  new THREE.MeshStandardMaterial({ map: aferd('aferdir/veggur.png', 1.5, 1), side: THREE.BackSide }),
);
gangur.position.set(0, 2, -H - 3);
scene.add(gangur);

const gangEndi = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.5), rauttEfni);
gangEndi.position.set(0, 2, -H - 5.9);
scene.add(gangEndi);

const gangLjos = new THREE.PointLight(0xff3322, 0, 8, 1.5);   // kviknar þegar hurðin opnast
gangLjos.position.set(0, 3, -H - 2);
scene.add(gangLjos);


// ==================== SÚLUR, KASSAR OG STALLUR ====================

const malmur = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.45, metalness: 0.6 });

function buaTilSulu(x, z) {
  const sula = new THREE.Group();
  const fotur = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.4, 24), malmur);
  fotur.position.y = 0.2;
  const skaft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, VEGG_HAED - 0.8, 24), malmur);
  skaft.position.y = VEGG_HAED / 2;
  const toppur = fotur.clone();
  toppur.position.y = VEGG_HAED - 0.2;
  const hringur = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 24), ljosEfni);
  hringur.position.y = 2.6;
  sula.add(fotur, skaft, toppur, hringur);
  sula.traverse((hlutur) => {
    hlutur.castShadow = true;
    hlutur.receiveShadow = true;
  });
  sula.position.set(x, 0, z);
  scene.add(sula);
  hindranir.push({ midja: new THREE.Vector3(x, 0, z), radius: 1.0 });
}

buaTilSulu(-4.5, -2.5);
buaTilSulu(4.5, -2.5);
buaTilSulu(4.5, 4.5);

function buaTilKassa(staerd) {
  const kassi = new THREE.Group();
  const bolur = new THREE.Mesh(new THREE.BoxGeometry(staerd, staerd, staerd), malmur);
  bolur.position.y = staerd / 2;
  bolur.castShadow = true;
  bolur.receiveShadow = true;
  const rond = new THREE.Mesh(new THREE.BoxGeometry(staerd * 0.6, 0.06, staerd + 0.02), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
  rond.position.y = staerd * 0.75;
  kassi.add(bolur, rond);
  return kassi;
}

// tveir kassar í stafla: litli kassinn er barn stafla-hópsins og fylgir honum
function buaTilKassastafla(x, z) {
  const stafli = new THREE.Group();
  const litill = buaTilKassa(0.9);
  litill.position.set(0.2, 1.6, -0.1);
  litill.rotation.y = 0.5;
  stafli.add(buaTilKassa(1.6), litill);
  stafli.position.set(x, 0, z);
  scene.add(stafli);
  stafli.updateMatrixWorld(true);
  kassar.push(new THREE.Box3().setFromObject(stafli));
}

buaTilKassastafla(7.2, -7.2);
buaTilKassastafla(-7.8, 7.4);

// stallur fyrir hlutinn sem ég skannaði
const stallur = new THREE.Group();
const stallBolur = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1, 24), malmur);
stallBolur.position.y = 0.5;
stallBolur.castShadow = true;
stallBolur.receiveShadow = true;
const stallHringur = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.05, 24), ljosEfni);
stallHringur.position.y = 0.95;
const hlutHaldari = new THREE.Group();   // hluturinn fer hingað og snýst
hlutHaldari.position.y = 1;
stallur.add(stallBolur, stallHringur, hlutHaldari);
stallur.position.set(-4.5, 0, 4.5);
scene.add(stallur);
hindranir.push({ midja: new THREE.Vector3(-4.5, 0, 4.5), radius: 0.6 });


// ==================== LOFTLJÓS ====================

const lampar = [];

function buaTilLampa(x, z, styrkur, floktir) {
  const lampi = new THREE.Group();
  lampi.position.set(x, VEGG_HAED, z);

  const hus = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.2, 20), malmur);
  hus.position.y = -0.1;
  const pera = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 20),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xd8e4ff, emissiveIntensity: 2 }),
  );
  pera.rotation.x = Math.PI / 2;   // snýr niður
  pera.position.y = -0.21;

  const ljos = new THREE.SpotLight(0xd8e4ff, styrkur, 16, 0.6, 0.55, 1.2);
  ljos.position.y = -0.25;
  ljos.target.position.set(0, -VEGG_HAED, 0);   // target er líka barn lampans og vísar beint niður
  ljos.castShadow = true;
  ljos.shadow.mapSize.set(512, 512);
  ljos.shadow.bias = -0.0005;

  // daufur ljósgeisli í þokunni
  const geisli = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 5.6, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xd8e4ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  geisli.position.y = -3;

  lampi.add(hus, pera, ljos, ljos.target, geisli);
  scene.add(lampi);
  lampar.push({ ljos, pera, geisli, styrkur, floktir });
}

buaTilLampa(-3, -6, 40, true);   // nálægt droidnum í horninu
buaTilLampa(1.5, 2.5, 35, true);
buaTilLampa(-4.5, 4.5, 30, false);   // yfir stallinum, logar stöðugt


// ==================== HURÐ ====================

const hurd = new THREE.Group();
hurd.position.set(0, 0, -H - 0.2);   // aðeins fyrir aftan vegginn svo helmingarnir hverfi inn í hann
scene.add(hurd);

function hurdarHelmingur(x) {
  const helmingur = new THREE.Group();
  const plata = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.5, metalness: 0.7 }));
  plata.position.y = 2;
  const rond = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.27), rauttEfni);
  rond.position.y = 2.6;
  helmingur.add(plata, rond);
  helmingur.position.x = x;
  hurd.add(helmingur);
  return helmingur;
}

const vinstriHurd = hurdarHelmingur(-0.75);
const haegriHurd = hurdarHelmingur(0.75);
const HURD_STADA = new THREE.Vector3(0, 0, -H);
let hurdOpin = false;


// ==================== ANAKIN OG GEISLASVERÐIÐ ====================

// Anakin-hópurinn heldur utan um módelið OG geislasverðið, svo þau hreyfast saman
const anakin = new THREE.Group();
anakin.position.set(0, 0, 7);
anakin.rotation.y = Math.PI;   // snýr að hurðinni í byrjun
scene.add(anakin);

const geislasverd = new THREE.Group();
geislasverd.position.set(-0.3, 1.0, 0.3);   // í hægri hendi (Anakin snýr í +z, hægri hönd er því -x)
geislasverd.rotation.set(THREE.MathUtils.degToRad(SVERD_HALLI_X), 0, THREE.MathUtils.degToRad(SVERD_HALLI_Z));
anakin.add(geislasverd);

const skaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.028, 0.032, 0.26, 16),
  new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.3 }),
);
skaft.position.y = 0.03;

// blaðið er hópur sem byrjar í skaftinu, svo scale.y = 0 -> 1 lætur það "vaxa" upp úr skaftinu
const blad = new THREE.Group();
blad.position.y = 0.16;
blad.scale.y = 0;
const kjarni = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 1, 12), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, fog: false }));
kjarni.position.y = 0.5;
const ljomi = new THREE.Mesh(
  new THREE.CylinderGeometry(0.045, 0.05, 1.04, 16),
  new THREE.MeshBasicMaterial({ color: 0x2f7dff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
);
ljomi.position.y = 0.5;
blad.add(kjarni, ljomi);

const sverdLjos = new THREE.PointLight(0x4f9dff, 0, 9, 1.6);   // ljósgjafinn sem Anakin heldur á
sverdLjos.position.y = 0.6;
sverdLjos.castShadow = true;
sverdLjos.shadow.mapSize.set(512, 512);
sverdLjos.shadow.bias = -0.005;
sverdLjos.shadow.camera.near = 1;   // Anakin sjálfur (nær en 1 m) varpar ekki risaskugga, en súlur og kassar gera það

geislasverd.add(skaft, blad, sverdLjos);

let mixer = null;           // AnimationMixer fyrir Anakin
const hreyfingar = {};      // kyrr, ganga, hlaupa (AnimationAction)
let virkHreyfing = null;

// finnur hreyfiklippu sem heitir eitthvað sem inniheldur eitt af orðunum
function finnaKlippu(klippur, ...ord) {
  return klippur.find((k) => ord.some((o) => k.name.toLowerCase().includes(o)));
}

gltfLoader.load('models/anakin.glb', (gltf) => {
  const model = gltf.scene;
  model.rotation.y = ANAKIN_SNUNINGUR;
  setjaIRettanSkala(model, ANAKIN_HAED);
  model.traverse((hlutur) => {
    if (hlutur.isMesh) {
      hlutur.castShadow = true;
      hlutur.receiveShadow = true;
      hlutur.frustumCulled = false;   // skinned mesh hverfur stundum annars við hreyfingu
    }
  });
  anakin.add(model);

  const klippur = gltf.animations;
  console.log('Hreyfingar í anakin.glb:', klippur.map((k) => k.name));
  if (klippur.length === 0) return;

  mixer = new THREE.AnimationMixer(model);
  const ganga = finnaKlippu(klippur, 'walk') || finnaKlippu(klippur, 'run') || klippur[0];
  const hlaupa = finnaKlippu(klippur, 'run', 'jog', 'sprint') || ganga;
  const kyrr = finnaKlippu(klippur, 'idle', 'stand', 'breath');

  hreyfingar.ganga = mixer.clipAction(ganga);
  hreyfingar.hlaupa = mixer.clipAction(hlaupa);
  // ef það er engin Idle hreyfing stendur hann kyrr í fyrsta ramma göngunnar
  hreyfingar.kyrr = kyrr ? mixer.clipAction(kyrr) : mixer.clipAction(ganga.clone()).setEffectiveTimeScale(0);

  virkHreyfing = hreyfingar.kyrr;
  virkHreyfing.play();
}, undefined, () => {
  // anakin.glb vantar: einfaldur staðgengill svo hægt sé að prófa senuna
  console.warn('Settu Anakin módelið í models/anakin.glb');
  const stadgengill = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.2, 6, 16), new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
  stadgengill.position.y = 0.9;
  stadgengill.castShadow = true;
  anakin.add(stadgengill);
});

// mjúk skipti á milli hreyfinga með crossFadeTo
function skiptaUmHreyfingu(ny) {
  if (!ny || ny === virkHreyfing) return;
  ny.reset().play();
  virkHreyfing.crossFadeTo(ny, 0.3, false);
  virkHreyfing = ny;
}


// ==================== DROID (VERAN Í HORNINU) ====================

// droid-hópurinn snýr sér að Anakin með lookAt, skrokkurinn inni í honum svífur með AnimationClip
const droid = new THREE.Group();
droid.position.set(-7.6, 2.3, -7.6);
scene.add(droid);
hindranir.push({ midja: new THREE.Vector3(-7.6, 0, -7.6), radius: 0.6 });

const skrokkur = new THREE.Group();
skrokkur.name = 'skrokkur';
droid.add(skrokkur);

const droidEfni = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.35, metalness: 0.4 });
const kula = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 24), droidEfni);
kula.castShadow = true;

const augaEfni = new THREE.MeshBasicMaterial({ color: 0xff2020 });
const auga = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), augaEfni);
auga.position.z = 0.42;   // lookAt snýr +z ásnum að Anakin, þess vegna er augað á +z hliðinni
const augaLjos = new THREE.PointLight(0xff2020, 2, 6, 2);
augaLjos.position.z = 0.65;
const midbaugur = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.02, 8, 48), augaEfni);   // rauður hringur um miðjuna
midbaugur.rotation.x = Math.PI / 2;
skrokkur.add(kula, auga, augaLjos, midbaugur);

for (const x of [-0.2, 0.2]) {
  const litidAuga = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), augaEfni);
  litidAuga.position.set(x, 0.14, 0.4);
  const loftnet = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.7), droidEfni);
  loftnet.position.set(x * 0.7, 0.65, -0.1);
  loftnet.rotation.z = -x;
  skrokkur.add(litidAuga, loftnet);
}

// hreyfiklippa búin til í kóða: skrokkurinn vaggar upp og niður og fæturnir sveiflast
const spor = [
  new THREE.VectorKeyframeTrack('skrokkur.position', [0, 1.5, 3], [0, -0.15, 0, 0, 0.15, 0, 0, -0.15, 0], THREE.InterpolateSmooth),
];
for (let i = 0; i < 5; i++) {
  const fotur = new THREE.Group();
  fotur.name = 'fotur' + i;
  const horn = (i / 5) * Math.PI * 2;
  fotur.position.set(Math.cos(horn) * 0.25, -0.35, Math.sin(horn) * 0.25);
  const leggur = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 1.1), droidEfni);
  leggur.position.y = -0.55;
  fotur.add(leggur);
  skrokkur.add(fotur);

  const halli = i % 2 === 0 ? 0.25 : -0.25;   // annar hver fótur sveiflast á móti
  spor.push(new THREE.NumberKeyframeTrack(`fotur${i}.rotation[x]`, [0, 1.5, 3], [-halli, halli, -halli], THREE.InterpolateSmooth));
}
const svifKlippa = new THREE.AnimationClip('Svifa', 3, spor);
const droidMixer = new THREE.AnimationMixer(droid);
droidMixer.clipAction(svifKlippa).play();


// ==================== MINN EIGIN 3D HLUTUR ====================

gltfLoader.load('models/minn-hlutur.glb', (gltf) => {
  const hlutur = gltf.scene;
  setjaIRettanSkala(hlutur, MINN_HLUTUR_HAED);
  hlutur.traverse((h) => {
    if (h.isMesh) {
      h.castShadow = true;
      h.receiveShadow = true;
    }
  });
  hlutHaldari.add(hlutur);
}, undefined, () => console.warn('Settu skannaða hlutinn í models/minn-hlutur.glb'));


// ==================== HLJÓÐ ====================

const listener = new THREE.AudioListener();
camera.add(listener);   // eyrun eru á myndavélinni

const umhverfisHljod = new THREE.Audio(listener);              // heyrist alls staðar jafnt
const sverdHljod = new THREE.PositionalAudio(listener);        // 3D hljóð sem fylgja hlutunum sínum
const kveikjaHljod = new THREE.PositionalAudio(listener);
const sveifluHljod = new THREE.PositionalAudio(listener);
const droidHljod = new THREE.PositionalAudio(listener);
const hurdHljod = new THREE.PositionalAudio(listener);

geislasverd.add(sverdHljod, kveikjaHljod, sveifluHljod);
droid.add(droidHljod);
hurd.add(hurdHljod);
for (const hljod of [sverdHljod, kveikjaHljod, sveifluHljod]) hljod.setRefDistance(6);
droidHljod.setRefDistance(1.5);
hurdHljod.setRefDistance(3);

function hladaHljodi(hljod, slod, lykkja, styrkur) {
  audioLoader.load(slod, (buffer) => {
    hljod.setBuffer(buffer);
    hljod.setLoop(lykkja);
    hljod.setVolume(styrkur);
  });
}

hladaHljodi(umhverfisHljod, 'hljod/umhverfi.mp3', true, 0.45);
hladaHljodi(sverdHljod, 'hljod/sverd.mp3', true, 0.5);
hladaHljodi(kveikjaHljod, 'hljod/kveikja.mp3', false, 0.8);
hladaHljodi(sveifluHljod, 'hljod/sveifla.mp3', false, 0.9);
hladaHljodi(droidHljod, 'hljod/droid.mp3', true, 1);
hladaHljodi(hurdHljod, 'hljod/hurd.mp3', false, 1);

function spila(hljod) {
  if (!hljod.buffer) return;
  if (hljod.isPlaying) hljod.stop();
  hljod.play();
}


// ==================== ANIME.JS HREYFINGAR ====================

// loftljósin flökta óreglulega: hver tween velur nýtt handahófskennt gildi og kallar svo á sjálfa sig aftur
function flokta(lampi) {
  const blikk = Math.random() < 0.35;
  animate(lampi.ljos, {
    intensity: blikk
      ? [lampi.styrkur, lampi.styrkur * 0.05, lampi.styrkur * 0.8, lampi.styrkur * 0.1, lampi.styrkur]
      : lampi.styrkur * utils.random(0.6, 1.1, 2),
    duration: blikk ? utils.random(250, 500) : utils.random(400, 1000),
    delay: utils.random(200, 2500),
    ease: 'inOutSine',
    onUpdate: () => {
      // peran og geislinn fylgja birtu ljóssins
      const hlutfall = lampi.ljos.intensity / lampi.styrkur;
      lampi.pera.material.emissiveIntensity = 2 * hlutfall;
      lampi.geisli.material.opacity = 0.05 * hlutfall;
    },
    onComplete: () => flokta(lampi),
  });
}
lampar.filter((l) => l.floktir).forEach(flokta);

// rauða augað í droidnum púlsar
animate(augaLjos, { intensity: [2, 8], duration: 900, loop: true, alternate: true, ease: 'inOutSine' });

// skannaði hluturinn snýst hægt á stallinum
animate(hlutHaldari, { rotateY: 360, duration: 14000, loop: true, ease: 'linear' });

let sverdKveikt = false;
let sveiflar = false;

function kveikjaASverdi(kveikt) {
  sverdKveikt = kveikt;
  animate(blad, { scaleY: kveikt ? 1 : 0, duration: kveikt ? 400 : 300, ease: kveikt ? 'outQuad' : 'inQuad' });
  animate(sverdLjos, { intensity: kveikt ? SVERD_STYRKUR : 0, duration: 400 });
  spila(kveikjaHljod);
  if (kveikt) spila(sverdHljod);
  else sverdHljod.stop();
}

function sveifla() {
  if (sveiflar || !sverdKveikt) return;
  sveiflar = true;
  spila(sveifluHljod);
  // keyframes í gráðum: lyfta upp, höggva niður og aftur í hvíldarstöðu
  animate(geislasverd, {
    rotateX: [SVERD_HALLI_X, -40, 120, SVERD_HALLI_X],
    rotateZ: [SVERD_HALLI_Z, 25, -30, SVERD_HALLI_Z],
    duration: 600,
    ease: 'inOutQuad',
    onComplete: () => { sveiflar = false; },
  });
}

// hurðin rennur mjúklega til hliðar þegar Anakin nálgast
function athugaHurd() {
  const naer = anakin.position.distanceTo(HURD_STADA) < 4.5;
  if (naer === hurdOpin) return;
  hurdOpin = naer;
  animate(vinstriHurd, { x: naer ? -2.25 : -0.75, duration: 1100, ease: 'inOutCubic' });
  animate(haegriHurd, { x: naer ? 2.25 : 0.75, duration: 1100, ease: 'inOutCubic' });
  animate(gangLjos, { intensity: naer ? 15 : 0, duration: 1100 });
  spila(hurdHljod);
}

// hringur á gólfinu þar sem smellt var
const merki = new THREE.Mesh(
  new THREE.RingGeometry(0.18, 0.26, 32),
  new THREE.MeshBasicMaterial({ color: 0x6fb2ff, transparent: true, opacity: 0, depthWrite: false }),
);
merki.rotation.x = -Math.PI / 2;
scene.add(merki);

function synaMerki(stada) {
  merki.position.set(stada.x, 0.02, stada.z);
  animate(merki, { scale: [0.4, 1.6], opacity: [1, 0], duration: 700, ease: 'outQuad' });
}


// ==================== STÝRING ====================

const takkar = new Set();   // takkar sem er haldið niðri
let markmid = null;         // staður sem var smellt á (point-and-click)
let leikurByrjadur = false;

window.addEventListener('keydown', (e) => {
  takkar.add(e.code);
  if (!leikurByrjadur) return;
  if (e.code === 'Space') {
    e.preventDefault();
    sveifla();
  }
  if (e.code === 'KeyF' && !e.repeat) kveikjaASverdi(!sverdKveikt);
});
window.addEventListener('keyup', (e) => takkar.delete(e.code));
window.addEventListener('blur', () => takkar.clear());

// Pointer Events virka bæði fyrir mús og snertiskjá. Raycaster finnur hvar á gólfinu var smellt
const raycaster = new THREE.Raycaster();
const benditill = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!leikurByrjadur) return;
  benditill.x = (e.clientX / window.innerWidth) * 2 - 1;
  benditill.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(benditill, camera);
  const hittir = raycaster.intersectObject(golf);
  if (hittir.length === 0) return;
  markmid = hittir[0].point;
  markmid.y = 0;
  synaMerki(markmid);
});

document.querySelector('#takki-sveifla').addEventListener('click', sveifla);
document.querySelector('#takki-sverd').addEventListener('click', () => kveikjaASverdi(!sverdKveikt));

const att = new THREE.Vector3();
const gamlaStada = new THREE.Vector3();

function hreyfaAnakin(delta) {
  // 1. í hvaða átt vill notandinn fara? (myndavélin horfir alltaf í -z, svo W = -z)
  att.set(0, 0, 0);
  if (takkar.has('KeyW') || takkar.has('ArrowUp')) att.z -= 1;
  if (takkar.has('KeyS') || takkar.has('ArrowDown')) att.z += 1;
  if (takkar.has('KeyA') || takkar.has('ArrowLeft')) att.x -= 1;
  if (takkar.has('KeyD') || takkar.has('ArrowRight')) att.x += 1;

  if (att.lengthSq() > 0) {
    markmid = null;   // lyklaborðið tekur við af smellinum
  } else if (markmid) {
    att.subVectors(markmid, anakin.position);
    att.y = 0;
    if (att.length() < 0.15) {
      markmid = null;
      att.set(0, 0, 0);
    }
  }

  if (att.lengthSq() === 0) {
    skiptaUmHreyfingu(hreyfingar.kyrr);
    return;
  }

  const hleypur = takkar.has('ShiftLeft') || takkar.has('ShiftRight');
  att.normalize();

  // 2. snúa Anakin mjúklega í göngustefnuna (stysta leið, Math.atan2 sér um -180°/180°)
  const markHorn = Math.atan2(att.x, att.z);
  const munur = Math.atan2(Math.sin(markHorn - anakin.rotation.y), Math.cos(markHorn - anakin.rotation.y));
  anakin.rotation.y += munur * Math.min(1, 12 * delta);

  // 3. færa hann, einn ás í einu svo hann renni meðfram hindrunum í stað þess að festast
  const skref = (hleypur ? HLAUPA_HRADI : GANGA_HRADI) * delta;
  gamlaStada.copy(anakin.position);
  anakin.position.x += att.x * skref;
  if (rekstA(anakin.position)) anakin.position.x = gamlaStada.x;
  anakin.position.z += att.z * skref;
  if (rekstA(anakin.position)) anakin.position.z = gamlaStada.z;

  // 4. veggirnir: Math.max / Math.min halda honum inni í herberginu
  anakin.position.x = Math.max(-MORK, Math.min(MORK, anakin.position.x));
  anakin.position.z = Math.max(-MORK, Math.min(MORK, anakin.position.z));

  // komst ekkert áfram (t.d. smellt hinum megin við súlu) -> hætta að reyna
  if (markmid && anakin.position.distanceTo(gamlaStada) < skref * 0.1) markmid = null;

  skiptaUmHreyfingu(hleypur ? hreyfingar.hlaupa : hreyfingar.ganga);
}


// ==================== BYRJA ====================

byrjaTakki.addEventListener('click', async () => {
  byrjaTakki.blur();   // annars myndi bilstöngin "smella" aftur á takkann
  await listener.context.resume();   // vafrinn leyfir bara hljóð eftir smell
  hledsla.classList.add('falid');
  hud.hidden = false;
  leikurByrjadur = true;
  umhverfisHljod.play();
  droidHljod.play();
  kveikjaASverdi(true);
}, { once: true });


// ==================== LYKKJAN ====================

const timer = new THREE.Timer();
timer.connect(document);
const myndavelarMark = new THREE.Vector3();
myndavelarRig.position.copy(anakin.position);

renderer.setAnimationLoop((timi) => {
  timer.update(timi);
  const delta = Math.min(timer.getDelta(), 0.1);   // ekki stór stökk ef flipinn var í bakgrunni

  if (leikurByrjadur) {
    hreyfaAnakin(delta);
    athugaHurd();
  }
  if (mixer) mixer.update(delta);
  droidMixer.update(delta);

  droid.lookAt(anakin.position.x, 1.5, anakin.position.z);   // veran fylgist með Anakin

  // myndavélin eltir Anakin mjúklega, en fer ekki svo nálægt veggjunum að hún sjái út fyrir herbergið
  myndavelarMark.copy(anakin.position);
  myndavelarMark.x = Math.max(-6.5, Math.min(6.5, myndavelarMark.x));
  myndavelarMark.z = Math.min(6.5, myndavelarMark.z);
  myndavelarRig.position.lerp(myndavelarMark, 1 - Math.exp(-4 * delta));

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
