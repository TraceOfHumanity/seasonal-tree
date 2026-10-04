import { Box3, Color, InstancedMesh, MeshStandardMaterial, Object3D, RepeatWrapping, Vector3 } from 'three';

import { GROUND_LEAVES, SEASONS } from './config.js';
import { applyEdgeFade } from './edge-fade.js';
import { injectShader } from './utils/inject-shader.js';
import { randomBetween } from './utils/random.js';
import { loadColorTexture } from './utils/textures.js';
import { createTone } from './utils/tone.js';
import groundFragment from './shaders/ground/fragment.glsl';
import groundUrl from '../assets/textures/ground.jpg?url';

function measureGround(ground) {
  ground.updateWorldMatrix(true, false);
  const bounds = new Box3().setFromObject(ground);
  const center = bounds.getCenter(new Vector3());
  const radius = Math.min(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2;
  return { center, radius, top: bounds.max.y };
}

function applyGroundTone(material, tone) {
  const previous = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.uGroundHue = tone.uniforms.hue;
    shader.uniforms.uGroundBlend = tone.uniforms.blend;
    shader.uniforms.uGroundSaturation = tone.uniforms.saturation;
    shader.uniforms.uGroundValue = tone.uniforms.value;

    shader.fragmentShader = injectShader(shader.fragmentShader, {
      common: groundFragment,
      map_fragment: 'groundFragmentTone(diffuseColor);',
    });
  };
}

export function createGround(mesh) {
  const measured = measureGround(mesh);
  const tone = createTone(SEASONS.autumn.ground, 4);

  const map = loadColorTexture(groundUrl);
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(3, 3);

  mesh.material = new MeshStandardMaterial({ map, roughness: 1, metalness: 0, transparent: true });
  applyEdgeFade(mesh.material, measured);
  applyGroundTone(mesh.material, tone);

  return { mesh, measured, tone };
}

export function createGroundLeaves(crown, { center, radius: groundRadius, top }) {
  const { count, scale, brightness, margin } = GROUND_LEAVES;
  const radius = groundRadius * margin;

  const mesh = new InstancedMesh(crown.geometry, crown.material.clone(), count);
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
