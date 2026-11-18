import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { animate, utils } from 'animejs';

// ==================== STILLINGAR ====================

// Módel skipsins og TIE flauganna. Ef skrárnar eru ekki til eru einföld líkön úr grunnformum notuð.
export const SKIP_SLOD = 'models/skip.glb';
export const TIE_SLOD = 'models/tie.glb';
export const SKIP_SNUNINGUR = 0;   // ef skip.glb vísar ekki fram (+z): prófaðu Math.PI eða ±Math.PI / 2
const TIE_SNUNINGUR = 0;
export const SKIP_LENGD = 8;       // metrar
const TIE_LENGD = 6;

const GRUNNHRADI = 34;             // m/s
const HRADAUKNING = 75;            // m/s með Shift / Hraði takkanum
const BEYGJA = 1.5;                // rad/s til hliðar
const HALLI = 1.2;                 // rad/s upp/niður
const SKOT_HRADI = 240;
const TIE_HRADI = 36;
const TIE_BEYGJA = 1.1;            // rad/s
const HEIMSMORK = 700;             // lengra en þetta frá miðju og skipið snýr sjálft við
const BYLGJUR = 5;

const Z_AS = new THREE.Vector3(0, 0, 1);


// ==================== LÍKÖN ÚR GRUNNFORMUM ====================

// Skip Anakins (Jedi orrustuflaug) úr grunnformum, vísar fram í +z
export function buaTilSkipslikan() {
  const skip = new THREE.Group();
  const gult = new THREE.MeshStandardMaterial({ color: 0xd9b34a, roughness: 0.5, metalness: 0.4 });
  const grar = new THREE.MeshStandardMaterial({ color: 0x5c6068, roughness: 0.5, metalness: 0.6 });
  const gler = new THREE.MeshStandardMaterial({ color: 0x0c1830, roughness: 0.1, metalness: 0.9 });
  const glodir = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8a40).multiplyScalar(2) });

  // þríhyrndur skrokkur (útpressaður þríhyrningur)
  const lögun = new THREE.Shape([new THREE.Vector2(0, 4.2), new THREE.Vector2(-1.6, -3.4), new THREE.Vector2(1.6, -3.4)]);
  const skrokkur = new THREE.Mesh(new THREE.ExtrudeGeometry(lögun, { depth: 0.55, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12 }), gult);
  skrokkur.rotation.x = Math.PI / 2;
  skrokkur.position.y = 0.3;

  const stjornklefi = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 12), gler);
  stjornklefi.scale.set(1, 0.6, 1.6);
  stjornklefi.position.set(0, 0.45, -0.6);

  skip.add(skrokkur, stjornklefi);

  // vængir með hreyfli á endanum
  for (const hlid of [-1, 1]) {
    const vaengur = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.6), grar);
    vaengur.position.set(hlid * 2.6, 0, -1.6);
    vaengur.rotation.z = hlid * -0.12;
    const hreyfill = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 2.4, 16).rotateX(Math.PI / 2), grar);
    hreyfill.position.set(hlid * 4.2, -0.2, -2.1);
    const logi = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), glodir);
    logi.position.set(hlid * 4.2, -0.2, -3.32);
    logi.rotation.y = Math.PI;
    skip.add(vaengur, hreyfill, logi);
  }
  skip.traverse((h) => {
    if (h.isMesh) h.castShadow = true;
  });
  return skip;
}

// TIE orrustuflaug úr grunnformum: kúla og tveir sexhyrndir vængir, vísar fram í +z
function buaTilTieLikan() {
  const tie = new THREE.Group();
  const grar = new THREE.MeshStandardMaterial({ color: 0x7c8088, roughness: 0.5, metalness: 0.5 });
  const dokkt = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, metalness: 0.4 });
  const kula = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), grar);
  const gluggi = new THREE.Mesh(new THREE.CircleGeometry(0.55, 8), dokkt);
  gluggi.position.z = 0.99;
  const stod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.4, 10).rotateZ(Math.PI / 2), grar);
  tie.add(kula, gluggi, stod);
  for (const hlid of [-1, 1]) {
    const vaengur = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.14, 6).rotateZ(Math.PI / 2), dokkt);
    vaengur.position.x = hlid * 2.3;
    const rammi = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.08, 4, 6).rotateY(Math.PI / 2), grar);
    rammi.position.x = hlid * 2.3;
    tie.add(vaengur, rammi);
  }
  return tie;
}

