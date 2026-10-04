import { SEASONS, TRANSITION } from './config.js';

export function createSeasons({ crown, falling, groundLeaves, ground, snow, snowfall, sky, leaves }) {
  const buttons = document.querySelectorAll('[data-season]');
  let season = 'autumn';
  let shedTime = null;

  function apply() {
    const config = SEASONS[season];

    const crownWasVisible = crown.visible;
    const shedding = !config.crown && crownWasVisible;

    crown.visible = config.crown || shedding;
    falling.mesh.visible = config.falling;
    groundLeaves.visible = config.litter || shedding;
    snow.visible = config.snow && !shedding;
    ground.mesh.visible = !config.snow || shedding;
    snowfall.setActive(config.snow && !shedding);
    if (config.regrow) falling.reset();

    leaves.shed.value = 0;
    shedTime = shedding ? 0 : null;
    sky.setTarget(config.light);

    if (config.tone) {
      leaves.tone.setTarget(config.tone, !crownWasVisible);
      ground.tone.setTarget(config.ground, !crownWasVisible);
    }

    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.season === season));
    }
  }

  function updateTransitions(delta) {
    if (shedTime === null) return;

    shedTime += delta;
    leaves.shed.value = Math.min(shedTime / TRANSITION.shedDuration, 1);
    if (shedTime < TRANSITION.shedDuration) return;

    const config = SEASONS[season];
    crown.visible = false;
    groundLeaves.visible = config.litter;
    snow.visible = config.snow;
    ground.mesh.visible = !config.snow;
    snowfall.setActive(config.snow);
    shedTime = null;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (button.dataset.season === season) return;

      season = button.dataset.season;
      apply();
    });
  }

  apply();

  return {
    update(delta) {
      if (SEASONS[season].falling) falling.update(delta);
      leaves.tone.update(delta);
      ground.tone.update(delta);
      updateTransitions(delta);
    },
  };
}
