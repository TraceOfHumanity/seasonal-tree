import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Clock,
  Color,
  HemisphereLight,
  DirectionalLight,
  TextureLoader,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  InstancedMesh,
  PlaneGeometry,
  Object3D,
  Vector3,
  Quaternion,
  Matrix4,
  Box3,
  DoubleSide,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

import treeUrl from './assets/tree.glb?url';
import barkColorUrl from './assets/textures/bark_basecolor.png?url';
import barkNormalUrl from './assets/textures/bark_normal.png?url';
import leafUrl from './assets/textures/leaf.png?url';

const LEAF_LAYERS = [
  { textureUrl: leafUrl, count: 1800, scale: [0.08, 0.26], pivot: [0.5, 0], spread: 0.25, awayBias: 0.3, brightness: [0.6, 1.1], fold: 0.1 },
];

const FALLING = {
  poolSize: 16,
  interval: [3, 5],
  perSpawn: [1, 2],
  speed: [0.5, 0.9],
  groundY: 0,
  easeIn: 0.8,
};

const randomBetween = (min, max) => min + Math.random() * (max - min);
const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));

function randomUnitVector(target) {
  const z = Math.random() * 2 - 1;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return target.set(r * Math.cos(angle), z, r * Math.sin(angle));
}

const canvas = document.getElementById('scene');

const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new Scene();
scene.background = new Color(0x0b0d12);

const camera = new PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 2.8, 9);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.5, 0);
controls.enableDamping = true;
controls.update();

scene.add(new HemisphereLight(0xcddeff, 0x4b3d30, 1.9));
const sun = new DirectionalLight(0xfff1d6, 2.5);
sun.position.set(4, 8, 5);
scene.add(sun);

const clock = new Clock();

function createBarkMaterial() {
  const loader = new TextureLoader();
  const map = loader.load(barkColorUrl);
  const normalMap = loader.load(barkNormalUrl);
  map.colorSpace = SRGBColorSpace;

  for (const texture of [map, normalMap]) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI / 2;
    texture.repeat.set(1.5, 15);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  return new MeshStandardMaterial({ map, normalMap, roughness: 0.9, metalness: 0 });
}

