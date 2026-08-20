/**
 * VULNERABLE - The container reached through a parsed `URL` rather than
 * directly: `new URL(location.href).searchParams`. Same inbound text, one more
 * hop, and every URL rule in the plugin used to lose it here.
 */
export function forward() {
  const parsed = new URL(location.href);
  const next = parsed.searchParams.get('next');
  return fetch(`https://api.example.com/v1/track?next=${next}`);
}
