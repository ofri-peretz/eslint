/**
 * ADVERSARIAL SAFE - `export const` with no `from` clause. The rule now visits
 * ExportNamedDeclaration, and an export declaration that carries no module
 * source must stay quiet even when the exported VALUE is the package name.
 */
export const DEPRECATED_DEPENDENCY = 'crypto-js';
export const REPLACEMENT = 'node:crypto';

export function isDeprecated(name) {
  return name === DEPRECATED_DEPENDENCY;
}
