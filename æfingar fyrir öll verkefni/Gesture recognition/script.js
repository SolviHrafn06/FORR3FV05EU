import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const LIKAN_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const LAGM_VISSA = 0.6;   // hunsa bendingar sem módelið er ekki nógu visst um
const HRADI = 1.5;        // radíanar á sekúndu

// bending -> [ás, átt]
const SNUNINGAR = {
  Thumb_Up:    [new THREE.Vector3(1, 0, 0),  1],
  Thumb_Down:  [new THREE.Vector3(1, 0, 0), -1],
  Pointing_Up: [new THREE.Vector3(0, 1, 0),  1],
  Victory:     [new THREE.Vector3(0, 1, 0), -1],
  ILoveYou:    [new THREE.Vector3(0, 0, 1),  1],
};

const stada = document.getElementById('stada');
const bendingEl = document.getElementById('bending');
const vissaEl = document.getElementById('vissa');
const video = document.getElementById('video');
const hendur = document.getElementById('hendur');
const ctx = hendur.getContext('2d');
const drawingUtils = new DrawingUtils(ctx);

// ---------- three.js sena ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('sena'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10161a);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
camera.position.set(0, 0, 3);
scene.add(new THREE.HemisphereLight(0xffffff, 0x334433, 2));
const sol = new THREE.DirectionalLight(0xffffff, 2.5);
sol.position.set(2, 3, 4);
scene.add(sol);

const hlutur = new THREE.Group();   // snúum hópnum, ekki módelinu sjálfu, svo miðjan sé alltaf í (0,0,0)
scene.add(hlutur);

function midjaOgSkala(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const staerd = box.getSize(new THREE.Vector3()).length();
  obj.position.sub(box.getCenter(new THREE.Vector3()));
  const s = 1.6 / staerd;
  const wrap = new THREE.Group();
  wrap.add(obj);
  wrap.scale.setScalar(s);
  return wrap;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
// skannaði Red Bull hluturinn úr Verkefni 3
const SLODIR = ['../../Verkefni 3/models/red-bull/red-bull.glb'];
function hladaHlut(i = 0) {
  if (i >= SLODIR.length) {
    console.warn('Fann ekki Verkefni 3/models/red-bull/red-bull.glb');
    hlutur.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.16, 160, 24), new THREE.MeshStandardMaterial({ color: 0xd75437, roughness: 0.4 })));
    return;
  }
  loader.load(SLODIR[i], (gltf) => hlutur.add(midjaOgSkala(gltf.scene)), undefined, () => hladaHlut(i + 1));
}
hladaHlut();

function stillaStaerd() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', stillaStaerd);
stillaStaerd();

// ---------- MediaPipe ----------
async function buaTilGreini() {
  const vision = await FilesetResolver.forVisionTasks(MP_URL);
  // GPU er hraðast; ef það tekst ekki (engin hröðun í vafra) förum við á CPU
  for (const delegate of ['GPU', 'CPU']) {
    try {
      const g = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: LIKAN_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      return { g, delegate };
    } catch (e) {
      console.warn(`delegate ${delegate} tókst ekki`, e);
    }
  }
  throw new Error('Gat ekki búið til GestureRecognizer');
}

let greinir = null;
let sidastiTimi = -1;
let virkBending = null;

async function byrja() {
  try {
    const [{ g, delegate }, straumur] = await Promise.all([
      buaTilGreini(),
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } }),
    ]);
    greinir = g;
    video.srcObject = straumur;
    await video.play();
    hendur.width = video.videoWidth;
    hendur.height = video.videoHeight;
    stada.textContent = `Keyrir á ${delegate}`;
  } catch (e) {
    stada.textContent = `Villa: ${e.message}`;
    console.error(e);
  }
}
byrja();

function greinaHond() {
  if (!greinir || video.currentTime === sidastiTimi) return;
  sidastiTimi = video.currentTime;
  const nidurstada = greinir.recognizeForVideo(video, performance.now());

  ctx.clearRect(0, 0, hendur.width, hendur.height);
  for (const landmarks of nidurstada.landmarks) {
    drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: '#5fd4a8', lineWidth: 4 });
    drawingUtils.drawLandmarks(landmarks, { color: '#d75437', lineWidth: 1, radius: 3 });
  }

  const best = nidurstada.gestures[0]?.[0];
  const nafn = best && best.score >= LAGM_VISSA && best.categoryName !== 'None' ? best.categoryName : null;
  bendingEl.textContent = nafn ?? '–';
  vissaEl.textContent = best ? `${Math.round(best.score * 100)}%` : '';
  if (nafn !== virkBending) {
    document.querySelectorAll('#skyring li').forEach((li) => li.classList.toggle('virk', li.dataset.g === nafn));
    virkBending = nafn;
  }
}

// ---------- lykkja ----------
const klukka = new THREE.Timer();
const enginnSnuningur = new THREE.Quaternion();
renderer.setAnimationLoop((t) => {
  klukka.update(t);
  const dt = klukka.getDelta();
  greinaHond();

  const snuningur = SNUNINGAR[virkBending];
  if (snuningur) {
    // snúa um ása heimsins svo X/Y/Z miðast alltaf við skjáinn
    hlutur.rotateOnWorldAxis(snuningur[0], snuningur[1] * HRADI * dt);
  } else if (virkBending === 'Open_Palm') {
    hlutur.quaternion.slerp(enginnSnuningur, Math.min(1, 4 * dt));
  }
  // Closed_Fist og engin bending: hluturinn stendur kyrr

  renderer.render(scene, camera);
});
