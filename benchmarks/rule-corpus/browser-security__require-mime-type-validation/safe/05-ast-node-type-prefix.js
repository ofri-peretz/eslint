/**
 * SAFE - ADVERSARIAL. `.type` tested with `startsWith` — on an AST node. `TS`
 * is not a media type, and this is the single most common `.type.startsWith`
 * in any TypeScript codebase.
 */
export function isTypeScriptSyntax(node) {
  return node.type.startsWith('TS');
}
