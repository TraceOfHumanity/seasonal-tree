import { MeshStandardMaterial } from 'three';

import { GROUND_FADE } from './config.js';
import { applyEdgeFade } from './edge-fade.js';

export function setupSnow(mesh, measuredGround) {
  mesh.material = new MeshStandardMaterial({
    color: 0xeef3ff,
    roughness: 0.85,
    metalness: 0,
    transparent: true,
  });
  applyEdgeFade(mesh.material, measuredGround, GROUND_FADE.snowMaxY);

  return mesh;
}
