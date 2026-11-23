import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { animate } from 'animejs';

const HALF = 10;
const HEIGHT = 4;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a170f);
scene.fog = new THREE.FogExp2(0x1a170f, 0.09);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.append(renderer.domElement);

const manager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(manager);
const audioLoader = new THREE.AudioLoader(manager);
const timer = new THREE.Timer();

const yellow = new THREE.MeshStandardMaterial({ color: 0xc9b86a });

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(HALF * 2, HALF * 2),
  new THREE.MeshStandardMaterial({ color: 0x7d6f3c })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.01;
floor.receiveShadow = true;
scene.add(floor);

const room = new THREE.Mesh(
  new THREE.BoxGeometry(HALF * 2, HEIGHT, HALF * 2),
  new THREE.MeshStandardMaterial({ color: 0xc9b86a, side: THREE.BackSide })
);
room.position.y = HEIGHT / 2;
room.receiveShadow = true;
scene.add(room);

const obstacles = [];

function addObstacle(mesh, x, y, z, radius) {
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  obstacles.push({ x, z, radius });
}

addObstacle(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, HEIGHT), yellow), -3, HEIGHT / 2, 2, 0.6);
addObstacle(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, HEIGHT), yellow), 3, HEIGHT / 2, -3, 0.6);
addObstacle(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, HEIGHT), yellow), 0, HEIGHT / 2, 6, 0.6);
addObstacle(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x5a4a30 })), 6, 0.6, -5, 0.9);

scene.add(new THREE.AmbientLight(0xfff2c0, 0.3));

const ceilingLight = new THREE.PointLight(0xfff0b0, 10, 15);
ceilingLight.position.set(0, HEIGHT - 0.3, 0);
scene.add(ceilingLight);

function flicker() {
  animate(ceilingLight, {
    intensity: Math.random() * 10,
    duration: 50 + Math.random() * 200,
    onComplete: flicker,
  });
}

const player = new THREE.Group();
scene.add(player);

const lantern = new THREE.PointLight(0xffc870, 6, 10);
lantern.position.set(0.4, 1.2, 0.4);
lantern.castShadow = true;
player.add(lantern);

camera.position.set(0, 2.4, -4);
player.add(camera);

const listener = new THREE.AudioListener();
camera.add(listener);

let mixer;
let idle;
let walk;

gltfLoader.load('models/soldier/Soldier.glb', (gltf) => {
  gltf.scene.rotation.y = Math.PI;
  gltf.scene.traverse((o) => { o.castShadow = true; });
  player.add(gltf.scene);

  mixer = new THREE.AnimationMixer(gltf.scene);
  idle = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Idle'));
  walk = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Walk'));
  idle.play();
});

const entity = new THREE.Group();
entity.position.set(-7, 0, -7);
scene.add(entity);
obstacles.push({ x: -7, z: -7, radius: 1.3 });

let entityMixer;

gltfLoader.load('models/fear-crawler/scene.gltf', (gltf) => {
  const model = gltf.scene;
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.setScalar(2.5 / Math.max(size.x, size.y, size.z));
  model.rotation.y = -Math.PI / 2;
  model.position.y = -new THREE.Box3().setFromObject(model).min.y;
  entity.add(model);

  const clip = gltf.animations[0];
  clip.tracks = clip.tracks.filter((t) => t.name !== 'Root_04.position');
  entityMixer = new THREE.AnimationMixer(model);
  entityMixer.clipAction(clip).play();
});

const entitySound = new THREE.PositionalAudio(listener);
entity.add(entitySound);
audioLoader.load('sounds/growl.wav', (buffer) => {
  entitySound.setBuffer(buffer);
  entitySound.setLoop(true);
});

const ambientSound = new THREE.Audio(listener);
audioLoader.load('sounds/hum.wav', (buffer) => {
  ambientSound.setBuffer(buffer);
  ambientSound.setLoop(true);
  ambientSound.setVolume(0.3);
});

const can = new THREE.Group();
can.position.set(6, 1.2, -5);
scene.add(can);

gltfLoader.load('models/red-bull/red-bull.glb', (gltf) => {
  const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
  gltf.scene.scale.setScalar(0.6 / size.y);
  gltf.scene.position.y = 0.3;
  can.add(gltf.scene);
  animate(can.rotation, { y: Math.PI * 2, duration: 8000, ease: 'linear', loop: true });
});

const startButton = document.getElementById('start');

manager.onProgress = (url, loaded, total) => {
  document.getElementById('progress').textContent = `Hleð inn... ${Math.round((loaded / total) * 100)}%`;
};

manager.onLoad = () => {
  startButton.hidden = false;
};

startButton.addEventListener('click', () => {
  document.getElementById('loading').remove();
  listener.context.resume();
  ambientSound.play();
  entitySound.play();
  flicker();
  renderer.setAnimationLoop(loop);
});

const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });

function hitsObstacle(x, z) {
  return obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius + 0.4);
}

function updatePlayer(dt) {
  if (keys.KeyA || keys.ArrowLeft) player.rotation.y += 2.5 * dt;
  if (keys.KeyD || keys.ArrowRight) player.rotation.y -= 2.5 * dt;

  let move = 0;
  if (keys.KeyW || keys.ArrowUp) move = 1;
  if (keys.KeyS || keys.ArrowDown) move = -1;

  if (move !== 0) {
    const step = move * 2 * dt;
    const x = Math.max(-HALF + 0.4, Math.min(HALF - 0.4, player.position.x + Math.sin(player.rotation.y) * step));
    const z = Math.max(-HALF + 0.4, Math.min(HALF - 0.4, player.position.z + Math.cos(player.rotation.y) * step));
    if (!hitsObstacle(x, z)) player.position.set(x, 0, z);
  }

  const next = move !== 0 ? walk : idle;
  const current = next === walk ? idle : walk;
  if (!next.isRunning()) {
    next.reset().play();
    current.crossFadeTo(next, 0.3, true);
  }

  camera.lookAt(player.position.x, 1.4, player.position.z);
}

function loop(timestamp) {
  timer.update(timestamp);
  const dt = timer.getDelta();

  updatePlayer(dt);
  entity.lookAt(player.position.x, 0, player.position.z);
  mixer.update(dt);
  entityMixer.update(dt);

  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
