/**
 * SAFE - Optional chaining and a computed read on the way to an encrypted
 * default.
 */
export function socketFor(config, region) {
  return config?.sockets?.[region] ?? 'wss://live.acme-corp.io/feed';
}
