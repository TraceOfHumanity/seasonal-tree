varying vec3 vColor;

void main() {
  float alpha = smoothstep(0.5, 0.0, length(gl_PointCoord - vec2(0.5)));
  gl_FragColor = vec4(vColor, alpha * alpha);
}
