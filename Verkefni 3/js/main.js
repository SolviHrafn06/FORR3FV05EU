import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { animate, utils } from 'animejs';
// Three.js adapterinn kennir anime.js á Three hluti, t.d. x, y, z, rotateY (í gráðum), scale, opacity og intensity
import 'animejs/adapters/three';
import { anakinKlippur, droidKlippur, B1_HAEGRI_HOND } from './hreyfiklippur.js';


// ==================== STILLINGAR ====================

const HALFT_HERBERGI = 10;       // herbergið nær frá -10 til 10 á x og z (20 x 20 m)
const VEGG_HAED = 6;
const ANAKIN_HAED = 1.85;        // Anakin er skalaður í þessa hæð (metrar)
const ANAKIN_RADIUS = 0.35;      // hversu breiður hann er í árekstrum
const ANAKIN_SNUNINGUR = -Math.PI / 2;   // módelið snýr í +x, við snúum því í +z
const GANGA_HRADI = 1.8;         // metrar á sekúndu (eins og venjulegur gönguhraði)
const HLAUPA_HRADI = 4.0;
const MINN_HLUTUR_HAED = 0.3;    // raunveruleg hæð hlutarins sem þú skannaðir (metrar)
const SVERD_STYRKUR = 8;         // birta geislasverðsins
const SVERD_HALLI_X = 40;        // sverðið hallar fram (gráður)
const SVERD_HALLI_Z = 15;        // og aðeins út til hægri
const DROID_HAED = 1.9;
const DROID_HRADI = 1.4;
const SKOT_HRADI = 14;
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

// dauft umhverfi sem málmar endurspegla, annars verða málmhlutir (droidar, sverðið) kolsvartir
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.2;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);

// myndavélin er barn í "rig" hópi. Rig-ið eltir Anakin og myndavélin fylgir með (scene graph)
const myndavelarRig = new THREE.Group();
myndavelarRig.add(camera);
camera.position.set(0, 4.5, 7);
camera.lookAt(0, 1.2, 0);
scene.add(myndavelarRig);

scene.add(new THREE.HemisphereLight(0x6070a0, 0x0a0a12, 1.0));   // dauf grunnbirta

// Bloom: allt sem er bjartara en hvítt (sverðið, skotin, perurnar) fær ljóma í kringum sig, eins og í bíómynd.
// Þröskuldurinn er 1, svo venjulegir upplýstir fletir ljóma ekki. Hlutir sem eiga að ljóma fá því lit sem er
// margfaldaður upp fyrir 1 (t.d. .multiplyScalar(4)).
// Senan er fyrst teiknuð í mynd (RenderPass), björtu hlutarnir eru gerðir óskýrir og lagðir ofan á (UnrealBloomPass)
// og loks er litunum breytt fyrir skjáinn (OutputPass)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.4, 1));
composer.addPass(new OutputPass());


// ==================== HLEÐSLA (LoadingManager) ====================

const hledsla = document.querySelector('#hledsla');
const framvindaStika = document.querySelector('#framvinda-stika');
const framvindaTexti = document.querySelector('#framvinda-texti');
const byrjaTakki = document.querySelector('#byrja');
const hud = document.querySelector('#hud');
const stada = document.querySelector('#stada');
const lifFylling = document.querySelector('#lif-fylling');
const stigTexti = document.querySelector('#stig');
const medsli = document.querySelector('#medsli');
const leiklok = document.querySelector('#leiklok');
const lokastig = document.querySelector('#lokastig');

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

// skalar hlut svo lengsta hliðin verði 'lengd' metrar og miðjan í 0,0,0
function setjaIMidju(hlutur, lengd) {
  hlutur.updateMatrixWorld(true);
  const kassi = new THREE.Box3().setFromObject(hlutur);
  const staerd = kassi.getSize(new THREE.Vector3());
  const midja = kassi.getCenter(new THREE.Vector3());
  const s = lengd / Math.max(staerd.x, staerd.y, staerd.z);
  hlutur.scale.multiplyScalar(s);
  hlutur.position.copy(midja).multiplyScalar(-s);
}


// ==================== ÁREKSTRAR ====================

const hindranir = [];   // hringlaga hlutir (súlur, stallur, droid, borð): { midja, radius } -> .distanceTo()
const kassar = [];      // kassalaga hlutir: THREE.Box3

function rekstA(stada, radius) {
  for (const h of hindranir) {
    if (stada.distanceTo(h.midja) < h.radius + radius) return true;
  }
  for (const k of kassar) {
    if (k.distanceToPoint(stada) < radius) return true;
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

const ljosEfni = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9cc4ff).multiplyScalar(1.4) });   // lýsandi rendur, óháðar ljósum
const rauttEfni = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3020).multiplyScalar(1.6) });

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

