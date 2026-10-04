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
  EquirectangularReflectionMapping,
  SRGBColorSpace,
  InstancedMesh,
  PlaneGeometry,
  Object3D,
  Vector2,
  Vector3,
  Quaternion,
  Matrix4,
  Box3,
  DoubleSide,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

import { createSnowfall } from './snowfall.js';
import treeUrl from './assets/tree.glb?url';
import barkColorUrl from './assets/textures/bark_basecolor.png?url';
import leafUrl from './assets/textures/leaf.png?url';
import groundUrl from './assets/textures/ground.jpg?url';
import skyUrl from './assets/textures/sky.hdr?url';

const LEAF_LAYERS = [
  { textureUrl: leafUrl, count: 1800, scale: [0.08, 0.26], pivot: [0.5, 0], spread: 0.25, awayBias: 0.3, brightness: [0.6, 1.1], fold: 0.1 },
];

const FALLING = {
  poolSize: 16,
  interval: [3, 5],
  perSpawn: [1, 2],
  speed: [0.5, 0.9],
  groundY: 0.05,
  easeIn: 0.8,
};

const GROUND_LEAVES = {
  count: 120,
  scale: [0.1, 0.24],
  brightness: [0.22, 0.5],
  margin: 0.55,
};

const SEASONS = {
  spring: {
    tone: { hue: 96 / 360, blend: 0.9, saturation: 1, value: 0.85, scale: 0.45, density: 0.35 },
    ground: { hue: 85 / 360, blend: 0.75, saturation: 0.9, value: 0.62 },
    light: { environment: 0.25, background: 0.1 },
    crown: true, falling: false, litter: false, snow: false, regrow: true,
  },
  summer: {
    tone: { hue: 118 / 360, blend: 0.88, saturation: 0.92, value: 0.66, scale: 1, density: 1 },
    ground: { hue: 100 / 360, blend: 0.8, saturation: 0.85, value: 0.46 },
    light: { environment: 0.35, background: 0.15 },
    crown: true, falling: false, litter: false, snow: false, regrow: true,
  },
  autumn: {
    tone: { hue: 118 / 360, blend: 0, saturation: 1, value: 1, scale: 1, density: 1 },
    ground: { hue: 100 / 360, blend: 0, saturation: 1.2, value: 0.62 },
    light: { environment: 0.2, background: 0.05 },
    crown: true, falling: true, litter: true, snow: false,
  },
  winter: {
    light: { environment: 0.17, background: 0.05 },
    crown: false, falling: false, litter: false, snow: true,
  },
};

const TRANSITION = {
  shedDuration: 1.4,
};

const leafShed = { value: 0 };

const groundTone = Object.fromEntries(
  Object.entries(SEASONS.autumn.ground).map(([key, value]) => [key, { value }]),
);

const leafTone = Object.fromEntries(
  Object.entries(SEASONS.autumn.tone).map(([key, value]) => [key, { value }]),
);

const GROUND_FADE = {
  start: 0.55,
  end: 0.97,
  snowMaxY: 0.4,
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
const background = new Color(0x0b0d12);
scene.background = background;

const lightLevel = { ...SEASONS.autumn.light };
let lightTarget = SEASONS.autumn.light;

const camera = new PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 2.8, 9);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.5, 0);
controls.enableDamping = true;

const CAMERA_MIN_HEIGHT = 0.75;

function limitCameraBelowGround() {
  const drop = controls.target.y - CAMERA_MIN_HEIGHT;
  const distance = camera.position.distanceTo(controls.target);
  controls.maxPolarAngle = distance > drop ? Math.acos(-drop / distance) : Math.PI;
}

limitCameraBelowGround();
controls.update();

scene.add(new HemisphereLight(0xcddeff, 0x4b3d30, 1.9));
const sun = new DirectionalLight(0xfff1d6, 2.5);
sun.position.set(4, 8, 5);
scene.add(sun);

