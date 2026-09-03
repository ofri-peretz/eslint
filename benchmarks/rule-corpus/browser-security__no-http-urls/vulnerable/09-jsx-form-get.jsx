/**
 * VULNERABLE - A cleartext URL in a plain data attribute. Nothing loads it, so
 * it is not mixed content — but something will eventually read and use it.
 */
export function Widget() {
  return <div data-legacy-endpoint="http://legacy.acme-corp.io/v0/widget" />;
}
