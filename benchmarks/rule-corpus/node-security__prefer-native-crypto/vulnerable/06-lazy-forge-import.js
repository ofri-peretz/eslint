/**
 * VULNERABLE - node-forge deferred behind a dynamic import so it only loads on
 * the certificate-parsing path. It is the same dependency, entered through a
 * different syntax (CWE-1104).
 */
export async function parseCertificate(pem) {
  const forge = await import('node-forge');
  return forge.pki.certificateFromPem(pem);
}
