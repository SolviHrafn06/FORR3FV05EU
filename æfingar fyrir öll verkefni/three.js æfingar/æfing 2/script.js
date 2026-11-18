import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// The editable GLB also contains Ignite and Retract clips for Blender and other apps.
const MODEL_URL = './public/anakin-episode3-animated.glb';
const IGNITION_MS = 350;
const RETRACTION_MS = 300;

const container = document.querySelector('#scene-container');
const powerButton = document.querySelector('#power-button');
const status = document.querySelector('#blade-status');
const lengthInput = document.querySelector('#blade-length');
const hiltButton = document.querySelector('#hilt-view');
const fullButton = document.querySelector('#full-view');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080c14);
const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.domElement.setAttribute('aria-label', 'Interactive Anakin lightsaber. Drag to orbit and scroll to zoom.');
container.appendChild(renderer.domElement);

const room = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(room, 0.04).texture;
scene.environmentIntensity = 0.85;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xcce5ff, 0x1b2130, 1.2));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(4, 7, 6);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x8dbaff, 2);
rimLight.position.set(-5, 5, -3);
scene.add(rimLight);
const bladeLight = new THREE.PointLight(0x448dff, 0, 7, 2);
scene.add(bladeLight);

const bladeBloomLayer = new THREE.Layers();
bladeBloomLayer.set(1);
const bloomMaskMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
const maskedMaterials = new Map();
const bloomBackground = new THREE.Color(0x000000);

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.16, 1.5);
bloomComposer.addPass(bloom);