// gangur fyrir aftan hurðina (kassi sem er teiknaður að innan). Battle droidarnir koma þaðan
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


// ==================== SÚLUR, KASSAR, STALLUR OG HEILMYNDARBORÐ ====================

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

// heilmyndarborð: Millennium Falcon svífur yfir því sem blá heilmynd
const holoBord = new THREE.Group();
const bordFotur = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.9, 24), malmur);
bordFotur.position.y = 0.45;
bordFotur.castShadow = true;
const bordPlata = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 32), ljosEfni);
bordPlata.position.y = 0.92;
const holoKeila = new THREE.Mesh(
  new THREE.CylinderGeometry(1.0, 0.55, 1.4, 32, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x4fb4ff, transparent: true, opacity: 0.02, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
);
holoKeila.position.y = 1.64;
const holoHaldari = new THREE.Group();
holoHaldari.position.y = 1.75;
holoBord.add(bordFotur, bordPlata, holoKeila, holoHaldari);
holoBord.position.set(7.4, 0, 1);
scene.add(holoBord);
hindranir.push({ midja: new THREE.Vector3(7.4, 0, 1), radius: 0.75 });

const holoEfni = new THREE.MeshBasicMaterial({ color: 0x4fb4ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });

gltfLoader.load('models/millennium_falcon.glb', (gltf) => {
  const falki = gltf.scene;
  setjaIMidju(falki, 1.7);
  falki.traverse((h) => {
    if (h.isMesh) h.material = holoEfni;   // allt skipið fær sama gegnsæja bláa efnið
  });
  holoHaldari.add(falki);
});


// ==================== LOFTLJÓS ====================

const lampar = [];
// ljósgeislinn er lagður ofan á með AdditiveBlending í línulegum litum (fyrir bloom), svo hann þarf að vera mjög daufur
const GEISLI_STYRKUR = 0.012;

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
    new THREE.MeshBasicMaterial({ color: 0xd8e4ff, transparent: true, opacity: GEISLI_STYRKUR, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
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

// Anakin-hópurinn heldur utan um módelið. Geislasverðið er fest við hægri hönd módelsins,
// svo allt hreyfist saman þegar anakin hópurinn færist
const anakin = new THREE.Group();
anakin.position.set(0, 0, 7);
anakin.rotation.y = Math.PI;   // snýr að hurðinni í byrjun
scene.add(anakin);

const geislasverd = new THREE.Group();
geislasverd.position.set(-0.3, 1.0, 0.3);   // bráðabirgðastaða þar til módelið er komið
geislasverd.rotation.set(THREE.MathUtils.degToRad(SVERD_HALLI_X), 0, THREE.MathUtils.degToRad(SVERD_HALLI_Z));
anakin.add(geislasverd);

// einfalt skaft sem er notað þar til anakin_lightsaber.glb er komið
const skaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.028, 0.032, 0.26, 16),
  new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.3 }),
);
skaft.position.y = 0.03;

// blaðið er hópur sem byrjar í skaftinu, svo scale.y = 0 -> 1 lætur það "vaxa" upp úr skaftinu
const blad = new THREE.Group();
blad.position.y = 0.16;
blad.scale.y = 0;
const kjarni = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 1, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8f6ff).multiplyScalar(4), fog: false }));
kjarni.position.y = 0.5;
const ljomi = new THREE.Mesh(
  new THREE.CylinderGeometry(0.045, 0.05, 1.04, 16),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2f7dff).multiplyScalar(2), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
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

// skaftið úr anakin_lightsaber.glb. Í módelinu er sverðið á ská og með sínu eigin blaði,
// svo við finnum í hvaða átt blaðið vísar, tökum það burt og snúum skaftinu upp (+y)
gltfLoader.load('models/anakin_lightsaber.glb', (gltf) => {
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const innbyggtBlad = model.getObjectByName('Laser');
  const endi1 = innbyggtBlad.localToWorld(new THREE.Vector3(0, -14, 0));
  const endi2 = innbyggtBlad.localToWorld(new THREE.Vector3(0, 14, 0));
  innbyggtBlad.removeFromParent();   // við notum okkar eigið blað sem getur kviknað og slokknað

  // sá endi blaðsins sem er nær skaftinu er þar sem blaðið kemur út
  const midjaSkafts = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  const nalaegur = endi1.distanceTo(midjaSkafts) < endi2.distanceTo(midjaSkafts) ? endi1 : endi2;
  const fjarlaegur = nalaegur === endi1 ? endi2 : endi1;
  const stefna = fjarlaegur.clone().sub(nalaegur).normalize();

  const skaftHopur = new THREE.Group();
  model.position.sub(nalaegur);   // blaðið byrjar nú í 0,0,0
  skaftHopur.add(model);
  skaftHopur.quaternion.setFromUnitVectors(stefna, new THREE.Vector3(0, 1, 0));
  const lengd = new THREE.Box3().setFromObject(skaftHopur).getSize(new THREE.Vector3()).y;
  skaftHopur.scale.setScalar(0.28 / lengd);   // skaftið er 28 cm
  skaftHopur.position.y = blad.position.y;

  geislasverd.remove(skaft);
  geislasverd.add(skaftHopur);
});

