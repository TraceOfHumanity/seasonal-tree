export const randomBetween = (min, max) => min + Math.random() * (max - min);

export const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));

export function randomUnitVector(target) {
  const z = Math.random() * 2 - 1;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return target.set(r * Math.cos(angle), z, r * Math.sin(angle));
}
