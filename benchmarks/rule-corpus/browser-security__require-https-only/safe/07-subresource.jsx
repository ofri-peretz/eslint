/**
 * SAFE FOR THIS RULE - A document subresource is a load the BROWSER performs,
 * not a request this code makes. `detect-mixed-content` owns it.
 */
export function Logo() {
  return <img src="http://cdn.acme-corp.io/logo.png" alt="Acme" />;
}
