/**
 * SAFE FOR THIS RULE - An <a href> is a NAVIGATION. No browser blocks or warns
 * on it from an HTTPS page, so calling it mixed content would describe
 * behaviour that does not happen. It is still a cleartext URL, and
 * `no-http-urls` reports it — that is the partition, not an exemption.
 */
export function Docs() {
  return <a href="http://docs.acme-corp.io/getting-started">Read the docs</a>;
}
