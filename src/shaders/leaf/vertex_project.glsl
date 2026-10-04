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
