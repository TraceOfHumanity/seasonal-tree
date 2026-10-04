import { SRGBColorSpace, TextureLoader } from 'three';

import { renderer } from '../renderer.js';

export function loadColorTexture(url) {
  const texture = new TextureLoader().load(url);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
