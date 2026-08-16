/**
 * VULNERABLE - the wildcard form of the same barrel. `export *` re-exports the
 * whole unmaintained surface without ever binding a local name, so a rule that
 * only visits ImportDeclaration sees nothing (CWE-1104).
 */
export * from 'crypto-js';
