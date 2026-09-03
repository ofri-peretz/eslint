/**
 * SAFE - The literal is being EXAMINED, not connected to. Reporting it flags
 * the guard as the vulnerability.
 */
export function assertTls(dsn) {
  if (dsn.startsWith('mongodb://')) {
    throw new Error('Refusing a non-TLS MongoDB DSN');
  }
  return dsn;
}