// skalar hlut svo lengsta hliðin verði 'lengd' og miðjan í 0,0,0
function iMidju(hlutur, lengd) {
  hlutur.updateMatrixWorld(true);
  const kassi = new THREE.Box3().setFromObject(hlutur);
  const staerd = kassi.getSize(new THREE.Vector3());
  const s = lengd / Math.max(staerd.x, staerd.y, staerd.z);
  hlutur.scale.multiplyScalar(s);
  hlutur.position.copy(kassi.getCenter(new THREE.Vector3())).multiplyScalar(-s);
}

// hleður módeli ef það er til, setur það í hóp sem snýr rétt og er í réttri stærð
export function hladaModeli(gltfLoader, slod, lengd, snuningur, tilbuid) {
  gltfLoader.load(slod, (gltf) => {
    const model = gltf.scene;
    model.rotation.y = snuningur;
    iMidju(model, lengd);
    const hopur = new THREE.Group();
    hopur.add(model);
    tilbuid(hopur);
  }, undefined, () => console.warn(`${slod} fannst ekki, nota einfalt líkan í staðinn`));
}


// ==================== ÁFERÐIR TEIKNAÐAR Í KÓÐA ====================

// pláneta: láréttar rendur í sandlitum með smá suði (CanvasTexture)
export function plánetuAferd() {
  const strigi = document.createElement('canvas');
  strigi.width = 1024;
  strigi.height = 512;
  const c = strigi.getContext('2d');
  const litir = ['#c98b54', '#a8693c', '#e2b07a', '#8f5a35', '#d79e63', '#b97b4b'];
  for (let y = 0; y < 512; y += 4) {
    c.fillStyle = litir[Math.floor((Math.sin(y * 0.031) + Math.sin(y * 0.11) + 2) * 1.49) % litir.length];
    c.fillRect(0, y, 1024, 4);
  }
  for (let i = 0; i < 2500; i++) {
    c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,230,200' : '60,30,10'},${Math.random() * 0.15})`;
    c.fillRect(Math.random() * 1024, Math.random() * 512, Math.random() * 40, Math.random() * 3);
  }
  const aferd = new THREE.CanvasTexture(strigi);
  aferd.colorSpace = THREE.SRGBColorSpace;
  return aferd;
}

// mjúkur hringlaga blettur, notaður í stjörnuþokur
function blettur(litur) {
  const strigi = document.createElement('canvas');
  strigi.width = strigi.height = 256;
  const c = strigi.getContext('2d');
  const halli = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  halli.addColorStop(0, litur);
  halli.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = halli;
  c.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(strigi);
}

// stjörnur sem punktar á stórri kúlu
export function buaTilStjornur(fjoldi, radius) {
  const stodur = [];
  const litir = [];
  const litur = new THREE.Color();
  for (let i = 0; i < fjoldi; i++) {
    const att = new THREE.Vector3().randomDirection().multiplyScalar(radius * utils.random(0.9, 1.1, 2));
    stodur.push(att.x, att.y, att.z);
    litur.setHSL(utils.random(0.55, 0.7, 2), 0.3, utils.random(0.6, 1, 2));
    if (Math.random() < 0.1) litur.setHSL(0.1, 0.6, 0.8);   // nokkrar gulleitar
    litir.push(litur.r, litur.g, litur.b);
  }
  const logun = new THREE.BufferGeometry();
  logun.setAttribute('position', new THREE.Float32BufferAttribute(stodur, 3));
  logun.setAttribute('color', new THREE.Float32BufferAttribute(litir, 3));
  return new THREE.Points(logun, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false }));
}


// ==================== GEIMURINN ====================

