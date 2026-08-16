/**
 * VULNERABLE - The authorisation input is read out of localStorage, which the
 * user owns outright. The gated action then calls a DELETE endpoint directly,
 * so the only thing standing between any visitor and the delete is a value they
 * can type into the console.
 */
const profile = JSON.parse(window.localStorage.getItem('profile') ?? '{}');

export function mountDangerZone(container) {
  if (profile.isAdmin) {
    const button = document.createElement('button');
    button.textContent = 'Delete workspace';
    button.addEventListener('click', () => fetch('/api/workspace', { method: 'DELETE' }));
    container.append(button);
  }
}