new HDRLoader().load(skyUrl, (texture) => {
  texture.mapping = EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
  applyLight();
});

const snowfall = createSnowfall(renderer.getPixelRatio());
scene.add(snowfall.points);

const clock = new Clock();

function createBarkMaterial() {
  const map = new TextureLoader().load(barkColorUrl);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.center.set(0.5, 0.5);
  map.rotation = Math.PI / 2;
  map.repeat.set(1.5, 15);
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return new MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 });
}

const HSV_GLSL = `
        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
`;

const GROUND_LEAF_HEIGHT = FALLING.groundY;

function applyLeafTone(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLeafHue = leafTone.hue;
    shader.uniforms.uLeafBlend = leafTone.blend;
    shader.uniforms.uLeafSaturation = leafTone.saturation;
    shader.uniforms.uLeafValue = leafTone.value;
    shader.uniforms.uLeafScale = leafTone.scale;
    shader.uniforms.uLeafDensity = leafTone.density;
    shader.uniforms.uLeafShed = leafShed;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uLeafScale;
        uniform float uLeafDensity;
        uniform float uLeafShed;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float leafHash = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
        float leafGrow = smoothstep(0.0, 0.12, uLeafDensity * 1.12 - leafHash);
        float shedT = clamp((uLeafShed - leafHash * 0.4) / 0.6, 0.0, 1.0);
        transformed *= uLeafScale * leafGrow * (1.0 - smoothstep(0.8, 1.0, shedT));`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        #ifdef USE_INSTANCING
          if (shedT > 0.0) {
            float leafHeight = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).y;
            float fallT = shedT * shedT;
            vec3 drift = vec3(sin(leafHash * 40.0), 0.0, cos(leafHash * 40.0)) * 0.3 * shedT;
            vec3 shedOffset = vec3(0.0, -max(leafHeight - ${GROUND_LEAF_HEIGHT.toFixed(3)}, 0.0) * fallT, 0.0) + drift;
            mvPosition.xyz += (viewMatrix * vec4(shedOffset, 0.0)).xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        #endif`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uLeafHue;
        uniform float uLeafBlend;
        uniform float uLeafSaturation;
        uniform float uLeafValue;

        ${HSV_GLSL}`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec3 leafHsv = rgb2hsv(diffuseColor.rgb);
        float hueDiff = fract(uLeafHue - leafHsv.x + 0.5) - 0.5;
        leafHsv.x = fract(leafHsv.x + hueDiff * uLeafBlend);
        leafHsv.y = clamp(leafHsv.y * uLeafSaturation, 0.0, 1.0);
        leafHsv.z *= uLeafValue;
        diffuseColor.rgb = hsv2rgb(leafHsv);`,
      );
  };
}

function applyGroundTone(material) {
  const previous = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.uGroundHue = groundTone.hue;
    shader.uniforms.uGroundBlend = groundTone.blend;
    shader.uniforms.uGroundSaturation = groundTone.saturation;
    shader.uniforms.uGroundValue = groundTone.value;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uGroundHue;
        uniform float uGroundBlend;
        uniform float uGroundSaturation;
        uniform float uGroundValue;

        ${HSV_GLSL}`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec3 groundHsv = rgb2hsv(diffuseColor.rgb);
        float groundHueDiff = fract(uGroundHue - groundHsv.x + 0.5) - 0.5;
        groundHsv.x = fract(groundHsv.x + groundHueDiff * uGroundBlend);
        groundHsv.y = clamp(groundHsv.y * uGroundSaturation, 0.0, 1.0);
        groundHsv.z *= uGroundValue;
        diffuseColor.rgb = hsv2rgb(groundHsv);`,
      );
  };
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
  applyLeafTone(material);
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

  const initialMatrices = Float32Array.from(crown.instanceMatrix.array);

  function reset() {
    crown.instanceMatrix.array.set(initialMatrices);
    crown.instanceMatrix.needsUpdate = true;

    remaining.length = 0;
    for (let i = 0; i < crown.count; i++) remaining.push(i);

    for (let i = 0; i < poolSize; i++) {
      leaves[i].active = false;
      mesh.setMatrixAt(i, hidden);
    }
    mesh.instanceMatrix.needsUpdate = true;
    timer = 1;
  }

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

  return { mesh, update, reset };
}

