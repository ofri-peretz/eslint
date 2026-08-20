/**
 * SAFE - Optional chaining and a computed read on the way to a TLS default.
 */
export function dsnFor(config, name) {
  return config?.databases?.[name]?.dsn ?? 'mongodb+srv://cluster.acme-corp.io/app';
}
