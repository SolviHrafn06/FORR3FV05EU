import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const map = [
  '#########',
  '#S  #   #',
  '### # # #',
  '#   # # #',
  '# ### # #',
  '#     #E#',
  '#########'
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x211e18);
scene.fog = new THREE.FogExp2(0x211e18, 0.07);
scene.add(new THREE.AmbientLight(0xffe8be, 0.65));

const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 70);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.append(renderer.domElement);

const message = document.querySelector('#message');
const keys = new Set();
const crawler = new THREE.Group();
scene.add(crawler);

let mixer;
let direction = 1;
let loaded = false;
let won = false;

function box(x, y, z, width, height, depth, color, glow = 0) {
  const shape = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color, emissive: glow });
  const mesh = new THREE.Mesh(shape, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

box(18, -0.1, 14, 36, 0.2, 28, 0x564a3c);
box(18, 3.3, 14, 36, 0.2, 28, 0x665f4e);

for (let row = 0; row < map.length; row++) {
  for (let col = 0; col < map[row].length; col++) {
    const x = col * 4 + 2;
    const z = row * 4 + 2;

    if (map[row][col] === '#') {
      box(x, 1.6, z, 4, 3.2, 4, 0x99885f);
    } else if ((row + col) % 3 === 2) {
      box(x, 3.12, z, 1.7, 0.08, 0.52, 0xffe3a5, 0xb8aa80);
      const light = new THREE.PointLight(0xffe1a5, 20, 9);
      light.position.set(x, 2.85, z);
      scene.add(light);
    }
  }
}

box(30, 1.2, 23.85, 1.6, 2.4, 0.15, 0x506651, 0x1c361e);

function restart() {
  keys.clear();
  won = false;
  camera.position.set(6, 1.6, 6);
  camera.rotation.set(0, -Math.PI / 2, 0);
  crawler.position.set(14, 0, 22);
  direction = 1;
  message.textContent = 'Find the green door.';
}

restart();

new GLTFLoader().load("models/fear-crawler/scene.gltf", gltf => {
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model, true);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 2.4 / Math.max(size.x, size.y, size.z, 0.001);

  const mount = new THREE.Group();
  mount.add(model);
  mount.scale.setScalar(scale);
  mount.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  crawler.add(mount);

  const clips = gltf.animations.filter(clip => clip.duration > 0);
  const walk = clips.find(clip => /crawl|walk|creep/i.test(clip.name)) || clips[0];

  if (walk) {
    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(walk).play();
  }

  console.log('Crawler clips', clips.map(clip => clip.name), 'Playing', walk?.name);
  loaded = true;
}, undefined, error => {
  console.error(error);
  message.textContent = 'The crawler failed to load. Check the browser console.';
});

function openFloor(x, z) {
  for (const dx of [-0.25, 0.25]) {
    for (const dz of [-0.25, 0.25]) {
      const col = Math.floor((x + dx) / 4);
      const row = Math.floor((z + dz) / 4);
      const tile = map[row]?.[col];
      if (!tile || tile === '#') return false;
    }
  }
  return true;
}

function key(code) {
  return keys.has(code) ? 1 : 0;
}

addEventListener('keydown', event => {
  if (event.code === 'KeyR') restart();
  else keys.add(event.code);
});
addEventListener('keyup', event => keys.delete(event.code));
addEventListener('blur', () => keys.clear());

renderer.domElement.onclick = () => renderer.domElement.requestPointerLock?.();

addEventListener('mousemove', event => {
  if (won || document.pointerLockElement !== renderer.domElement) return;
  camera.rotation.y -= event.movementX * 0.002;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - event.movementY * 0.002, -1.3, 1.3);
});

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

addEventListener('resize', resize);
resize();

let last = performance.now();

renderer.setAnimationLoop(now => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (!won) {
    const p = camera.position;
    camera.rotation.y += (key('ArrowLeft') - key('ArrowRight')) * dt * 1.8;

    const forward = key('KeyW') - key('KeyS');
    const side = key('KeyD') - key('KeyA');
    const step = 3 * dt / (Math.hypot(forward, side) || 1);
    const angle = camera.rotation.y;
    const dx = (side * Math.cos(angle) - forward * Math.sin(angle)) * step;
    const dz = (-side * Math.sin(angle) - forward * Math.cos(angle)) * step;

    if (openFloor(p.x + dx, p.z)) p.x += dx;
    if (openFloor(p.x, p.z + dz)) p.z += dz;

    if (loaded) {
      mixer?.update(dt);
      crawler.position.x += direction * dt * 1.35;
      if (crawler.position.x >= 20) direction = -1;
      if (crawler.position.x <= 7) direction = 1;
      crawler.rotation.y = direction * Math.PI / 2;

      if (Math.hypot(p.x - crawler.position.x, p.z - crawler.position.z) < 1.05) {
        restart();
        message.textContent = 'It caught you. Find another way past.';
      }
    }

    if (Math.hypot(p.x - 30, p.z - 23) < 1.2) {
      won = true;
      message.textContent = 'You escaped. Press R to play again.';
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }

  renderer.render(scene, camera);
});