attribute float aSize;
attribute float aTint;
uniform float uPixelRatio;
uniform vec3 uColorCool;
uniform vec3 uColorWarm;
uniform float uHeight;
uniform float uOpacity;
varying vec3 vColor;

void main() {
  vec4 viewPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;

  gl_PointSize = aSize * uPixelRatio * (300.0 / -viewPosition.z);

  float heightProgression = clamp(1.0 - position.y / uHeight, 0.0, 1.0);
  vec3 baseColor = mix(uColorCool, uColorWarm, heightProgression);
  vColor = baseColor * (0.85 + aTint * 0.3) * uOpacity;
}
