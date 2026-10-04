import { Color, InstancedMesh, Matrix4, Object3D, Quaternion, Vector3 } from 'three';

import { FALLING } from './config.js';
import { randomBetween, randomInt } from './utils/random.js';

export function createFallingLeaves(crown) {
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
  const initialMatrices = Float32Array.from(crown.instanceMatrix.array);
  let timer = 1;

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
