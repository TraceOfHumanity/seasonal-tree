import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { canvas } from './renderer.js';

const CAMERA_MIN_HEIGHT = 0.75;

export const camera = new PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 2.8, 9);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.5, 0);
controls.enableDamping = true;

function limitCameraBelowGround() {
  const drop = controls.target.y - CAMERA_MIN_HEIGHT;
  const distance = camera.position.distanceTo(controls.target);
  controls.maxPolarAngle = distance > drop ? Math.acos(-drop / distance) : Math.PI;
}

limitCameraBelowGround();
controls.update();

export function updateCamera(delta) {
  limitCameraBelowGround();
  controls.update(delta);
}