let mixer = null;           // AnimationMixer fyrir Anakin
const hreyfingar = {};      // kyrr, ganga, hlaupa, vorn, hogg, verja (AnimationAction)
let virkHreyfing = null;

// Alvöru hreyfingar (mocap) sem voru fluttar yfir á Anakin og B1 með verkfaeri/flytja-hreyfingar.html.
// loadAsync skilar Promise, svo hægt er að bíða eftir bæði módelinu og hreyfingunum
const hreyfingaGogn = new THREE.FileLoader(manager).setResponseType('json').loadAsync('hreyfingar/hreyfingar.json');

// mocap klippan var tekin upp á ákveðnum hraða. timeScale lætur fæturna hreyfast jafn hratt og
// karakterinn færist, svo hann "renni" ekki eftir gólfinu
function stillaHrada(hreyfing, hradiIHaedum, haed, raunHradi) {
  hreyfing.timeScale = raunHradi / (hradiIHaedum * haed);
}

Promise.all([gltfLoader.loadAsync('models/anakin_skywalker__battlefront_ii/scene.gltf'), hreyfingaGogn]).then(([gltf, gogn]) => {
  const model = gltf.scene;

  // hreyfingar hægri handar og fingra eru búnar til úr beinagrindinni (sjá hreyfiklippur.js).
  // Það verður að gerast á meðan módelið er enn í hvíldarstöðu
  const klippur = anakinKlippur(model);

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

  // líkaminn: mocap hreyfingar, skipt á milli með crossFadeTo
  mixer = new THREE.AnimationMixer(model);
  hreyfingar.kyrr = mixer.clipAction(THREE.AnimationClip.parse(gogn.anakin.kyrr));
  hreyfingar.ganga = mixer.clipAction(THREE.AnimationClip.parse(gogn.anakin.ganga));
  hreyfingar.hlaupa = mixer.clipAction(THREE.AnimationClip.parse(gogn.anakin.hlaupa));
  stillaHrada(hreyfingar.ganga, gogn.hradi.ganga, ANAKIN_HAED, GANGA_HRADI);
  stillaHrada(hreyfingar.hlaupa, gogn.hradi.hlaupa, ANAKIN_HAED, HLAUPA_HRADI);
  virkHreyfing = hreyfingar.kyrr;
  virkHreyfing.play();

  // hægri höndin og fingurnir eru sér: þeir halda sverðinu í vörn, höggva eða verja skot
  hreyfingar.vorn = mixer.clipAction(klippur.vorn);
  hreyfingar.vorn.play();
  for (const nafn of ['hogg', 'verja']) {
    hreyfingar[nafn] = mixer.clipAction(klippur[nafn]);
    hreyfingar[nafn].setLoop(THREE.LoopOnce);
    hreyfingar[nafn].clampWhenFinished = true;
  }
  mixer.addEventListener('finished', (e) => {
    if (e.action !== hreyfingar.hogg && e.action !== hreyfingar.verja) return;
    hreyfingar.vorn.play();   // fyrst vörn í gang, svo stöðva hina, annars blikkar höndin
    e.action.stop();
    sveiflar = false;
  });

  // festa sverðið í lófann: setja það á réttan stað og festa það svo við handarbeinið með attach(),
  // sem heldur stöðunni í heiminum óbreyttri. Eftir það fylgir sverðið hendinni í öllum hreyfingum
  mixer.update(0);
  anakin.updateMatrixWorld(true);
  const hond = model.getObjectByName('ValveBipedBip01_R_Hand_017');
  const fingur = model.getObjectByName('ValveBipedBip01_R_Finger2_024');
  const lofi = hond.getWorldPosition(new THREE.Vector3()).lerp(fingur.getWorldPosition(new THREE.Vector3()), 0.6);
  geislasverd.position.copy(anakin.worldToLocal(lofi));
  hond.attach(geislasverd);
}).catch((villa) => {
  // módelið vantar: einfaldur staðgengill svo hægt sé að prófa senuna
  console.warn('Gat ekki hlaðið Anakin', villa);
  const stadgengill = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.2, 6, 16), new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
  stadgengill.position.y = 0.9;
  stadgengill.castShadow = true;
  anakin.add(stadgengill);
});

