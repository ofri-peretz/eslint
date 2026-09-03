/**
 * SAFE - Optional chaining and a computed read on the way to an HTTPS default.
 */
export function baseFor(config, region) {
  return config?.regions?.[region]?.base ?? 'https://api.acme-corp.io/v1';
}
