/**
 * ADVERSARIAL SAFE - `export const` with no `from` clause. The rule now visits
 * ExportNamedDeclaration; an export that carries no module source must stay
 * quiet even when the exported VALUE names a library.
 */
export const NATIVE_REPLACEMENTS = {
  'node-forge': 'node:crypto generateKeyPairSync',
  sjcl: 'node:crypto createCipheriv',
  'js-sha256': 'node:crypto createHash',
};

export const canReplace = (name) => name in NATIVE_REPLACEMENTS;