// hönd Anakins gerir eina hreyfingu (högg eða verja) og fer svo aftur í vörn
function handarHreyfing(hreyfing) {
  if (sveiflar || !hreyfing) return false;
  sveiflar = true;
  hreyfing.reset().play();   // fyrst nýja hreyfingin í gang, svo stöðva vörnina
  hreyfingar.vorn.stop();
  return true;
}

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

const augaEfni = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2020).multiplyScalar(2) });
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


// ==================== STAR WARS MERKIÐ ====================

// merkið er barn myndavélarinnar og flýgur burt inn í þokuna þegar smellt er á Byrja
const merkiHopur = new THREE.Group();
merkiHopur.position.z = -2.2;
merkiHopur.visible = false;
camera.add(merkiHopur);

gltfLoader.load('models/star_wars_-_logo/scene.gltf', (gltf) => {
  const merki = gltf.scene;
  setjaIMidju(merki, 3.2);
  merki.traverse((h) => {
    if (!h.isMesh) return;
    const gult = h.material.name.includes('Amarillo');
    // MeshBasicMaterial lýsir sjálft, depthTest: false teiknar það ofan á allt annað
    h.material = new THREE.MeshBasicMaterial({ color: gult ? 0xffe81f : 0x000000, depthTest: false });
    h.renderOrder = gult ? 11 : 10;
  });
  merkiHopur.add(merki);
});


// ==================== HLJÓÐ ====================

const listener = new THREE.AudioListener();
camera.add(listener);   // eyrun eru á myndavélinni

const umhverfisHljod = new THREE.Audio(listener);              // heyrist alls staðar jafnt
const sverdHljod = new THREE.PositionalAudio(listener);        // 3D hljóð sem fylgja hlutunum sínum
const kveikjaHljod = new THREE.PositionalAudio(listener);
const sveifluHljod = new THREE.PositionalAudio(listener);
const endurkastHljod = new THREE.PositionalAudio(listener);
const droidHljod = new THREE.PositionalAudio(listener);
const hurdHljod = new THREE.PositionalAudio(listener);

geislasverd.add(sverdHljod, kveikjaHljod, sveifluHljod, endurkastHljod);
droid.add(droidHljod);
hurd.add(hurdHljod);
for (const hljod of [sverdHljod, kveikjaHljod, sveifluHljod, endurkastHljod]) hljod.setRefDistance(6);
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
hladaHljodi(endurkastHljod, 'hljod/endurkast.mp3', false, 0.9);
hladaHljodi(droidHljod, 'hljod/droid.mp3', true, 1);
hladaHljodi(hurdHljod, 'hljod/hurd.mp3', false, 1);

// hljóð battle droidanna: hver droid fær sitt eigið PositionalAudio en þeir deila sömu bufferunum
const bufferar = {};
audioLoader.load('hljod/blaster.mp3', (b) => { bufferar.blaster = b; });
audioLoader.load('hljod/sprenging.mp3', (b) => { bufferar.sprenging = b; });

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
      lampi.geisli.material.opacity = GEISLI_STYRKUR * hlutfall;
    },
    onComplete: () => flokta(lampi),
  });
}
lampar.filter((l) => l.floktir).forEach(flokta);

// rauða augað í droidnum púlsar
animate(augaLjos, { intensity: [2, 8], duration: 900, loop: true, alternate: true, ease: 'inOutSine' });

// skannaði hluturinn og heilmyndin snúast hægt
animate(hlutHaldari, { rotateY: 360, duration: 14000, loop: true, ease: 'linear' });
animate(holoHaldari, { rotateY: 360, duration: 18000, loop: true, ease: 'linear' });

// heilmyndin flöktir öðru hvoru eins og sendingin sé slæm
function holoFlokt() {
  animate(holoEfni, {
    opacity: [0.4, utils.random(0.05, 0.25, 2), 0.4],
    duration: utils.random(150, 350),
    delay: utils.random(800, 3500),
    onComplete: holoFlokt,
  });
}
holoFlokt();

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

// hurðin rennur mjúklega til hliðar þegar Anakin eða battle droid nálgast
function athugaHurd() {
  const naer = anakin.position.distanceTo(HURD_STADA) < 4.5
    || ovinir.some((o) => o.lifandi && o.hopur.position.distanceTo(HURD_STADA) < 4.5);
  if (naer === hurdOpin) return;
  hurdOpin = naer;
  animate(vinstriHurd, { x: naer ? -2.25 : -0.75, duration: 1100, ease: 'inOutCubic' });
  animate(haegriHurd, { x: naer ? 2.25 : 0.75, duration: 1100, ease: 'inOutCubic' });
  animate(gangLjos, { intensity: naer ? 15 : 0, duration: 1100 });
  spila(hurdHljod);
}

