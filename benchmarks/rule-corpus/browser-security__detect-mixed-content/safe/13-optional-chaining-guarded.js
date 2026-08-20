/**
 * SAFE - The value assigned is a validated HTTPS URL reached through optional
 * chaining. The shape is the risky one; the scheme is not.
 */
export function setPoster(player, media) {
  const url = media?.assets?.poster;
  if (url?.startsWith('https://')) {
    player.poster = url;
  }
}
