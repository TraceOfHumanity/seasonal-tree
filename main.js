import { WebGLRenderer, Scene, PerspectiveCamera, Clock } from 'three';

const canvas = document.getElementById('scene');

const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new Scene();

const camera = new PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 2.5, 8);

const clock = new Clock();

function resize() {
  const { clientWidth: width, clientHeight: height } = canvas;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

function tick() {
  const delta = clock.getDelta();

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
