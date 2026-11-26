import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Hlutirnir sem hægt er að grípa: skannaða dósin + hólógrömm smíðuð í kóða (engar auka skrár).
// Allir eru staðlaðir að radíus RADIUS svo grip, árekstrar og hringir virki eins á alla.

export const RADIUS = 0.6;
export const LITIR = { blar: 0x5fe0ff, skaer: 0x2fc8ff, gulur: 0xffb35c, hvitur: 0xe8fbff, raudur: 0xff4d6d };
const MODEL_SLOD = '../../../Verkefni 3/models/red-bull/red-bull.glb';

// HDR-litur (>1) fer yfir bloom-þröskuldinn og glóir; myndavélarmyndin (<1) gerir það ekki
export const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
export const linuEfni = (hex = LITIR.blar, k = 1.8, opacity = 1) => new THREE.LineBasicMaterial({ color: hdr(hex, k), opacity, ...additive });
const grunnEfni = (hex, k, opacity = 1) => new THREE.MeshBasicMaterial({ color: hdr(hex, k), opacity, ...additive });
const linurGeo = (punktar) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(punktar, 3));

/** Fresnel-brún + skannlínur, teiknað ofan á yfirborð raunverulegra hluta. */
function gloiEfni() {
  return new THREE.ShaderMaterial({
    uniforms: { styrkur: { value: 0.12 }, litur: { value: new THREE.Color(LITIR.blar) }, timi: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying float vH;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vH = (modelMatrix * vec4(position, 1.0)).y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float styrkur; uniform vec3 litur; uniform float timi;
      varying vec3 vN; varying vec3 vV; varying float vH;
      void main() {
        float brun = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float lina = smoothstep(0.85, 1.0, fract(vH * 18.0 - timi * 1.5));
        gl_FragColor = vec4(litur * 2.0, (brun * 0.9 + lina * 0.2 + 0.05) * styrkur);
      }`,
    ...additive,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, // teiknast ofan á sama yfirborð
  });
}

// ---------- smiðir: hver skilar { innihald, update(t) } ----------

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function dos({ gloi }) {
  const g = new THREE.Group();
  const setja = (obj) => {
    if (g.userData.fjarlaegdur) { losa(obj); return; }
    const box = new THREE.Box3().setFromObject(obj);
    obj.position.sub(box.getCenter(new THREE.Vector3()));
    const wrap = new THREE.Group();
    wrap.add(obj);
    wrap.scale.setScalar((RADIUS * 2) / box.getSize(new THREE.Vector3()).length());
    const meshes = [];
    obj.traverse((m) => { if (m.isMesh) meshes.push(m); }); // safna fyrst: annars fer traverse inn í glóann
    for (const m of meshes) { m.castShadow = true; m.add(new THREE.Mesh(m.geometry, gloi)); }
    g.add(wrap);
    if (g.userData.xray) setjaXray({ innihald: g }, true);
  };
  loader.load(MODEL_SLOD, (gltf) => setja(gltf.scene), undefined, () => {
    console.warn('Fann ekki ' + MODEL_SLOD + ', nota varahlut');
    setja(new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.16, 200, 32),
      new THREE.MeshStandardMaterial({ color: 0xd75437, roughness: 0.25, metalness: 0.3 })));
  });
  return { innihald: g, update() {} };
}

function kjarni() {
  const g = new THREE.Group();
  const midja = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 2), grunnEfni(LITIR.hvitur, 3));
  const skel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.3, 1)), linuEfni(LITIR.blar, 2));
  const hringir = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.4 + i * 0.065, 0.007, 8, 160), grunnEfni(i === 1 ? LITIR.gulur : LITIR.blar, 2.4, 0.9));
    m.rotation.set(i * 1.1, i * 0.7, 0);
    return m;
  });
  g.add(midja, skel, ...hringir);
  return {
    innihald: g,
    update(t) {
      skel.rotation.set(t * 0.3, t * 0.6, 0);
      hringir.forEach((m, i) => { m.rotation.z = t * (0.8 + i * 0.4) * (i % 2 ? -1 : 1); });
      midja.scale.setScalar(1 + Math.sin(t * 4) * 0.1);
    },
  };
}

function hnottur() {
  const r = 0.48, p = [];
  const SEG = 48;
  for (let i = 1; i < 8; i++) { // breiddarbaugar
    const f = (i / 8) * Math.PI, y = Math.cos(f) * r, rr = Math.sin(f) * r;
    for (let k = 0; k < SEG; k++) {
      const a = (k / SEG) * Math.PI * 2, b = ((k + 1) / SEG) * Math.PI * 2;
      p.push(Math.cos(a) * rr, y, Math.sin(a) * rr, Math.cos(b) * rr, y, Math.sin(b) * rr);
    }
  }
  for (let j = 0; j < 12; j++) { // lengdarbaugar
    const a = (j / 12) * Math.PI * 2;
    for (let k = 0; k < SEG; k++) {
      const f = (k / SEG) * Math.PI, f2 = ((k + 1) / SEG) * Math.PI;
      p.push(Math.sin(f) * Math.cos(a) * r, Math.cos(f) * r, Math.sin(f) * Math.sin(a) * r,
        Math.sin(f2) * Math.cos(a) * r, Math.cos(f2) * r, Math.sin(f2) * Math.sin(a) * r);
    }
  }
  const borgir = [];
  for (let i = 0; i < 260; i++) {
    const u = Math.random() * 2 - 1, f = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    borgir.push(s * Math.cos(f) * r * 1.01, u * r * 1.01, s * Math.sin(f) * r * 1.01);
  }
  const hnottur = new THREE.Group();
  hnottur.add(new THREE.LineSegments(linurGeo(p), linuEfni(LITIR.blar, 1.6, 0.55)),
    new THREE.Points(linurGeo(borgir), new THREE.PointsMaterial({ color: hdr(LITIR.gulur, 3), size: 0.018, ...additive })));
  const braut = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.004, 6, 160), grunnEfni(LITIR.blar, 2.2, 0.8));
  braut.rotation.x = Math.PI / 2 + 0.35;
  const tungl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), grunnEfni(LITIR.hvitur, 3));
  const g = new THREE.Group();
  g.add(hnottur, braut, tungl);
  return {
    innihald: g,
    update(t) {
      hnottur.rotation.y = t * 0.3;
      const a = t * 1.3;
      tungl.position.set(Math.cos(a) * 0.56, 0, Math.sin(a) * 0.56).applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.35);
    },
  };
}

function helix() {
  const N = 22, H = 0.95, R = 0.2;
  const kula = new THREE.SphereGeometry(0.032, 12, 8);
  const a = new THREE.InstancedMesh(kula, grunnEfni(LITIR.blar, 2.4), N);
  const b = new THREE.InstancedMesh(kula, grunnEfni(LITIR.gulur, 2.4), N);
  const M = new THREE.Matrix4(), rimar = [];
  for (let i = 0; i < N; i++) {
    const y = -H / 2 + (i / (N - 1)) * H, f = i * 0.55;
    const x = Math.cos(f) * R, z = Math.sin(f) * R;
    a.setMatrixAt(i, M.makeTranslation(x, y, z));
    b.setMatrixAt(i, M.makeTranslation(-x, y, -z));
    rimar.push(x, y, z, -x, y, -z);
  }
  const g = new THREE.Group();
  g.add(a, b, new THREE.LineSegments(linurGeo(rimar), linuEfni(LITIR.hvitur, 1.2, 0.5)));
  return { innihald: g, update(t) { g.rotation.y = t * 0.8; } };
}

function teningur() {
  const ytri = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.66, 0.66, 0.66)), linuEfni(LITIR.blar, 2));
  const innri = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.32, 0.32, 0.32)), linuEfni(LITIR.gulur, 2.4));
  const horn = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) horn.push(new THREE.Vector3(x, y, z));
  const tp = new Float32Array(8 * 6);
  const tengi = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(tp, 3)), linuEfni(LITIR.hvitur, 1.2, 0.6));
  tengi.frustumCulled = false;
  const kristall = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), grunnEfni(LITIR.hvitur, 3));
  const g = new THREE.Group();
  g.add(ytri, innri, tengi, kristall);
  const V = new THREE.Vector3();
  return {
    innihald: g,
    update(t) {
      innri.rotation.set(t * 0.7, t * 0.5, t * 0.2);
      innri.scale.setScalar(1 + Math.sin(t * 1.6) * 0.25);
      ytri.rotation.y = -t * 0.15;
      innri.updateMatrix(); ytri.updateMatrix();
      horn.forEach((h, i) => { // tengja horn ytri og innri tenings (fjórvíddar-teningur)
        V.copy(h).multiplyScalar(0.33).applyMatrix4(ytri.matrix); tp.set([V.x, V.y, V.z], i * 6);
        V.copy(h).multiplyScalar(0.16).applyMatrix4(innri.matrix); tp.set([V.x, V.y, V.z], i * 6 + 3);
      });
      tengi.geometry.attributes.position.needsUpdate = true;
      kristall.rotation.y = t * 2;
    },
  };
}

export const SKRA = [
  { nafn: 'Red Bull', smida: dos },
  { nafn: 'Orkukjarni', smida: kjarni },
  { nafn: 'Hnöttur', smida: hnottur },
  { nafn: 'Erfðaþráður', smida: helix },
  { nafn: 'Ofurteningur', smida: teningur },
];

// ---------- hólógram-umgjörð sem allir hlutir fá ----------

function bogar(inn, ut, fjoldi, fylling) {
  const L = (2 * Math.PI) / fjoldi;
  return mergeGeometries(Array.from({ length: fjoldi }, (_, i) => new THREE.RingGeometry(inn, ut, 8, 1, i * L, L * fylling)));
}
const GEO = {
  a: bogar(1.0, 1.035, 6, 0.8),        // brotinn hringur
  b: bogar(1.1, 1.16, 72, 0.35),       // kvarðastrik
  c: new THREE.RingGeometry(0.93, 0.94, 96),
  puls: new THREE.RingGeometry(0.98, 1.0, 96),
};
export const SLOD_N = 40;

export function buaTilHlut(def) {
  const gloi = gloiEfni();
  const { innihald, update } = def.smida({ gloi });
  const group = new THREE.Group(), svif = new THREE.Group();
  svif.add(innihald);
  group.add(svif);

  const holoEfni = new THREE.MeshBasicMaterial({ color: LITIR.blar, opacity: 0, side: THREE.DoubleSide, ...additive });
  const holo = new THREE.Group();
  const hringA = new THREE.Mesh(GEO.a, holoEfni), hringB = new THREE.Mesh(GEO.b, holoEfni);
  holo.add(hringA, hringB, new THREE.Mesh(GEO.c, holoEfni));
  const puls = new THREE.Mesh(GEO.puls, new THREE.MeshBasicMaterial({ color: hdr(LITIR.hvitur, 2), opacity: 0, ...additive }));

  // kastslóð: lína sem dofnar aftur á bak
  const slodGeo = new THREE.BufferGeometry();
  slodGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SLOD_N * 3), 3).setUsage(THREE.DynamicDrawUsage));
  slodGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SLOD_N * 3), 3).setUsage(THREE.DynamicDrawUsage));
  slodGeo.setDrawRange(0, 0);
  const slod = new THREE.Line(slodGeo, new THREE.LineBasicMaterial({ vertexColors: true, ...additive }));
  slod.frustumCulled = false;

  // gagnamerki (HTML sem fylgir hlutnum)
  const el = document.createElement('div');
  el.className = 'merki';
  el.innerHTML = '<b></b><span></span>';
  el.querySelector('b').textContent = def.nafn;
  const merki = new CSS2DObject(el);

  return {
    nafn: def.nafn, group, svif, innihald, update, gloi, holo, hringA, hringB, holoEfni, puls, pulsT: 1,
    slod, slodPts: [], merki, merkiTexti: el.querySelector('span'), merkiT: 0,
    hradi: new THREE.Vector3(), snHradi: new THREE.Vector3(), staerdMark: 1, kvardi: 1,
    heldur: null, kalla: null, kallaQ: false, heima: new THREE.Vector3(),
    birting: 0, fara: null, xray: false, fyrriPos: new THREE.Vector3(), fyrriQ: new THREE.Quaternion(), hoggT: 0,
  };
}

export function setjaISenu(o, scene) { scene.add(o.group, o.holo, o.puls, o.slod, o.merki); }
function losa(...rot) {
  const geo = new Set(), efni = new Set(), texturur = new Set();
  for (const r of rot) r.traverse((m) => {
    if (m.geometry && !Object.values(GEO).includes(m.geometry)) geo.add(m.geometry);
    for (const e of (Array.isArray(m.material) ? m.material : [m.material])) if (e) efni.add(e);
  });
  for (const e of efni) {
    for (const v of Object.values(e)) if (v?.isTexture) texturur.add(v);
    e.dispose();
  }
  for (const g of geo) g.dispose();
  for (const t of texturur) t.dispose();
}

export function takaUrSenu(o, scene) {
  o.innihald.userData.fjarlaegdur = true;
  scene.remove(o.group, o.holo, o.puls, o.slod, o.merki);
  losa(o.group, o.holo, o.puls, o.slod);
  o.gloi.dispose();
}

/** Röntgen: raunverulegt yfirborð hverfur og eftir standa útlínur + glói; hólógrömm skipta um lit. */
export function setjaXray(o, kveikt) {
  o.xray = kveikt;
  o.innihald.userData.xray = kveikt;
  o.innihald.traverse((m) => {
    if (!m.material || m.userData.xrayLina) return;
    const efni = Array.isArray(m.material) ? m.material : [m.material];
    if (m.isMesh && efni.some((e) => e.isMeshStandardMaterial)) {
      for (const e of efni) e.visible = !kveikt; // material.visible: börn (útlínur, glói) sjást áfram
      if (kveikt && !m.userData.xray) {
        const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), linuEfni(LITIR.blar, 1.8, 0.85));
        l.userData.xrayLina = true;
        m.add(l);
        m.userData.xray = l;
      }
      if (m.userData.xray) m.userData.xray.visible = kveikt;
    } else {
      for (const e of efni) {
        if (!e.color) continue;
        e.userData.grunn ??= e.color.clone();
        const g = e.userData.grunn;
        e.color.copy(kveikt ? hdr(LITIR.gulur, Math.max(g.r, g.g, g.b)) : g);
      }
    }
  });
}
