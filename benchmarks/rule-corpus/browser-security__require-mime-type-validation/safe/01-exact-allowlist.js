/**
 * SAFE - The correct remediation: exact membership in a closed allowlist. There
 * is no prefix for `image/svg+xml` to slip through.
 */
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

const input = document.querySelector('#avatar');

input.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!ALLOWED.has(file.type)) {
    throw new Error('unsupported media type');
  }
  const body = new FormData();
  body.append('avatar', file);
  await fetch('/api/avatar', { method: 'POST', body });
});
