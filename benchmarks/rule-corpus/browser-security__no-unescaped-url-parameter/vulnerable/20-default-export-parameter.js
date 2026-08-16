/**
 * VULNERABLE (wave 2) - `export default function`. The parent is an
 * ExportDefaultDeclaration, not an ExportNamedDeclaration, and a check that
 * only knows the named form treats the handler as module-private.
 */
export default function handler(req) {
  return fetch(`https://internal.example.com/v1/echo?msg=${req.body.message}`);
}
