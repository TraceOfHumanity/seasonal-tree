#include ../chunks/hsv.glsl;

uniform float uGroundHue;
uniform float uGroundBlend;
uniform float uGroundSaturation;
uniform float uGroundValue;

void groundFragmentTone(inout vec4 diffuseColor) {
  vec3 hsv = rgb2hsv(diffuseColor.rgb);
  float hueDiff = fract(uGroundHue - hsv.x + 0.5) - 0.5;

  hsv.x = fract(hsv.x + hueDiff * uGroundBlend);
  hsv.y = clamp(hsv.y * uGroundSaturation, 0.0, 1.0);
  hsv.z *= uGroundValue;

  diffuseColor.rgb = hsv2rgb(hsv);
}
