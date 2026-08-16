/**
 * VULNERABLE - ADVERSARIAL. Same evasion in JSX, spelled the way a
 * copy-pasted legacy URL actually looks.
 */
export function Banner() {
  return <img src="Http://cdn.acme-corp.io/banner.png" alt="" />;
}