// hringur á gólfinu þar sem smellt var
const smellMerki = new THREE.Mesh(
  new THREE.RingGeometry(0.18, 0.26, 32),
  new THREE.MeshBasicMaterial({ color: 0x6fb2ff, transparent: true, opacity: 0, depthWrite: false }),
);
smellMerki.rotation.x = -Math.PI / 2;
scene.add(smellMerki);

function synaSmell(stada) {
  smellMerki.position.set(stada.x, 0.02, stada.z);
  animate(smellMerki, { scale: [0.4, 1.6], opacity: [1, 0], duration: 700, ease: 'outQuad' });
}

// neistar sem skjótast út frá stað (þegar droid er sigraður)
const neistaLogun = new THREE.BoxGeometry(0.05, 0.05, 0.05);
const neistaEfni = new THREE.MeshBasicMaterial({ color: 0xffc040 });

function neistar(stada) {
  for (let i = 0; i < 14; i++) {
    const neisti = new THREE.Mesh(neistaLogun, neistaEfni);
    neisti.position.copy(stada);
    scene.add(neisti);
    animate(neisti, {
      x: stada.x + utils.random(-1.2, 1.2, 2),
      y: [stada.y, stada.y + utils.random(0.3, 1.2, 2), 0.03],
      z: stada.z + utils.random(-1.2, 1.2, 2),
      scale: [1.5, 0.3],
      duration: utils.random(500, 900),
      ease: 'outQuad',
      onComplete: () => scene.remove(neisti),
    });
  }
}


// ==================== BATTLE DROIDAR (ÓVINIR) ====================

let droidSnidmat = null;     // B1 módelið, afritað fyrir hvern nýjan droid
let b1Klippur = null;
const ovinir = [];           // { hopur, velta, mixer, ganga, kyrr, virk, hlaup, hljod, lifandi, naestaSkot }
const skot = [];             // leysiskot á flugi: { bolti, hradi, skyttan, endurkastad, eftir }
let lif = 100;
let stig = 0;
let leikLokid = false;
let naestiOvinur = 6;        // hvenær næsti droid kemur (sekúndur frá byrjun)

// einföld byssa úr kössum og sívalningi. 'hlaup' er tómur hlutur við endann þar sem skotin koma út
function buaTilByssu() {
  const byssa = new THREE.Group();
  const efni = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.7 });
  const bolur = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.32), efni);
  bolur.position.z = 0.1;
  const handfang = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.04), efni);
  handfang.position.y = -0.06;
  const pipa = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 8).rotateX(Math.PI / 2), efni);
  pipa.position.set(0, 0.015, 0.38);
  const kikir = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8).rotateX(Math.PI / 2), efni);
  kikir.position.set(0, 0.06, 0.05);
  const hlaup = new THREE.Object3D();
  hlaup.name = 'hlaup';
  hlaup.position.set(0, 0.015, 0.52);
  byssa.add(bolur, handfang, pipa, kikir, hlaup);
  return byssa;
}

Promise.all([gltfLoader.loadAsync('models/b1_battle_droid_star_wars/scene.gltf'), hreyfingaGogn]).then(([gltf, gogn]) => {
  const model = gltf.scene;
  b1Klippur = droidKlippur(model);   // áður en módelinu er snúið, eins og hjá Anakin
  b1Klippur.ganga = THREE.AnimationClip.parse(gogn.b1.ganga);
  b1Klippur.kyrr = THREE.AnimationClip.parse(gogn.b1.kyrr);
  b1Klippur.gangaHradi = gogn.hradi.ganga;
  model.rotation.y = -Math.PI / 2;
  setjaIRettanSkala(model, DROID_HAED);
  model.traverse((h) => {
    if (h.isMesh) h.frustumCulled = false;
  });

  // setja droidinn í miðstöðu, láta byssuna í hægri hönd hans og festa hana við handarbeinið
  const bradabirgda = new THREE.AnimationMixer(model);
  bradabirgda.clipAction(b1Klippur.mida).play();
  bradabirgda.update(0);
  model.updateMatrixWorld(true);
  const hond = model.getObjectByName(B1_HAEGRI_HOND);
  const fingur = model.getObjectByName('Bone031_020');
  const byssa = buaTilByssu();
  byssa.position.copy(hond.getWorldPosition(new THREE.Vector3()).lerp(fingur.getWorldPosition(new THREE.Vector3()), 0.5));
  hond.attach(byssa);
  bradabirgda.stopAllAction();

  droidSnidmat = model;
});

