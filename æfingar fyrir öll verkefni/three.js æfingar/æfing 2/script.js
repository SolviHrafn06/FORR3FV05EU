import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101522);

const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
camera.position.set(5, 4, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const renderContainer = document.querySelector('#scene-container, #container, main') || document.body;
if (renderContainer === document.body) {
	document.body.style.margin = '0';
	document.body.style.overflow = 'hidden';
}
renderer.domElement.style.display = 'block';
renderContainer.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 2));
const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(5, 8, 6);
scene.add(keyLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const loader = new GLTFLoader();
loader.load(
	'./millennium-falcon.glb',
	(gltf) => {
		const model = gltf.scene;
		scene.add(model);

		// Center and frame the model regardless of its original scale.
		const bounds = new THREE.Box3().setFromObject(model);
		const center = bounds.getCenter(new THREE.Vector3());
		const size = bounds.getSize(new THREE.Vector3());
		model.position.sub(center);

		const largestDimension = Math.max(size.x, size.y, size.z);
		if (largestDimension > 0) {
			const scale = 4 / largestDimension;
			model.scale.setScalar(scale);
		}

		controls.target.set(0, 0, 0);
		camera.position.set(5, 4, 7);
		controls.update();
	},
	undefined,
	(error) => console.error('Could not load ./millennium-falcon.glb:', error)
);

function onResize() {
	const width = renderContainer.clientWidth || window.innerWidth;
	const height = renderContainer.clientHeight || window.innerHeight;
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height);
}
window.addEventListener('resize', onResize);
onResize();

function animate() {
	requestAnimationFrame(animate);
	controls.update();
	renderer.render(scene, camera);
}
animate();
