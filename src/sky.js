import { EquirectangularReflectionMapping } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

import { SEASONS } from './config.js';
import { createTone } from './utils/tone.js';
import skyUrl from '../assets/textures/sky.hdr?url';

export function createSky(scene) {
  const tone = createTone(SEASONS.autumn.light, 3);

  function applyLight() {
    scene.environmentIntensity = tone.uniforms.environment.value;
    scene.backgroundIntensity = tone.uniforms.background.value;
  }

  new HDRLoader().load(skyUrl, (texture) => {
    texture.mapping = EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
    applyLight();
  });

  return {
    setTarget: tone.setTarget,
    update(delta) {
      tone.update(delta);
      applyLight();
    },
  };
}