const combinePass = new ShaderPass(new THREE.ShaderMaterial({
	uniforms: {
		baseImage: { value: null },
		bladeGlow: { value: bloomComposer.renderTarget2.texture }
	},
	vertexShader: `
		varying vec2 screenUv;
		void main() {
			screenUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: `
		uniform sampler2D baseImage;
		uniform sampler2D bladeGlow;
		varying vec2 screenUv;
		void main() {
			vec4 base = texture2D(baseImage, screenUv);
			vec3 glow = texture2D(bladeGlow, screenUv).rgb;
			gl_FragColor = vec4(base.rgb + glow, base.a);
		}
	`
}), 'baseImage');

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(new RenderPass(scene, camera));
finalComposer.addPass(combinePass);
finalComposer.addPass(new OutputPass());

function renderWithBladeGlow() {
	const background = scene.background;
	scene.background = bloomBackground;
	try {
		// Black hilt geometry still occludes the blade, but cannot generate glow.
		scene.traverse((object) => {
			if (object.isMesh && !bladeBloomLayer.test(object.layers)) {
				maskedMaterials.set(object, object.material);
				object.material = bloomMaskMaterial;
			}
		});
		bloomComposer.render();
	} finally {
		for (const [object, material] of maskedMaterials) object.material = material;
		maskedMaterials.clear();
		scene.background = background;
	}
	finalComposer.render();
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.8;
controls.maxDistance = 60;

let saber;
let bladePivot;
let hilt;
let progress = 0;
let desiredPower = false;
let transition = null;
let cameraTransition = null;
let viewMode = 'hilt';
let fullBounds;
let hiltBounds;
let viewDirection = new THREE.Vector3(0.6, 0.1, 1).normalize();

function applyBladeLength(value) {
	progress = THREE.MathUtils.clamp(value, 0, 1);
	if (!bladePivot) return;
	// The pivot is at the emitter: changing Y grows the blade from its base.
	bladePivot.scale.y = Math.max(progress, 0.000001);
	bladePivot.visible = progress > 0.0001;
	bladeLight.intensity = progress * 3;
	lengthInput.value = Math.round(progress * 100);
}

function updateControls() {
	powerButton.textContent = desiredPower ? 'Retract blade' : 'Ignite blade';
	powerButton.setAttribute('aria-pressed', String(desiredPower));
	status.textContent = transition
		? (desiredPower ? 'Igniting...' : 'Retracting...')
		: progress === 0 ? 'Blade off' : progress === 1 ? 'Blade on' : 'Blade partially extended';
}

function sampleTransition(now) {
	if (!transition) return;
	const t = Math.min((now - transition.start) / transition.duration, 1);
	const eased = t * t * (3 - 2 * t);
	applyBladeLength(THREE.MathUtils.lerp(transition.from, transition.to, eased));
	if (t === 1) {
		transition = null;
		updateControls();
	}
}

function toggleBlade() {
	if (!bladePivot) return;
	const now = performance.now();
	sampleTransition(now);
	desiredPower = !desiredPower;
	const target = Number(desiredPower);
	const duration = (desiredPower ? IGNITION_MS : RETRACTION_MS) * Math.abs(target - progress);
	transition = { from: progress, to: target, start: now, duration: Math.max(duration, 1) };
	if (desiredPower && viewMode === 'hilt') focusView('full');
	updateControls();
}

function focusView(mode, immediate = false) {
	if (!saber) return;
	viewMode = mode;
	const bounds = mode === 'hilt' ? hiltBounds : fullBounds;
	const size = bounds.getSize(new THREE.Vector3());
	const target = bounds.getCenter(new THREE.Vector3());
	const verticalFov = THREE.MathUtils.degToRad(camera.fov);
	const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
	const distance = Math.max(size.y / (2 * Math.tan(verticalFov / 2)), size.x / (2 * Math.tan(horizontalFov / 2))) * 1.22 + size.z;
	const position = target.clone().addScaledVector(viewDirection, distance);
	if (immediate) {
		camera.position.copy(position);
		controls.target.copy(target);
		cameraTransition = null;
		controls.update();
	} else {
		cameraTransition = {
			start: performance.now(),
			fromPosition: camera.position.clone(), toPosition: position,
			fromTarget: controls.target.clone(), toTarget: target
		};
	}
}

powerButton.addEventListener('click', toggleBlade);
hiltButton.addEventListener('click', () => focusView('hilt'));
fullButton.addEventListener('click', () => focusView('full'));
lengthInput.addEventListener('input', () => {
	if (!bladePivot) return;
	transition = null;
	applyBladeLength(Number(lengthInput.value) / 100);
	desiredPower = progress > 0;
	if (progress > 0 && viewMode === 'hilt') focusView('full');
	updateControls();
});
window.addEventListener('keydown', (event) => {
	if (event.code !== 'Space' || event.repeat || /^(INPUT|BUTTON|A)$/.test(document.activeElement.tagName)) return;
	event.preventDefault();
	toggleBlade();
});
controls.addEventListener('start', () => { cameraTransition = null; });

// Raycasting makes the real red switches on the hilt clickable.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown;
renderer.domElement.addEventListener('pointerdown', (event) => {
	pointerDown = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
});
renderer.domElement.addEventListener('pointercancel', () => { pointerDown = null; });
renderer.domElement.addEventListener('pointerup', (event) => {
	const start = pointerDown;
	pointerDown = null;
	if (!hilt || !start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
	const rect = renderer.domElement.getBoundingClientRect();
	pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
	raycaster.setFromCamera(pointer, camera);
	const hit = raycaster.intersectObject(hilt, true)[0];
	if (hit && /button/i.test(hit.object.name + ' ' + hit.object.material?.name)) toggleBlade();
});

new GLTFLoader().load(MODEL_URL, (gltf) => {
	saber = gltf.scene;
	bladePivot = saber.getObjectByName('BladePivot');
	hilt = saber.getObjectByName('Hilt');
	if (!bladePivot || !hilt) {
		status.textContent = 'The model is missing its blade or hilt. Restore the animated GLB.';
		return;
	}
	scene.add(saber);
	const bladeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 4.5, 10), toneMapped: false });
	bladePivot.traverse((object) => {
		if (object.isMesh) {
			object.material = bladeMaterial;
			object.layers.enable(1);
		}
	});
	bladePivot.scale.y = 1;
	saber.updateMatrixWorld(true);
	fullBounds = new THREE.Box3().setFromObject(saber);
	hiltBounds = new THREE.Box3().setFromObject(hilt);
	const switchMesh = hilt.getObjectByName('pCube2_Button_0');
	if (switchMesh) {
		const buttonCenter = new THREE.Box3().setFromObject(switchMesh).getCenter(new THREE.Vector3());
		viewDirection.set(buttonCenter.x, 0, buttonCenter.z);
		if (viewDirection.lengthSq() < 0.0001) viewDirection.set(0.6, 0, 1);
		viewDirection.normalize().setY(0.1).normalize();
		viewDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.32);
	}
	bladeLight.position.copy(bladePivot.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0.4, 0));
	applyBladeLength(0);
	for (const element of [powerButton, lengthInput, hiltButton, fullButton]) element.disabled = false;
	updateControls();
	focusView('hilt', true);
}, undefined, (error) => {
	status.textContent = 'Could not load the model. Open this folder with Live Server.';
	console.error('Could not load lightsaber:', error);
});

function onResize() {
	const width = container.clientWidth;
	const height = Math.max(container.clientHeight, 1);
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height);
	bloomComposer.setSize(width, height);
	finalComposer.setSize(width, height);
	if (saber) focusView(viewMode, true);
}
new ResizeObserver(onResize).observe(container);
onResize();

renderer.setAnimationLoop((now) => {
	sampleTransition(now);
	if (cameraTransition) {
		const t = Math.min((now - cameraTransition.start) / 550, 1);
		const eased = t * t * (3 - 2 * t);
		camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, eased);
		controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, eased);
		if (t === 1) cameraTransition = null;
	}
	controls.update();
	renderWithBladeGlow();
});