function buaTilOvin() {
  // hopur snýr sér og færist, velta er notuð til að láta hann detta aftur á bak
  const hopur = new THREE.Group();
  const velta = new THREE.Group();
  const model = SkeletonUtils.clone(droidSnidmat);   // SkeletonUtils afritar líka beinagrindina (og byssuna)
  velta.add(model);
  hopur.add(velta);
  hopur.position.set(utils.random(-0.8, 0.8, 2), 0, -H - 5);   // byrjar innst í ganginum
  scene.add(hopur);

  // tvö lög eins og hjá Anakin: líkaminn gengur eða stendur (mocap), hendurnar miða alltaf byssunni
  const mixer = new THREE.AnimationMixer(model);
  const ganga = mixer.clipAction(b1Klippur.ganga);
  const kyrr = mixer.clipAction(b1Klippur.kyrr);
  stillaHrada(ganga, b1Klippur.gangaHradi, DROID_HAED, DROID_HRADI);
  ganga.time = Math.random() * b1Klippur.ganga.duration;   // ekki allir í takt
  ganga.play();
  mixer.clipAction(b1Klippur.mida).play();

  const hljod = new THREE.PositionalAudio(listener);
  hljod.setRefDistance(3);
  hopur.add(hljod);

  ovinir.push({ hopur, velta, mixer, ganga, kyrr, virk: ganga, hlaup: model.getObjectByName('hlaup'), hljod, lifandi: true, naestaSkot: 0 });
}

function droidSkiptir(o, ny) {
  if (ny === o.virk) return;
  ny.reset().play();
  o.virk.crossFadeTo(ny, 0.3, false);
  o.virk = ny;
}

const skotLogun = new THREE.CapsuleGeometry(0.035, 0.5, 4, 8).rotateX(Math.PI / 2);   // liggur eftir z-ás
const skotEfni = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd8d0).multiplyScalar(4), fog: false });   // mjög bjartur kjarni
const skotLjomiLogun = new THREE.CapsuleGeometry(0.09, 0.55, 4, 8).rotateX(Math.PI / 2);
const skotLjomiEfni = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2010).multiplyScalar(2), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const blossiLogun = new THREE.SphereGeometry(0.08, 10, 8);

