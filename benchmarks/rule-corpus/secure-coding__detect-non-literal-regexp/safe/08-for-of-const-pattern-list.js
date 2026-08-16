/**
 * ADVERSARIAL, SAFE — `for (const source of CONST_ARRAY_OF_LITERALS)`.
 *
 * A redaction pass compiling its own hard-coded pattern list. The loop binding
 * is a `const` with NO initialiser of its own, so a check that reads
 * `declarator.init` finds `null` and gives up — even though the iterable is a
 * module constant whose every element is a literal.
 *
 * Same fact as fixture 03 (`SUPPORTED_EXTENSIONS.join('|')`), reached through a
 * different AST shape. Covering one and not the other is an accident of node
 * types, not a security judgement.
 */
const REDACTION_SOURCES = ['\\d{3}-\\d{2}-\\d{4}', '[0-9]{13,16}', 'Bearer\\s+[A-Za-z0-9._-]+'];

export function redact(text) {
  let output = text;
  for (const source of REDACTION_SOURCES) {
    output = output.replace(new RegExp(source, 'g'), '[REDACTED]');
  }
  return output;
}
