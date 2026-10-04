import { Vector2 } from 'three';

import { GROUND_FADE } from './config.js';
import { injectShader } from './utils/inject-shader.js';
import edgeFadeVertex from './shaders/edge-fade/vertex.glsl';
import edgeFadeFragment from './shaders/edge-fade/fragment.glsl';

export function applyEdgeFade(material, { center, radius }, maxY = Infinity) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeCenter = { value: new Vector2(center.x, center.z) };
    shader.uniforms.uFadeStart = { value: radius * GROUND_FADE.start };
    shader.uniforms.uFadeEnd = { value: radius * GROUND_FADE.end };
    shader.uniforms.uFadeMaxY = { value: maxY };

    shader.vertexShader = injectShader(shader.vertexShader, {
      common: edgeFadeVertex,
      begin_vertex: 'edgeFadeVertex(transformed);',
    });

    shader.fragmentShader = injectShader(shader.fragmentShader, {
      common: edgeFadeFragment,
      opaque_fragment: 'gl_FragColor.a *= edgeFadeAlpha();',
    });
  };
}
