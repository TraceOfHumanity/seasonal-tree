import { MeshStandardMaterial, RepeatWrapping } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { loadColorTexture } from './utils/textures.js';
import treeUrl from '../assets/tree.glb?url';
import barkColorUrl from '../assets/textures/bark_basecolor.png?url';

function createBarkMaterial() {
  const map = loadColorTexture(barkColorUrl);
  map.wrapS = map.wrapT = RepeatWrapping;
  map.center.set(0.5, 0.5);
  map.rotation = Math.PI / 2;
  map.repeat.set(1.5, 15);

  return new MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 });
}

export function loadTree() {
  return new GLTFLoader().loadAsync(treeUrl).then((gltf) => {
    const root = gltf.scene;
    const trunk = root.getObjectByName('trunk');
    const twigs = root.getObjectByName('twigs');
    const ground = root.getObjectByName('ground');
    const snow = root.getObjectByName('snow');

    const barkMaterial = createBarkMaterial();
    for (const mesh of [trunk, twigs]) mesh.material = barkMaterial;

    return { root, trunk, twigs, ground, snow };
  });
}
