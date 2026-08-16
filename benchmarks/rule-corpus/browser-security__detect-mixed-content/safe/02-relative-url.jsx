/**
 * SAFE - A relative subresource inherits the document's scheme, so it can never
 * be mixed content. This is the other correct remediation.
 */
export function Logo() {
  return <img src="/static/logo.svg" alt="Acme" />;
}
