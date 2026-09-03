/**
 * SAFE (adversarial) - the CallExpression twin of the local-class case.
 * `Buffer` here is a LOCAL factory function for an editor gap buffer; calling
 * it has nothing to do with Node's deprecated `Buffer()` factory.
 *
 * A report proves the CallExpression arm also matches the callee's spelling
 * rather than resolving its binding.
 */
function Buffer(initialText) {
  return {
    left: initialText,
    right: '',
    insert(ch) {
      this.left += ch;
    },
    toString() {
      return this.left + this.right;
    },
  };
}

export function openDocument(text) {
  const document = Buffer(text);
  document.insert('\n');
  return document.toString();
}
