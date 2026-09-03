/**
 * VULNERABLE - the legacy decrypt path is loaded lazily so the cold start does
 * not pay for it. `import()` is a module load exactly like a static import; the
 * dependency on the unmaintained package is identical (CWE-1104).
 */
export async function decryptLegacyRecord(record, key) {
  const { AES, enc } = await import('crypto-js');
  return AES.decrypt(record.cipher, key).toString(enc.Utf8);
}
