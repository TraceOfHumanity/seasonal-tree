uniform float uLeafScale;
uniform float uLeafDensity;
uniform float uLeafShed;
uniform float uLeafGroundY;

void leafVertexBegin(inout vec3 transformed, out float leafHash, out float shedT) {
  leafHash = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
  float leafGrow = smoothstep(0.0, 0.12, uLeafDensity * 1.12 - leafHash);
  shedT = clamp((uLeafShed - leafHash * 0.4) / 0.6, 0.0, 1.0);

  transformed *= uLeafScale * leafGrow * (1.0 - smoothstep(0.8, 1.0, shedT));
}

void leafVertexProject(inout vec4 mvPosition, float leafHash, float shedT) {
#ifdef USE_INSTANCING
  if (shedT > 0.0) {
    float leafHeight = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).y;
    float fallT = shedT * shedT;
    vec3 drift = vec3(sin(leafHash * 40.0), 0.0, cos(leafHash * 40.0)) * 0.3 * shedT;
    vec3 shedOffset = vec3(0.0, -max(leafHeight - uLeafGroundY, 0.0) * fallT, 0.0) + drift;

    mvPosition.xyz += (viewMatrix * vec4(shedOffset, 0.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
#endif
}