function createLeafLayer(twigs, { textureUrl, count, scale, pivot, spread, awayBias, brightness, fold }) {
  const map = new TextureLoader().load(textureUrl);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const geometry = new PlaneGeometry(1, 1, 2, 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getX(i)) < 1e-6 && Math.abs(positions.getY(i)) < 1e-6) {
      positions.setZ(i, fold);
    }
  }
  geometry.computeVertexNormals();
  geometry.translate(0.5 - pivot[0], 0.5 - pivot[1], 0);

  const material = new MeshStandardMaterial({
    map,
    alphaTest: 0.5,
    roughness: 0.8,
    side: DoubleSide,
  });
  const mesh = new InstancedMesh(geometry, material, count);

  const sampler = new MeshSurfaceSampler(twigs).build();
  const position = new Vector3();
  const offset = new Vector3();
  const direction = new Vector3();
  const away = new Vector3();
  const tint = new Color();
  const center = new Vector3();
  const dummy = new Object3D();
  const facing = new Quaternion();
  const spin = new Quaternion();
  const up = new Vector3(0, 1, 0);

  twigs.updateWorldMatrix(true, false);
  new Box3().setFromObject(twigs).getCenter(center);

  for (let i = 0; i < count; i++) {
    sampler.sample(position);

    randomUnitVector(offset).multiplyScalar(spread * Math.cbrt(Math.random()));
    dummy.position.copy(position).applyMatrix4(twigs.matrixWorld).add(offset);

    away.copy(dummy.position).sub(center).normalize();
    randomUnitVector(direction);
    const alignment = direction.dot(away);
    if (alignment < 0) direction.addScaledVector(away, -2 * alignment);
    direction.addScaledVector(away, awayBias).normalize();

    facing.setFromUnitVectors(up, direction);
    spin.setFromAxisAngle(up, Math.random() * Math.PI * 2);
    dummy.quaternion.copy(facing).multiply(spin);
    dummy.scale.setScalar(scale[0] + Math.random() ** 1.5 * (scale[1] - scale[0]));
    dummy.updateMatrix();

    mesh.setMatrixAt(i, dummy.matrix);

    mesh.setColorAt(i, tint.setScalar(brightness[0] + Math.random() * (brightness[1] - brightness[0])));
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function createFallingLeaves(crown) {
  const { poolSize, interval, perSpawn, speed, groundY, easeIn } = FALLING;

  const mesh = new InstancedMesh(crown.geometry, crown.material, poolSize);
  mesh.frustumCulled = false;

  const leaves = Array.from({ length: poolSize }, () => ({
    active: false,
    origin: new Vector3(),
    age: 0,
    speed: 0,
    scale: 1,
    swayAmp: 0,
    swayFreq: 0,
    phase: 0,
    spin: 0,
    wind: 0,
    startQuat: new Quaternion(),
  }));

  const dummy = new Object3D();
  dummy.rotation.order = 'YXZ';
  const target = new Quaternion();
  const matrix = new Matrix4();
  const hidden = new Matrix4().makeScale(0, 0, 0);
  const color = new Color(1, 1, 1);

  for (let i = 0; i < poolSize; i++) {
    mesh.setMatrixAt(i, hidden);
    mesh.setColorAt(i, color);
  }

  const remaining = Array.from({ length: crown.count }, (_, i) => i);

  function spawn() {
    if (remaining.length === 0) return;

    const slot = leaves.find((leaf) => !leaf.active);
    if (!slot) return;

    const pick = Math.floor(Math.random() * remaining.length);
    const source = remaining[pick];
    remaining[pick] = remaining[remaining.length - 1];
    remaining.pop();

    crown.getMatrixAt(source, matrix);
    matrix.decompose(slot.origin, dummy.quaternion, dummy.scale);
    crown.getColorAt(source, color);
    mesh.setColorAt(leaves.indexOf(slot), color);
    mesh.instanceColor.needsUpdate = true;

    crown.setMatrixAt(source, hidden);
    crown.instanceMatrix.needsUpdate = true;

    slot.active = true;
    slot.age = 0;
    slot.startQuat.copy(dummy.quaternion);
    slot.scale = dummy.scale.x;
    slot.speed = randomBetween(speed[0], speed[1]);
    slot.swayAmp = randomBetween(0.15, 0.4);
    slot.swayFreq = randomBetween(1.2, 2.2);
    slot.phase = Math.random() * Math.PI * 2;
    slot.spin = randomBetween(-1, 1);
    slot.wind = randomBetween(0.05, 0.2);
  }

  let timer = 1;

  function update(delta) {
    timer -= delta;
    if (timer <= 0) {
      for (let n = randomInt(perSpawn[0], perSpawn[1]); n > 0; n--) spawn();
      timer = randomBetween(interval[0], interval[1]);
    }

    for (let i = 0; i < poolSize; i++) {
      const leaf = leaves[i];
      if (!leaf.active) continue;

      leaf.age += delta;
      const t = leaf.age;
      const blend = Math.min(t / easeIn, 1);
      const smooth = blend * blend * (3 - 2 * blend);
      const y = leaf.origin.y - leaf.speed * (t - easeIn * (1 - Math.exp(-t / easeIn)));

      if (y < groundY) {
        leaf.active = false;
        mesh.setMatrixAt(i, hidden);
        continue;
      }

      const sway = t * leaf.swayFreq + leaf.phase;
      const swayX = (Math.sin(sway) - Math.sin(leaf.phase)) * leaf.swayAmp * smooth;
      const swayZ = (Math.cos(sway * 0.8) - Math.cos(leaf.phase * 0.8)) * leaf.swayAmp * smooth;
      dummy.position.set(leaf.origin.x + swayX + leaf.wind * t * smooth, y, leaf.origin.z + swayZ);

      dummy.rotation.set(
        Math.PI / 2 + Math.sin(sway * 1.3) * 0.7,
        leaf.spin * t,
        Math.cos(sway) * 0.7,
      );
      target.copy(dummy.quaternion);
      dummy.quaternion.copy(leaf.startQuat).slerp(target, smooth);
      dummy.scale.setScalar(leaf.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}

let fallingLeaves = null;

new GLTFLoader().load(treeUrl, (gltf) => {
  const barkMaterial = createBarkMaterial();
  const trunk = gltf.scene.getObjectByName('trunk');
  const twigs = gltf.scene.getObjectByName('twigs');

  for (const mesh of [trunk, twigs]) mesh.material = barkMaterial;

  scene.add(gltf.scene);
  for (const layer of LEAF_LAYERS) {
    const crown = createLeafLayer(twigs, layer);
    scene.add(crown);

    fallingLeaves = createFallingLeaves(crown);
    scene.add(fallingLeaves.mesh);
  }
});

function resize() {
  const { clientWidth: width, clientHeight: height } = canvas;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

function tick() {
  const delta = Math.min(clock.getDelta(), 0.1);

  fallingLeaves?.update(delta);
  controls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
