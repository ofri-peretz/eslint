/**
 * VULNERABLE - The host is interpolated, the protocol is written down.
 */
export function redisUrl(host) {
  return `redis://${host}:6379`;
}