// skotblossi: lítil kúla sem stækkar og dofnar á 150 ms
function blossi(stada) {
  const kula = new THREE.Mesh(blossiLogun, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7050).multiplyScalar(4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  kula.position.copy(stada);
  scene.add(kula);
  animate(kula, {
    scale: [0.5, 2.2],
    opacity: [1, 0],
    duration: 150,
    ease: 'outQuad',
    onComplete: () => {
      scene.remove(kula);
      kula.material.dispose();
    },
  });
}

function skjota(o) {
  const bolti = new THREE.Mesh(skotLogun, skotEfni);
  bolti.add(new THREE.Mesh(skotLjomiLogun, skotLjomiEfni));   // rauður ljómi utan um kjarnann
  const upphaf = o.hlaup.getWorldPosition(new THREE.Vector3());   // endinn á byssuhlaupinu
  const mark = anakin.position.clone().setY(1.2);
  bolti.position.copy(upphaf);
  bolti.lookAt(mark);
  scene.add(bolti);
  skot.push({ bolti, hradi: mark.sub(upphaf).normalize().multiplyScalar(SKOT_HRADI), skyttan: o, endurkastad: false, eftir: 3 });
  blossi(upphaf);
  o.hljod.setBuffer(bufferar.blaster);
  spila(o.hljod);
}

function framAnakins() {
  return new THREE.Vector3(Math.sin(anakin.rotation.y), 0, Math.cos(anakin.rotation.y));
}

function uppfaeraOvini(delta, nuna) {
  for (const o of ovinir) {
    o.mixer.update(delta);
    if (!o.lifandi || leikLokid) continue;

    const p = o.hopur.position;
    const iGangi = p.z < -H + 1.5;
    const fjarlaegd = p.distanceTo(anakin.position);

    if (iGangi || fjarlaegd > 6) {
      // ganga: fyrst beint út úr ganginum, svo í átt að Anakin
      const mark = iGangi ? new THREE.Vector3(p.x * 0.5, 0, -H + 2) : anakin.position;
      o.hopur.lookAt(mark.x, 0, mark.z);
      const att = new THREE.Vector3().subVectors(mark, p).setY(0).normalize().multiplyScalar(DROID_HRADI * delta);
      p.x += att.x;
      if (!iGangi && rekstA(p, 0.4)) p.x -= att.x;
      p.z += att.z;
      if (!iGangi && rekstA(p, 0.4)) p.z -= att.z;
      if (!iGangi) {
        p.x = Math.max(-MORK, Math.min(MORK, p.x));
        p.z = Math.max(-MORK, Math.min(MORK, p.z));
      }
      droidSkiptir(o, o.ganga);
    } else {
      // nógu nálægt: stoppa, miða og skjóta
      o.hopur.lookAt(anakin.position.x, 0, anakin.position.z);
      droidSkiptir(o, o.kyrr);
      if (nuna > o.naestaSkot) {
        if (o.naestaSkot > 0) skjota(o);
        o.naestaSkot = nuna + utils.random(1.6, 3, 2);
      }
    }
  }
}

// Skotið fer langt í hverjum ramma ef tölvan er hæg. Þess vegna er athugað hversu nálægt
// LEIÐINNI sem skotið fór í þessum ramma (THREE.Line3) hluturinn er, ekki bara nýju stöðunni.
const leid = new THREE.Line3();
const naestaPunktur = new THREE.Vector3();

function nalaegtLeid(punktur, fjarlaegd) {
  leid.closestPointToPoint(punktur, true, naestaPunktur);
  return naestaPunktur.distanceTo(punktur) < fjarlaegd;
}

function uppfaeraSkot(delta) {
  const brjost = anakin.position.clone().setY(1.2);
  for (let i = skot.length - 1; i >= 0; i--) {
    const s = skot[i];
    leid.start.copy(s.bolti.position);
    s.bolti.position.addScaledVector(s.hradi, delta);
    leid.end.copy(s.bolti.position);
    s.eftir -= delta;
    let burt = s.eftir <= 0;

    if (!s.endurkastad && nalaegtLeid(brjost, 0.6)) {
      // Anakin ver sig ef sverðið logar og hann snýr að skotinu (minna en ~70° frá)
      const komFra = s.hradi.clone().normalize().negate();
      if (sverdKveikt && framAnakins().dot(komFra) > 0.35) {
        s.endurkastad = true;
        const markDroid = s.skyttan.hopur.position.clone().setY(1.2);
        s.hradi.subVectors(markDroid, s.bolti.position).normalize().multiplyScalar(SKOT_HRADI * 1.3);
        s.bolti.lookAt(markDroid);
        spila(endurkastHljod);
        handarHreyfing(hreyfingar.verja);
        animate(sverdLjos, { intensity: [SVERD_STYRKUR * 2.5, SVERD_STYRKUR], duration: 300 });
      } else {
        meidast(10);
        burt = true;
      }
    } else if (s.endurkastad && s.skyttan.lifandi && nalaegtLeid(s.skyttan.hopur.position.clone().setY(1.2), 0.7)) {
      sigra(s.skyttan);   // skotið fór aftur í droidinn sem skaut því
      burt = true;
    }

    if (burt) {
      scene.remove(s.bolti);
      skot.splice(i, 1);
    }
  }
}

// droid sigraður: dettur aftur á bak, neistar fljúga og hann sekkur svo í gólfið
function sigra(o) {
  if (!o.lifandi) return;
  o.lifandi = false;
  o.mixer.timeScale = 0;   // allar hreyfingar droidsins stoppa
  stig += 1;
  uppfaeraStodu();
  o.hljod.setBuffer(bufferar.sprenging);
  spila(o.hljod);
  neistar(o.hopur.position.clone().setY(1.3));
  animate(o.velta, { rotateX: -90, rotateZ: utils.random(-30, 30), duration: 700, ease: 'outBounce' });   // dettur aftur á bak, aðeins á ská
  animate(o.hopur, {
    y: -0.6,
    duration: 1200,
    delay: 2500,
    ease: 'inQuad',
    onComplete: () => {
      scene.remove(o.hopur);
      const i = ovinir.indexOf(o);
      if (i >= 0) ovinir.splice(i, 1);
    },
  });
}

function hoggHittir() {
  const fram = framAnakins();
  for (const o of ovinir) {
    if (!o.lifandi) continue;
    const att = new THREE.Vector3().subVectors(o.hopur.position, anakin.position);
    const fjarlaegd = att.length();
    if (fjarlaegd < 2.4 && att.normalize().dot(fram) > 0.3) sigra(o);
  }
}

function sveifla() {
  if (!sverdKveikt || leikLokid) return;
  if (!handarHreyfing(hreyfingar.hogg)) return;
  spila(sveifluHljod);
  setTimeout(hoggHittir, 200);       // sverðið hittir um miðja hreyfingu
}

function meidast(magn) {
  lif = Math.max(0, lif - magn);
  uppfaeraStodu();
  animate(medsli, { opacity: [0.7, 0], duration: 500, ease: 'outQuad' });
  animate(camera, { x: [0, 0.14, -0.1, 0.05, 0], duration: 300 });   // myndavélin hristist
  if (lif === 0) {
    leikLokid = true;
    lokastig.textContent = `Þú sigraðir ${stig} droida`;
    leiklok.hidden = false;
    skiptaUmHreyfingu(hreyfingar.kyrr);
  }
}

function uppfaeraStodu() {
  lifFylling.style.width = lif + '%';
  stigTexti.textContent = `Droidar sigraðir: ${stig}`;
}

function byrjaUpp() {
  for (const o of ovinir) scene.remove(o.hopur);
  ovinir.length = 0;
  for (const s of skot) scene.remove(s.bolti);
  skot.length = 0;
  lif = 100;
  stig = 0;
  uppfaeraStodu();
  anakin.position.set(0, 0, 7);
  anakin.rotation.y = Math.PI;
  markmid = null;
  naestiOvinur = timer.getElapsed() + 3;
  leikLokid = false;
  leiklok.hidden = true;
  if (!sverdKveikt) kveikjaASverdi(true);
}

document.querySelector('#aftur').addEventListener('click', byrjaUpp);


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
  if (!leikurByrjadur || leikLokid) return;
  benditill.x = (e.clientX / window.innerWidth) * 2 - 1;
  benditill.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(benditill, camera);
  const hittir = raycaster.intersectObject(golf);
  if (hittir.length === 0) return;
  markmid = hittir[0].point;
  markmid.y = 0;
  synaSmell(markmid);
});

