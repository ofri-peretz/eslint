/**
 * VULNERABLE - `localhost.acme-corp.io` is a real, remote, resolvable host, and
 * so is a URL that merely mentions loopback in its query. A rule that exempts
 * by substring hands an attacker a free bypass.
 */
export const relay = new WebSocket('ws://relay.acme-corp.io/?next=://localhost');
