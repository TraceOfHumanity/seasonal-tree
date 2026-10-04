import { DirectionalLight, HemisphereLight } from 'three';

export function addLights(scene) {
  scene.add(new HemisphereLight(0xcddeff, 0x4b3d30, 1.9));

  const sun = new DirectionalLight(0xfff1d6, 2.5);
  sun.position.set(4, 8, 5);
  scene.add(sun);
}
