varying vec3 vFadeWorld;

void edgeFadeVertex(vec3 transformed) {
  vec4 fadeWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  fadeWorld = instanceMatrix * fadeWorld;
#endif
  vFadeWorld = (modelMatrix * fadeWorld).xyz;
}