function measureGround(ground) {
  ground.updateWorldMatrix(true, false);
  const bounds = new Box3().setFromObject(ground);
  const center = bounds.getCenter(new Vector3());
  const radius = Math.min(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2;
  return { center, radius, top: bounds.max.y };
}

function applyEdgeFade(material, { center, radius }, maxY = Infinity) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeCenter = { value: new Vector2(center.x, center.z) };
    shader.uniforms.uFadeStart = { value: radius * GROUND_FADE.start };
    shader.uniforms.uFadeEnd = { value: radius * GROUND_FADE.end };
    shader.uniforms.uFadeMaxY = { value: maxY };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWorld;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 fadeWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fadeWorld = instanceMatrix * fadeWorld;
        #endif
        vFadeWorld = (modelMatrix * fadeWorld).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vFadeWorld;
        uniform vec2 uFadeCenter;
        uniform float uFadeStart;
        uniform float uFadeEnd;
        uniform float uFadeMaxY;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        float fadeAmount = smoothstep(uFadeStart, uFadeEnd, distance(vFadeWorld.xz, uFadeCenter));
        fadeAmount *= step(vFadeWorld.y, uFadeMaxY);
        gl_FragColor.a *= 1.0 - fadeAmount;`,
      );
  };
}

function createGroundLeaves(crown, ground) {
  const { count, scale, brightness, margin } = GROUND_LEAVES;

  const measured = measureGround(ground);
  const { center, top } = measured;
  const radius = measured.radius * margin;

  const material = crown.material.clone();

  const mesh = new InstancedMesh(crown.geometry, material, count);
  const dummy = new Object3D();
  dummy.rotation.order = 'YXZ';
  const tint = new Color();

  for (let i = 0; i < count; i++) {
    const distance = radius * Math.sqrt(Math.random());
    const angle = Math.random() * Math.PI * 2;

    dummy.position.set(
      center.x + Math.cos(angle) * distance,
      top + 0.002 + Math.random() * 0.03,
      center.z + Math.sin(angle) * distance,
    );
    dummy.rotation.set(-Math.PI / 2 + randomBetween(-0.15, 0.15), Math.random() * Math.PI * 2, randomBetween(-0.15, 0.15));
    dummy.scale.setScalar(randomBetween(scale[0], scale[1]));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    const shade = randomBetween(brightness[0], brightness[1]);
    mesh.setColorAt(i, tint.setRGB(shade, shade * 0.85, shade * 0.7));
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

let season = 'autumn';
let crownLeaves = null;
let fallingLeaves = null;
let snow = null;
let groundLeaves = null;
let groundMesh = null;

const seasonButtons = document.querySelectorAll('[data-season]');

let toneTarget = SEASONS.autumn.tone;
let groundToneTarget = SEASONS.autumn.ground;
let shedTime = null;

function applySeason() {
  const config = SEASONS[season];

  const crownWasVisible = crownLeaves ? crownLeaves.visible : false;
  const shedding = !config.crown && crownWasVisible;

  if (crownLeaves) crownLeaves.visible = config.crown || shedding;
  if (fallingLeaves) fallingLeaves.mesh.visible = config.falling;
  if (groundLeaves) groundLeaves.visible = config.litter || shedding;
  if (snow) snow.visible = config.snow && !shedding;
  if (groundMesh) groundMesh.visible = !config.snow || shedding;
  snowfall.setActive(config.snow && !shedding);
  if (config.regrow) fallingLeaves?.reset();

  leafShed.value = 0;
  shedTime = shedding ? 0 : null;
  lightTarget = config.light;

  if (config.tone) {
    toneTarget = config.tone;
    groundToneTarget = config.ground;
    if (!crownWasVisible) {
      for (const key of Object.keys(leafTone)) leafTone[key].value = toneTarget[key];
      for (const key of Object.keys(groundTone)) groundTone[key].value = groundToneTarget[key];
    }
  }

  for (const button of seasonButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.season === season));
  }
}

function applyLight() {
  scene.environmentIntensity = lightLevel.environment;
  scene.backgroundIntensity = lightLevel.background;
}

function updateLight(delta) {
  const amount = 1 - Math.exp(-delta * 3);

  for (const key of Object.keys(lightLevel)) {
    lightLevel[key] += (lightTarget[key] - lightLevel[key]) * amount;
  }
  applyLight();
}

function updateLeafTone(delta) {
  const amount = 1 - Math.exp(-delta * 4);

  for (const key of Object.keys(leafTone)) {
    leafTone[key].value += (toneTarget[key] - leafTone[key].value) * amount;
  }

  for (const key of Object.keys(groundTone)) {
    groundTone[key].value += (groundToneTarget[key] - groundTone[key].value) * amount;
  }
}

function updateTransitions(delta) {
  if (shedTime === null) return;

  shedTime += delta;
  leafShed.value = Math.min(shedTime / TRANSITION.shedDuration, 1);
  if (shedTime < TRANSITION.shedDuration) return;

  const config = SEASONS[season];
  crownLeaves.visible = false;
  if (groundLeaves) groundLeaves.visible = config.litter;
  if (snow) snow.visible = config.snow;
  if (groundMesh) groundMesh.visible = !config.snow;
  snowfall.setActive(config.snow);
  shedTime = null;
}

for (const button of seasonButtons) {
  button.addEventListener('click', () => {
    if (button.dataset.season === season) return;

    season = button.dataset.season;
    applySeason();
  });
}

new GLTFLoader().load(treeUrl, (gltf) => {
  const barkMaterial = createBarkMaterial();
  const trunk = gltf.scene.getObjectByName('trunk');
  const twigs = gltf.scene.getObjectByName('twigs');
  const ground = gltf.scene.getObjectByName('ground');
  groundMesh = ground;
  snow = gltf.scene.getObjectByName('snow');

  for (const mesh of [trunk, twigs]) mesh.material = barkMaterial;
  const groundMap = new TextureLoader().load(groundUrl);
  groundMap.colorSpace = SRGBColorSpace;
  groundMap.wrapS = groundMap.wrapT = RepeatWrapping;
  groundMap.repeat.set(3, 3);
  groundMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
  ground.material = new MeshStandardMaterial({ map: groundMap, roughness: 1, metalness: 0, transparent: true });
  snow.material = new MeshStandardMaterial({ color: 0xeef3ff, roughness: 0.85, metalness: 0, transparent: true });

  const measuredGround = measureGround(ground);
  applyEdgeFade(ground.material, measuredGround);
  applyGroundTone(ground.material);
  applyEdgeFade(snow.material, measuredGround, GROUND_FADE.snowMaxY);

  scene.add(gltf.scene);
  for (const layer of LEAF_LAYERS) {
    crownLeaves = createLeafLayer(twigs, layer);
    scene.add(crownLeaves);

    fallingLeaves = createFallingLeaves(crownLeaves);
    scene.add(fallingLeaves.mesh);

    groundLeaves = createGroundLeaves(crownLeaves, ground);
    scene.add(groundLeaves);
  }

  applySeason();
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

  if (SEASONS[season].falling) fallingLeaves?.update(delta);
  snowfall.update(delta);
  updateLeafTone(delta);
  updateLight(delta);
  updateTransitions(delta);
  limitCameraBelowGround();
  controls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
