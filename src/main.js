import { Timer } from 'three';

import { camera, updateCamera } from './camera.js';
import { createFallingLeaves } from './falling-leaves.js';
import { createGround, createGroundLeaves } from './ground.js';
import { createLeaves } from './leaves.js';
import { addLights } from './lights.js';
import { canvas, renderer, scene } from './renderer.js';
import { createSeasons } from './seasons.js';
import { createSky } from './sky.js';
import { setupSnow } from './snow.js';
import { createSnowfall } from './snowfall.js';
import { loadTree } from './tree.js';

addLights(scene);

const sky = createSky(scene);

const snowfall = createSnowfall(renderer.getPixelRatio());
scene.add(snowfall.points);

let seasons = null;

loadTree().then((tree) => {
  const ground = createGround(tree.ground);
  const snow = setupSnow(tree.snow, ground.measured);
  scene.add(tree.root);

  const leaves = createLeaves(tree.twigs);
  scene.add(leaves.mesh);

  const falling = createFallingLeaves(leaves.mesh);
  scene.add(falling.mesh);

  const groundLeaves = createGroundLeaves(leaves.mesh, ground.measured);
  scene.add(groundLeaves);

  seasons = createSeasons({
    crown: leaves.mesh,
    falling,
    groundLeaves,
    ground,
    snow,
    snowfall,
    sky,
    leaves,
  });
});

function resize() {
  const { clientWidth: width, clientHeight: height } = canvas;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

const frameTimer = new Timer();

function tick() {
  frameTimer.update();
  const delta = Math.min(frameTimer.getDelta(), 0.1);

  seasons?.update(delta);
  snowfall.update(delta);
  sky.update(delta);
  updateCamera(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
