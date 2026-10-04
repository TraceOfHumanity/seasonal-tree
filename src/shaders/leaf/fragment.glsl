#include ../chunks/hsv.glsl;

uniform float uLeafHue;
uniform float uLeafBlend;
uniform float uLeafSaturation;
uniform float uLeafValue;

void leafFragmentTone(inout vec4 diffuseColor) {
  vec3 hsv = rgb2hsv(diffuseColor.rgb);
  float hueDiff = fract(uLeafHue - hsv.x + 0.5) - 0.5;

  hsv.x = fract(hsv.x + hueDiff * uLeafBlend);
  hsv.y = clamp(hsv.y * uLeafSaturation, 0.0, 1.0);
  hsv.z *= uLeafValue;

  diffuseColor.rgb = hsv2rgb(hsv);
}
