varying vec3 vFadeWorld;

uniform vec2 uFadeCenter;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uFadeMaxY;

float edgeFadeAlpha() {
  float fadeAmount = smoothstep(uFadeStart, uFadeEnd, distance(vFadeWorld.xz, uFadeCenter));
  fadeAmount *= step(vFadeWorld.y, uFadeMaxY);

  return 1.0 - fadeAmount;
}