document.querySelector('#takki-sveifla').addEventListener('click', sveifla);
document.querySelector('#takki-sverd').addEventListener('click', () => kveikjaASverdi(!sverdKveikt));

const att = new THREE.Vector3();
const gamlaStada = new THREE.Vector3();

// Anakin rekst bæði á fasta hluti og á battle droidana
function anakinRekstA(stada) {
  if (rekstA(stada, ANAKIN_RADIUS)) return true;
  return ovinir.some((o) => o.lifandi && stada.distanceTo(o.hopur.position) < 0.4 + ANAKIN_RADIUS);
}

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
  if (anakinRekstA(anakin.position)) anakin.position.x = gamlaStada.x;
  anakin.position.z += att.z * skref;
  if (anakinRekstA(anakin.position)) anakin.position.z = gamlaStada.z;

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
  stada.hidden = false;
  leikurByrjadur = true;
  naestiOvinur = timer.getElapsed() + 6;
  umhverfisHljod.play();
  droidHljod.play();
  kveikjaASverdi(true);

  // Star Wars merkið flýgur burt inn í þokuna
  merkiHopur.visible = true;
  animate(merkiHopur, { z: [-2.2, -45], duration: 6000, ease: 'inSine', onComplete: () => camera.remove(merkiHopur) });
}, { once: true });


// ==================== LYKKJAN ====================

const timer = new THREE.Timer();
timer.connect(document);
const myndavelarMark = new THREE.Vector3();
myndavelarRig.position.copy(anakin.position);

renderer.setAnimationLoop((timi) => {
  timer.update(timi);
  const delta = Math.min(timer.getDelta(), 0.1);   // ekki stór stökk ef flipinn var í bakgrunni
  const nuna = timer.getElapsed();

  if (leikurByrjadur && !leikLokid) {
    hreyfaAnakin(delta);

    // nýr battle droid kemur inn um hurðina öðru hvoru, oftar eftir því sem stigin hækka
    const aLifi = ovinir.filter((o) => o.lifandi).length;
    if (droidSnidmat && nuna > naestiOvinur && aLifi < Math.min(5, 2 + Math.floor(stig / 4))) {
      buaTilOvin();
      naestiOvinur = nuna + Math.max(2.5, 6 - stig * 0.25);
    }
  }
  if (leikurByrjadur) athugaHurd();
  uppfaeraOvini(delta, nuna);
  uppfaeraSkot(delta);
  if (mixer) mixer.update(delta);
  droidMixer.update(delta);

  droid.lookAt(anakin.position.x, 1.5, anakin.position.z);   // veran fylgist með Anakin

  // myndavélin eltir Anakin mjúklega, en fer ekki svo nálægt veggjunum að hún sjái út fyrir herbergið
  myndavelarMark.copy(anakin.position);
  myndavelarMark.x = Math.max(-6.5, Math.min(6.5, myndavelarMark.x));
  myndavelarMark.z = Math.min(6.5, myndavelarMark.z);
  myndavelarRig.position.lerp(myndavelarMark, 1 - Math.exp(-4 * delta));

  composer.render();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
