import {
  Box3,
  Color,
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

import { FALLING, LEAVES, SEASONS } from './config.js';
import { injectShader } from './utils/inject-shader.js';
import { randomUnitVector } from './utils/random.js';
import { loadColorTexture } from './utils/textures.js';
import { createTone } from './utils/tone.js';
import leafVertex from './shaders/leaf/vertex.glsl';
import leafFragment from './shaders/leaf/fragment.glsl';
import leafUrl from '../assets/textures/leaf.png?url';

function applyLeafTone(material, tone, shed) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLeafHue = tone.uniforms.hue;
    shader.uniforms.uLeafBlend = tone.uniforms.blend;
    shader.uniforms.uLeafSaturation = tone.uniforms.saturation;
    shader.uniforms.uLeafValue = tone.uniforms.value;
    shader.uniforms.uLeafScale = tone.uniforms.scale;
    shader.uniforms.uLeafDensity = tone.uniforms.density;
    shader.uniforms.uLeafShed = shed;
    shader.uniforms.uLeafGroundY = { value: FALLING.groundY };

    shader.vertexShader = injectShader(shader.vertexShader, {
      common: leafVertex,
      begin_vertex: 'float leafHash; float shedT; leafVertexBegin(transformed, leafHash, shedT);',
      project_vertex: 'leafVertexProject(mvPosition, leafHash, shedT);',
    });

    shader.fragmentShader = injectShader(shader.fragmentShader, {
      common: leafFragment,
      map_fragment: 'leafFragmentTone(diffuseColor);',
    });
  };
}

function createLeafGeometry({ pivot, fold }) {
  const geometry = new PlaneGeometry(1, 1, 2, 2);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getX(i)) < 1e-6 && Math.abs(positions.getY(i)) < 1e-6) {
      positions.setZ(i, fold);
    }
  }

  geometry.computeVertexNormals();
  geometry.translate(0.5 - pivot[0], 0.5 - pivot[1], 0);
  return geometry;
}

export function createLeaves(twigs) {
  const { count, scale, pivot, spread, awayBias, brightness, fold } = LEAVES;

  const tone = createTone(SEASONS.autumn.tone, 4);
  const shed = { value: 0 };

  const material = new MeshStandardMaterial({
    map: loadColorTexture(leafUrl),
    alphaTest: 0.5,
    roughness: 0.8,
    side: DoubleSide,
  });
  applyLeafTone(material, tone, shed);

  const mesh = new InstancedMesh(createLeafGeometry({ pivot, fold }), material, count);

  const sampler = new MeshSurfaceSampler(twigs).build();
  const position = new Vector3();
  const offset = new Vector3();
  const direction = new Vector3();
  const away = new Vector3();
  const center = new Vector3();
  const dummy = new Object3D();
  const facing = new Quaternion();
  const spin = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const tint = new Color();

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

  return { mesh, tone, shed };
}
