export function setupInfoPanel() {
  const root = document.querySelector('.info');
  const button = root.querySelector('.info__button');
  const panel = root.querySelector('.info__panel');

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  }

  button.addEventListener('click', () => setOpen(panel.hidden));

  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}
