export function createTone(initial, rate) {
  const uniforms = Object.fromEntries(
    Object.entries(initial).map(([key, value]) => [key, { value }]),
  );
  let target = initial;

  function setTarget(next, snap = false) {
    target = next;
    if (!snap) return;

    for (const key of Object.keys(uniforms)) uniforms[key].value = next[key];
  }

  function update(delta) {
    const amount = 1 - Math.exp(-delta * rate);

    for (const key of Object.keys(uniforms)) {
      uniforms[key].value += (target[key] - uniforms[key].value) * amount;
    }
  }

  return { uniforms, setTarget, update };
}