export function buaTilGeimsins({ gltfLoader, audioLoader, listener, spila, meidast, fekkStig, sigur, erLokid }) {
  const sena = new THREE.Scene();
  sena.background = new THREE.Color(0x000003);

  const myndavel = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 6000);
  sena.add(myndavel);

  sena.add(new THREE.AmbientLight(0x3a4466, 0.8));
  const sol = new THREE.DirectionalLight(0xfff0dd, 3);
  sol.position.set(-600, 300, 400);
  sena.add(sol);

  sena.add(buaTilStjornur(6000, 2500));

  // stjörnuþokur: stórar, gegnsæjar myndir (Sprite) sem snúa alltaf að myndavélinni
  for (const [litur, x, y, z, s] of [['#5a2a8a', -1400, 400, -1800, 2200], ['#1a5a7a', 1600, -300, -1200, 1800], ['#7a2a4a', 600, 900, 1800, 2000]]) {
    const thoka = new THREE.Sprite(new THREE.SpriteMaterial({ map: blettur(litur), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6, fog: false }));
    thoka.position.set(x, y, z);
    thoka.scale.setScalar(s);
    sena.add(thoka);
  }

  // pláneta með lofthjúp
  const planeta = new THREE.Mesh(new THREE.SphereGeometry(700, 64, 32), new THREE.MeshStandardMaterial({ map: plánetuAferd(), roughness: 1 }));
  planeta.position.set(1200, -500, -2600);
  planeta.rotation.z = 0.3;
  const lofthjupur = new THREE.Mesh(
    new THREE.SphereGeometry(740, 64, 32),
    new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false }),
  );
  planeta.add(lofthjupur);
  sena.add(planeta);
  animate(planeta, { rotateY: 360, duration: 600000, loop: true, ease: 'linear' });

  // loftsteinar: íkosahedra þar sem hver hornpunktur er færður aðeins til, svo þeir verði óreglulegir
  const loftsteinar = [];
  const steinEfni = new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 0.95, metalness: 0.05, flatShading: true });
  const steinLogun = [];
  for (let i = 0; i < 5; i++) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, 1));
    const p = g.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, j).multiplyScalar(utils.random(0.75, 1.25, 2));
      p.setXYZ(j, v.x, v.y * 0.8, v.z);
    }
    g.computeVertexNormals();
    steinLogun.push(g);
  }
  for (let i = 0; i < 70; i++) {
    const steinn = new THREE.Mesh(steinLogun[i % 5], steinEfni);
    const radius = utils.random(3, 20, 1);
    steinn.scale.setScalar(radius);
    steinn.position.randomDirection().multiplyScalar(utils.random(260, 650, 0));   // belti utan við miðjuna þar sem barist er
    steinn.position.y *= 0.3;   // flestir í belti
    steinn.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    sena.add(steinn);
    loftsteinar.push({ steinn, radius, snuningur: new THREE.Vector3(utils.random(-0.3, 0.3, 2), utils.random(-0.3, 0.3, 2), 0) });
  }

  // geimryk nálægt skipinu: gefur tilfinningu fyrir hraða þó geimurinn sé tómur
  const RYK = 60;
  const rykStodur = new Float32Array(500 * 3).map(() => utils.random(-RYK, RYK, 1));
  const rykLogun = new THREE.BufferGeometry();
  rykLogun.setAttribute('position', new THREE.BufferAttribute(rykStodur, 3));
  const ryk = new THREE.Points(rykLogun, new THREE.PointsMaterial({ color: 0x8899bb, size: 0.25, transparent: true, opacity: 0.6 }));
  sena.add(ryk);

  // ---------- skipið ----------
  // skip færist og snýst, skipHalli hallar sér bara í beygjum (útlit)
  const skip = new THREE.Group();
  skip.rotation.order = 'YXZ';   // fyrst snúið til hliðar (y), svo upp/niður (x), svo veltu (z)
  const skipHalli = new THREE.Group();
  skip.add(skipHalli);
  let skipLikan = buaTilSkipslikan();
  skipHalli.add(skipLikan);
  sena.add(skip);

  function nyttSkip(likan) {
    skipHalli.remove(skipLikan);
    skipLikan = likan;
    skipHalli.add(skipLikan);
  }

  // ---------- TIE módelið ----------
  let tieSnidmat = buaTilTieLikan();
  hladaModeli(gltfLoader, TIE_SLOD, TIE_LENGD, TIE_SNUNINGUR, (hopur) => { tieSnidmat = hopur; });

  // ---------- hljóð ----------
  const hreyfillHljod = new THREE.Audio(listener);
  const byssuHljod = new THREE.Audio(listener);
  const bufferar = {};
  audioLoader.load('hljod/hreyfill.mp3', (b) => {
    hreyfillHljod.setBuffer(b);
    hreyfillHljod.setLoop(true);
    hreyfillHljod.setVolume(0.35);
  });
  audioLoader.load('hljod/geislabyssa.mp3', (b) => {
    byssuHljod.setBuffer(b);
    byssuHljod.setVolume(0.35);
  });
  audioLoader.load('hljod/tie.mp3', (b) => { bufferar.tie = b; });
  audioLoader.load('hljod/sprenging.mp3', (b) => { bufferar.sprenging = b; });
  audioLoader.load('hljod/blaster.mp3', (b) => { bufferar.blaster = b; });

  // nokkur 3D hljóð sem eru endurnýtt fyrir sprengingar
  const sprengiHljod = [];
  for (let i = 0; i < 4; i++) {
    const h = new THREE.PositionalAudio(listener);
    h.setRefDistance(25);
    const hlutur = new THREE.Object3D();
    hlutur.add(h);
    sena.add(hlutur);
    sprengiHljod.push(h);
  }
  let naestaSprengiHljod = 0;

  // ---------- HUD ----------
  const hud = document.querySelector('#geim-hud');
  const midja = document.querySelector('#mid');
  const geimTexti = document.querySelector('#geim-texti');
  const tilkynning = document.querySelector('#tilkynning');
  const vidvorun = document.querySelector('#vidvorun');
  const merkiPottur = [];   // HTML merki sem sýna hvar óvinirnir eru

  function merkiNr(i) {
    while (merkiPottur.length <= i) {
      const m = document.createElement('div');
      m.className = 'ovinamerki';
      hud.appendChild(m);
      merkiPottur.push(m);
    }
    return merkiPottur[i];
  }

  function tilkynna(texti) {
    tilkynning.textContent = texti;
    animate(tilkynning, { opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 1.05], duration: 2600, ease: 'outQuad' });
  }

  // ---------- stýring ----------
  const takkar = new Set();
  const styri = new THREE.Vector2();   // -1..1, frá mús eða fingri
  let fingurNidri = false;
  let skjotaHaldid = false;
  let hradaukningHaldid = false;
  let virkt = false;

  window.addEventListener('keydown', (e) => {
    if (!virkt) return;
    takkar.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => takkar.delete(e.code));
  window.addEventListener('blur', () => {
    takkar.clear();
    skjotaHaldid = false;
  });

  function setjaStyri(e) {
    styri.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  }

  const strigi = document.querySelector('canvas');
  strigi.addEventListener('pointermove', (e) => {
    if (!virkt) return;
    if (e.pointerType === 'mouse' || fingurNidri) setjaStyri(e);
  });
  strigi.addEventListener('pointerdown', (e) => {
    if (!virkt) return;
    if (e.pointerType === 'mouse') skjotaHaldid = true;
    else fingurNidri = true;
    setjaStyri(e);
  });
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') skjotaHaldid = false;
    else {
      fingurNidri = false;
      styri.set(0, 0);
    }
  });
  strigi.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') styri.set(0, 0);
  });

  // ---------- leysiskot ----------
  const skotLogun = new THREE.CapsuleGeometry(0.12, 3, 4, 8).rotateX(Math.PI / 2);
  const rauttSkot = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3020).multiplyScalar(5) });
  const graentSkot = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x40ff60).multiplyScalar(5) });
  const skot = [];   // { mesh, hradi, eftir, fra: 'leikmadur' | 'tie' }
  let naestaSkotTimi = 0;
  let vinstriByssa = true;

  function buaTilSkot(fra, stada, att, efni, hradi) {
    const mesh = new THREE.Mesh(skotLogun, efni);
    mesh.position.copy(stada);
    mesh.quaternion.setFromUnitVectors(Z_AS, att);
    sena.add(mesh);
    skot.push({ mesh, hradi: att.clone().multiplyScalar(hradi), eftir: 2, fra });
  }

  // miðunaraðstoð: TIE sem er nær en ~8° frá stefnu skipsins
  function finnaMark(stada, fram) {
    let besta = null;
    let bestaHorn = 0.14;
    for (const t of tie) {
      if (!t.lifandi) continue;
      const att = t.hopur.position.clone().sub(stada);
      const fjarlaegd = att.length();
      const horn = att.normalize().angleTo(fram);
      if (fjarlaegd < 500 && horn < bestaHorn) {
        besta = t;
        bestaHorn = horn;
      }
    }
    return besta;
  }

  function skjotaLeikmadur(nuna) {
    if (nuna < naestaSkotTimi) return;
    naestaSkotTimi = nuna + 0.13;
    const fram = Z_AS.clone().applyQuaternion(skip.quaternion);
    const byssa = skip.localToWorld(new THREE.Vector3(vinstriByssa ? 4.2 : -4.2, -0.2, 1));
    vinstriByssa = !vinstriByssa;
    let att = fram;
    const mark = finnaMark(byssa, fram);
    if (mark) {
      // miða þangað sem TIE flaugin verður þegar skotið nær henni
      const timi = mark.hopur.position.distanceTo(byssa) / SKOT_HRADI;
      const framTie = Z_AS.clone().applyQuaternion(mark.hopur.quaternion);
      att = mark.hopur.position.clone().addScaledVector(framTie, TIE_HRADI * timi).sub(byssa).normalize();
    }
    buaTilSkot('leikmadur', byssa, att, rauttSkot, SKOT_HRADI + hradi);
    spila(byssuHljod);
  }

  // ---------- TIE flaugar ----------
  const tie = [];   // { hopur, lif, astand, astandTil, fordaAtt, naestaSkot, hljod, oskradi }
  let bylgja = 0;
  let millibylgja = 0;   // tími þegar næsta bylgja kemur

  function buaTilTie(stada) {
    const hopur = tieSnidmat.clone();
    hopur.position.copy(stada);
    hopur.lookAt(skip.position);
    sena.add(hopur);
    const hljod = new THREE.PositionalAudio(listener);
    hljod.setRefDistance(12);
    hopur.add(hljod);
    tie.push({ hopur, lif: 2, lifandi: true, astand: 'atak', astandTil: 0, fordaAtt: new THREE.Vector3(), naestaSkot: 0, hljod, oskradi: 0 });
  }

  function nyBylgja(nuna) {
    bylgja += 1;
    const fjoldi = 2 + bylgja;
    const fram = Z_AS.clone().applyQuaternion(skip.quaternion);
    for (let i = 0; i < fjoldi; i++) {
      // birtast í hóp langt fyrir framan skipið
      const stada = skip.position.clone().addScaledVector(fram, 380).add(new THREE.Vector3().randomDirection().multiplyScalar(80));
      buaTilTie(stada);
    }
    tilkynna(`Bylgja ${bylgja} af ${BYLGJUR}`);
    millibylgja = 0;
  }

  const hjalp = new THREE.Object3D();   // notað til að reikna í hvaða átt TIE á að snúa

  function uppfaeraTie(delta, nuna) {
    for (const t of tie) {
      if (!t.lifandi) continue;
      const p = t.hopur.position;
      const tilSkips = skip.position.clone().sub(p);
      const fjarlaegd = tilSkips.length();

      // atak: fljúga að skipinu (aðeins á undan því). Of nálægt: forða sér í smá stund og koma svo aftur
      let markAtt;
      if (t.astand === 'atak') {
        const framSkips = Z_AS.clone().applyQuaternion(skip.quaternion);
        markAtt = skip.position.clone().addScaledVector(framSkips, hradi * 0.6).sub(p);
        if (fjarlaegd < 40) {
          t.astand = 'forda';
          t.astandTil = nuna + utils.random(2, 3.5, 2);
          t.fordaAtt.randomDirection().add(tilSkips.clone().normalize().multiplyScalar(-1.5)).normalize();
        }
      } else {
        markAtt = t.fordaAtt;
        if (nuna > t.astandTil) t.astand = 'atak';
      }

      // snúa mjúklega í áttina (rotateTowards takmarkar hversu hratt hún getur beygt)
      hjalp.position.copy(p);
      hjalp.lookAt(p.clone().add(markAtt));
      t.hopur.quaternion.rotateTowards(hjalp.quaternion, TIE_BEYGJA * delta);
      const fram = Z_AS.clone().applyQuaternion(t.hopur.quaternion);
      p.addScaledVector(fram, TIE_HRADI * delta);

      // skjóta ef skipið er beint fyrir framan
      if (t.astand === 'atak' && fjarlaegd < 220 && fram.angleTo(tilSkips) < 0.18 && nuna > t.naestaSkot) {
        t.naestaSkot = nuna + utils.random(1.2, 2.4, 2);
        for (const hlid of [-1, 1]) {
          // TIE flugmenn hitta ekki alltaf: smá handahófskennd skekkja
          const att = tilSkips.clone().normalize().add(new THREE.Vector3().randomDirection().multiplyScalar(0.05)).normalize();
          buaTilSkot('tie', t.hopur.localToWorld(new THREE.Vector3(hlid * 1.2, -0.3, 2)), att, graentSkot, 150);
        }
        if (bufferar.blaster) {
          t.hljod.setBuffer(bufferar.blaster);
          spila(t.hljod);
        }
      }

      // TIE öskrar þegar hún þýtur framhjá
      if (fjarlaegd < 45 && nuna > t.oskradi && bufferar.tie) {
        t.oskradi = nuna + 4;
        t.hljod.setBuffer(bufferar.tie);
        spila(t.hljod);
      }
    }
  }

  // ---------- sprengingar ----------
  const blossiLogun = new THREE.SphereGeometry(1, 16, 10);
  const brakLogun = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const brakEfni = new THREE.MeshStandardMaterial({ color: 0x555a60, emissive: 0xff5010, emissiveIntensity: 1.5 });

  function sprenging(stada, staerd) {
    const blossi = new THREE.Mesh(blossiLogun, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa040).multiplyScalar(6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    blossi.position.copy(stada);
    sena.add(blossi);
    animate(blossi, {
      scale: [staerd * 0.3, staerd * 2],
      opacity: [1, 0],
      duration: 700,
      ease: 'outExpo',
      onComplete: () => {
        sena.remove(blossi);
        blossi.material.dispose();
      },
    });
    for (let i = 0; i < 14; i++) {
      const brak = new THREE.Mesh(brakLogun, brakEfni);
      brak.position.copy(stada);
      sena.add(brak);
      const att = new THREE.Vector3().randomDirection().multiplyScalar(staerd * utils.random(2, 5, 1));
      animate(brak, {
        x: stada.x + att.x,
        y: stada.y + att.y,
        z: stada.z + att.z,
        rotateX: utils.random(-720, 720),
        rotateY: utils.random(-720, 720),
        scale: [utils.random(0.5, 1.5, 2), 0],
        duration: utils.random(900, 1600),
        ease: 'outCubic',
        onComplete: () => sena.remove(brak),
      });
    }
    if (bufferar.sprenging) {
      const h = sprengiHljod[naestaSprengiHljod++ % sprengiHljod.length];
      h.parent.position.copy(stada);
      h.setBuffer(bufferar.sprenging);
      spila(h);
    }
  }

  // ---------- árekstrar skota ----------
  const leid = new THREE.Line3();
  const naesti = new THREE.Vector3();
  function nalaegt(punktur, fjarlaegd) {
    leid.closestPointToPoint(punktur, true, naesti);
    return naesti.distanceTo(punktur) < fjarlaegd;
  }

  function uppfaeraSkot(delta) {
    for (let i = skot.length - 1; i >= 0; i--) {
      const s = skot[i];
      leid.start.copy(s.mesh.position);
      s.mesh.position.addScaledVector(s.hradi, delta);
      leid.end.copy(s.mesh.position);
      s.eftir -= delta;
      let burt = s.eftir <= 0;

      if (s.fra === 'leikmadur') {
        for (const t of tie) {
          if (t.lifandi && nalaegt(t.hopur.position, 3.5)) {
            burt = true;
            t.lif -= 1;
            if (t.lif <= 0) {
              t.lifandi = false;
              sprenging(t.hopur.position.clone(), 3);
              sena.remove(t.hopur);
              fekkStig();
            } else {
              animate(t.hopur, { rotateZ: `+=${utils.random(-90, 90)}`, duration: 400, ease: 'outQuad' });   // hristist við högg
            }
            break;
          }
        }
      } else if (nalaegt(skip.position, 2.5)) {
        burt = true;
        meidast(4);
        hristingur = 0.5;
      }

      if (!burt) {
        for (const l of loftsteinar) {
          if (nalaegt(l.steinn.position, l.radius * 0.9)) {
            burt = true;
            break;
          }
        }
      }
      if (burt) {
        sena.remove(s.mesh);
        skot.splice(i, 1);
      }
    }
    // fjarlægja dauðar TIE úr listanum
    for (let i = tie.length - 1; i >= 0; i--) if (!tie[i].lifandi) tie.splice(i, 1);
  }

  // ---------- skjámerki ----------
  const v = new THREE.Vector3();
  function uppfaeraMerki() {
    // miðið: punktur langt fyrir framan skipið, varpað á skjáinn
    v.set(0, 0, 150).applyMatrix4(skip.matrixWorld).project(myndavel);
    midja.style.transform = `translate(${(v.x * 0.5 + 0.5) * window.innerWidth}px, ${(-v.y * 0.5 + 0.5) * window.innerHeight}px)`;

    let i = 0;
    for (const t of tie) {
      if (!t.lifandi) continue;
      const m = merkiNr(i++);
      m.style.display = 'block';
      v.copy(t.hopur.position).project(myndavel);
      const fyrirAftan = v.z > 1;
      if (fyrirAftan) v.multiplyScalar(-1);
      const aSkja = !fyrirAftan && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
      if (aSkja) {
        m.classList.remove('utan');
        m.style.transform = `translate(${(v.x * 0.5 + 0.5) * window.innerWidth}px, ${(-v.y * 0.5 + 0.5) * window.innerHeight}px)`;
      } else {
        // ör við jaðar skjásins sem bendir í áttina að flauginni
        m.classList.add('utan');
        const horn = Math.atan2(v.y, v.x);
        const x = Math.cos(horn) * 0.9, y = Math.sin(horn) * 0.85;
        m.style.transform = `translate(${(x * 0.5 + 0.5) * window.innerWidth}px, ${(-y * 0.5 + 0.5) * window.innerHeight}px) rotate(${-horn}rad)`;
      }
    }
    for (; i < merkiPottur.length; i++) merkiPottur[i].style.display = 'none';
  }

  // ---------- flugið ----------
  let hradi = GRUNNHRADI;
  let beygjuHradi = 0;
  let hallaHradi = 0;
  let hristingur = 0;
  let naestiArekstur = 0;
  const kamMark = new THREE.Vector3();
  const horfa = new THREE.Vector3();

  function fljuga(delta, nuna) {
    // stefna frá lyklaborði, annars frá mús/fingri (með smá dauðu svæði í miðjunni)
    let x = 0, y = 0;
    if (takkar.has('KeyA') || takkar.has('ArrowLeft')) x -= 1;
    if (takkar.has('KeyD') || takkar.has('ArrowRight')) x += 1;
    if (takkar.has('KeyW') || takkar.has('ArrowUp')) y += 1;
    if (takkar.has('KeyS') || takkar.has('ArrowDown')) y -= 1;
    if (x === 0 && y === 0) {
      x = Math.abs(styri.x) > 0.08 ? styri.x : 0;
      y = Math.abs(styri.y) > 0.08 ? styri.y : 0;
    }

    // utan marka: snúa sjálfkrafa aftur að miðjunni
    const utan = skip.position.length() > HEIMSMORK;
    vidvorun.hidden = !utan;
    if (utan) {
      const tilMidju = skip.position.clone().negate();
      const horn = Math.atan2(tilMidju.x, tilMidju.z);
      const munur = Math.atan2(Math.sin(horn - skip.rotation.y), Math.cos(horn - skip.rotation.y));
      x = -Math.sign(munur);
    }

    // mjúkt: hraði beygjunnar nálgast það sem beðið er um (tregða)
    beygjuHradi += (-x * BEYGJA - beygjuHradi) * Math.min(1, 5 * delta);
    hallaHradi += (y * HALLI - hallaHradi) * Math.min(1, 5 * delta);
    skip.rotation.y += beygjuHradi * delta;
    skip.rotation.x = THREE.MathUtils.clamp(skip.rotation.x - hallaHradi * delta, -1.2, 1.2);
    // skipið hallar sér inn í beygjuna og aðeins upp/niður
    skipHalli.rotation.z = THREE.MathUtils.lerp(skipHalli.rotation.z, -beygjuHradi * 0.55, Math.min(1, 6 * delta));

    const hradaukning = takkar.has('ShiftLeft') || takkar.has('ShiftRight') || hradaukningHaldid;
    hradi = THREE.MathUtils.lerp(hradi, hradaukning ? HRADAUKNING : GRUNNHRADI, Math.min(1, 2 * delta));
    const fram = Z_AS.clone().applyQuaternion(skip.quaternion);
    skip.position.addScaledVector(fram, hradi * delta);

    if (takkar.has('Space') || skjotaHaldid) skjotaLeikmadur(nuna);

    // árekstur við loftstein
    for (const l of loftsteinar) {
      if (nuna > naestiArekstur && skip.position.distanceTo(l.steinn.position) < l.radius + 2.5) {
        naestiArekstur = nuna + 1;
        meidast(12);
        hristingur = 1;
        sprenging(skip.position.clone().addScaledVector(fram, 4), 1);
        skip.position.addScaledVector(fram, -8);   // skoppar aftur
      }
    }

    // myndavélin eltir skipið mjúklega (aftan við og aðeins fyrir ofan) og horfir fram fyrir það
    skip.updateMatrixWorld();
    skip.localToWorld(kamMark.set(0, 3, -12));
    myndavel.position.lerp(kamMark, 1 - Math.exp(-6 * delta));
    if (hristingur > 0) {
      myndavel.position.add(new THREE.Vector3().randomDirection().multiplyScalar(hristingur * 0.6));
      hristingur = Math.max(0, hristingur - delta * 2);
    }
    myndavel.lookAt(skip.localToWorld(horfa.set(0, 1.5, 40)));
    // breiðara sjónsvið þegar hraðinn eykst
    myndavel.fov = THREE.MathUtils.lerp(myndavel.fov, hradaukning ? 80 : 65, Math.min(1, 3 * delta));
    myndavel.updateProjectionMatrix();

    // geimrykið: punktur sem fer of langt frá skipinu birtist hinum megin
    const p = rykLogun.attributes.position;
    for (let i = 0; i < p.count; i++) {
      for (let a = 0; a < 3; a++) {
        const munur = p.array[i * 3 + a] - skip.position.getComponent(a);
        if (munur > RYK) p.array[i * 3 + a] -= RYK * 2;
        else if (munur < -RYK) p.array[i * 3 + a] += RYK * 2;
      }
    }
    p.needsUpdate = true;

    geimTexti.textContent = `Hraði ${Math.round(hradi * 3.6)} km/klst · Bylgja ${bylgja}/${BYLGJUR} · TIE eftir: ${tie.filter((t) => t.lifandi).length}`;
  }

  // ---------- opinbert viðmót ----------
  return {
    sena,
    myndavel,
    nyttSkip,
    get virkt() { return virkt; },

    byrja() {
      virkt = true;
      hud.hidden = false;
      skip.position.set(0, 0, 200);
      skip.rotation.set(0, Math.PI, 0);   // snýr inn að miðjunni
      skip.updateMatrixWorld();
      myndavel.position.copy(skip.localToWorld(new THREE.Vector3(0, 3, -12)));
      bylgja = 0;
      millibylgja = 0;   // fyrsta bylgjan kemur eftir 3 sek
      if (hreyfillHljod.buffer) hreyfillHljod.play();
    },

    stoppa() {
      virkt = false;
      hud.hidden = true;
      if (hreyfillHljod.isPlaying) hreyfillHljod.stop();
      for (const t of tie) sena.remove(t.hopur);
      tie.length = 0;
      for (const s of skot) sena.remove(s.mesh);
      skot.length = 0;
      takkar.clear();
      skjotaHaldid = false;
    },

    skjota(haldid) { skjotaHaldid = haldid; },
    hradaukning(haldid) { hradaukningHaldid = haldid; },

    uppfaera(delta, nuna) {
      for (const l of loftsteinar) {
        l.steinn.rotation.x += l.snuningur.x * delta;
        l.steinn.rotation.y += l.snuningur.y * delta;
      }
      if (!virkt) return;
      if (!erLokid()) {
        fljuga(delta, nuna);
        uppfaeraTie(delta, nuna);
        // næsta bylgja 3 sek eftir að síðasta TIE er sigruð
        if (tie.length === 0) {
          if (millibylgja === 0) millibylgja = nuna + 3;
          if (nuna > millibylgja) {
            if (bylgja >= BYLGJUR) {
              virkt = false;
              sigur();
            } else {
              nyBylgja(nuna);
            }
          }
        }
      }
      uppfaeraSkot(delta);
      uppfaeraMerki();
    },

    stilla() {
      myndavel.aspect = window.innerWidth / window.innerHeight;
      myndavel.updateProjectionMatrix();
    },
  };
}
