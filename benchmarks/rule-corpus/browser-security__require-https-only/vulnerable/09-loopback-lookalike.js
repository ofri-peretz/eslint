/**
 * VULNERABLE - `localhost.acme-corp.io` is a real, remote, resolvable host. A
 * rule that exempts loopback by substring hands an attacker a free domain name.
 */
export function debugFetch() {
  return fetch('http://localhost.acme-corp.io/api/debug');
}
