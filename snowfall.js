import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from 'three';

const COUNT = 180;
const VOLUME = { radius: 2.2, height: 5.6 };
const GROUND_Y = 0.05;

const vertexShader = `
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
`;

const fragmentShader = `
  varying vec3 vColor;

  void main() {
    float alpha = smoothstep(0.5, 0.0, length(gl_PointCoord - vec2(0.5)));
    gl_FragColor = vec4(vColor, alpha * alpha);
  }
`;

const randomBetween = (min, max) => min + Math.random() * (max - min);

export function createSnowfall(pixelRatio) {
  const positions = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const tints = new Float32Array(COUNT);
  const maxSizes = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);
  const driftFrequency = new Float32Array(COUNT);
  const driftPhase = new Float32Array(COUNT);
  const driftAmplitude = new Float32Array(COUNT);
  const lifeTimes = new Float32Array(COUNT);
  const ages = new Float32Array(COUNT);

  function place(i, anywhere) {
    const radius = VOLUME.radius * Math.sqrt(Math.random());
    const angle = Math.random() * Math.PI * 2;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = anywhere ? Math.random() * VOLUME.height : VOLUME.height;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  for (let i = 0; i < COUNT; i++) {
    place(i, true);

    maxSizes[i] = randomBetween(0.07, 0.18);
    tints[i] = Math.random();
    speeds[i] = randomBetween(0.25, 0.6);
    driftFrequency[i] = randomBetween(0.3, 0.9);
    driftPhase[i] = Math.random() * Math.PI * 2;
    driftAmplitude[i] = randomBetween(0.1, 0.2);
    lifeTimes[i] = randomBetween(3, 7);
    ages[i] = Math.random() * lifeTimes[i];
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aTint', new BufferAttribute(tints, 1));

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uColorCool: { value: new Color('#cfe8ff') },
      uColorWarm: { value: new Color('#ffffff') },
      uHeight: { value: VOLUME.height },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;

  const opacity = material.uniforms.uOpacity;
  let target = 0;
  let elapsed = 0;

  function setActive(active) {
    target = active ? 1 : 0;
  }

  function update(delta) {
    opacity.value += (target - opacity.value) * (1 - Math.exp(-delta * 1.5));
    points.visible = target === 1 || opacity.value > 0.01;
    if (!points.visible) return;

    elapsed += delta;

    for (let i = 0; i < COUNT; i++) {
      const x = i * 3;
      const y = x + 1;
      const z = x + 2;

      positions[y] -= speeds[i] * delta;

      const angle = elapsed * driftFrequency[i] + driftPhase[i];
      positions[x] += Math.sin(angle) * driftAmplitude[i] * delta;
      positions[z] += Math.cos(angle) * driftAmplitude[i] * delta;

      if (positions[y] < GROUND_Y) place(i, false);

      ages[i] += delta;
      if (ages[i] > lifeTimes[i]) ages[i] = 0;

      const life = ages[i] / lifeTimes[i];
      sizes[i] = (life < 0.5 ? life * 2 : (1 - life) * 2) * maxSizes[i];
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
  }

  return { points, setActive, update };
}
