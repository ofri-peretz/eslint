/**
 * VULNERABLE - The host comes from config, the SCHEME is written down. Whatever
 * `host` resolves to, the request is cleartext. This is the shape a rule that
 * only reads plain literals cannot see.
 */
export function ping(host) {
  return fetch(`http://${host}/healthz`);
}
