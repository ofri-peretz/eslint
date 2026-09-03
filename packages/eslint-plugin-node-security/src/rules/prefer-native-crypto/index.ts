/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-native-crypto
 * Suggests using native crypto over third-party libraries
 * CWE-1104: Use of Unmaintained Third Party Components
 *
 * Native crypto is maintained by Node.js/browser vendors and is always up-to-date
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isModuleBinding,
} from '@interlace/eslint-devkit';

import { resolveConstantString } from '../../utils/const-value';
import { findVariable } from '../../utils/provenance';

type SourceCode = TSESLint.SourceCode;

/**
 * Is this expression `createRequire(...)`?
 *
 * Resolved through the module binding, never through the callee's spelling, so
 * `import { createRequire } from 'node:module'` and `module.createRequire(…)`
 * answer the same.
 *
 * NOTE FOR A LATER PASS: this helper, `isRequireCallee` and
 * `moduleSpecifierListener` are byte-identical to the copies in
 * `rules/no-cryptojs/index.ts`. They belong in `utils/`, next to
 * `const-value.ts` — every rule in this package that judges a dependency needs
 * exactly this listener. They are duplicated here only because the change that
 * introduced them was scoped to two rules.
 */
function isCreateRequireCall(
  sourceCode: SourceCode,
  node: TSESTree.Node | null | undefined,
): boolean {
  if (!node || node.type !== AST_NODE_TYPES.CallExpression) return false;
  return isModuleBinding(node.callee, sourceCode.getScope(node), 'module', ['createRequire']);
}

/**
 * Does this callee load a CommonJS module?
 *
 * Two things `callee.name === 'require'` got wrong, in opposite directions: an
 * ESM file reaching a CommonJS-only package through
 * `const load = createRequire(import.meta.url)` was invisible, and a file that
 * declares its OWN `require` — a stub registry, a bundle evaluator — was
 * reported for the spelling of a local function.
 *
 * Node's real CommonJS `require` is injected into the module wrapper and has no
 * declaration in the file, so "the name resolves to nothing" is the normal
 * positive case.
 */
function isRequireCallee(sourceCode: SourceCode, callee: TSESTree.Node): boolean {
  if (callee.type !== AST_NODE_TYPES.Identifier) return false;
  const def = findVariable(sourceCode, callee)?.defs[0];

  if (def?.type === 'Variable' && isCreateRequireCall(sourceCode, def.node.init)) return true;

  if (callee.name !== 'require') return false;
  if (def === undefined) return true;
  return (
    def.type === 'Variable' &&
    def.node.init?.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    def.node.init?.type !== AST_NODE_TYPES.FunctionExpression
  );
}

/**
 * Every syntactic site where a module specifier enters a file.
 *
 * The rule used to visit `ImportDeclaration` and `require()` only, which is two
 * of the six ways a dependency arrives. `import()`, `export … from`,
 * `export * from` and TypeScript's `import x = require(…)` all bind the same
 * package and all were silent.
 */
function moduleSpecifierListener(
  sourceCode: SourceCode,
  judge: (node: TSESTree.Node, specifier: string) => void,
): TSESLint.RuleListener {
  const fromExpression = (
    report: TSESTree.Node,
    source: TSESTree.Node | null | undefined,
  ): void => {
    if (!source) return;
    const resolved = resolveConstantString(sourceCode, source);
    if (resolved !== null) judge(report, resolved.value);
  };

  return {
    ImportDeclaration: (node: TSESTree.ImportDeclaration) => fromExpression(node, node.source),
    ImportExpression: (node: TSESTree.ImportExpression) => fromExpression(node, node.source),
    ExportNamedDeclaration: (node: TSESTree.ExportNamedDeclaration) =>
      fromExpression(node, node.source),
    ExportAllDeclaration: (node: TSESTree.ExportAllDeclaration) =>
      fromExpression(node, node.source),
    TSImportEqualsDeclaration: (node: TSESTree.TSImportEqualsDeclaration) => {
      if (node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference) {
        fromExpression(node, node.moduleReference.expression);
      }
    },
    CallExpression: (node: TSESTree.CallExpression) => {
      if (node.arguments.length === 0) return;
      if (!isRequireCallee(sourceCode, node.callee)) return;
      fromExpression(node, node.arguments[0]);
    },
  };
}

type MessageIds =
  | 'preferNative'
  | 'preferNativePasswordHash';

/**
 * No options.
 *
 * A `severity: 'error' | 'warn'` option used to sit here, defaulted to `'warn'`
 * in both the schema and `defaultOptions`, and documented in
 * `docs/rules/prefer-native-crypto.md` as "Severity level for reports". Nothing
 * in `create()` ever read it, and nothing could: an ESLint rule does not choose
 * its own severity — the config entry does (`'…/prefer-native-crypto': 'error'`).
 * A consumer who wrote `severity: 'error'` got warn-level reports and a schema
 * that accepted the setting without complaint. Deleted, so that config now
 * fails loudly instead of lying quietly.
 */
export type Options = Record<string, never>;

type RuleOptions = [Options?];

// Third-party crypto libraries whose job native crypto genuinely does.
const THIRD_PARTY_CRYPTO_LIBS = new Set([
  'crypto-js',
  'cryptojs',
  'sjcl',           // Stanford JavaScript Crypto Library
  'forge',          // node-forge
  'node-forge',
  'jsencrypt',
  'js-sha256',
  'js-sha512',
  'js-sha3',
  'js-md5',
  'js-sha1',
  'blueimp-md5',
  'aes-js',
  // The browserify-era digest packages. `md5`, `sha.js` and `hash.js` are the
  // same thing as `js-md5`/`js-sha256` — a pure-JS reimplementation of a
  // primitive `node:crypto` exposes — and were missing purely because the list
  // was assembled from the `js-*` naming convention rather than from what the
  // packages do. `crypto-browserify` deliberately stays OUT: it exists to stand
  // in for `node:crypto` where `node:crypto` does not exist, so telling a
  // bundle to "migrate to native crypto" would be advice it cannot take.
  'md5',
  'sha.js',
  'hash.js',
]);

/**
 * Password-hashing libraries, which need their own advice.
 *
 * `bcryptjs` used to sit in the list above with the comment "pure JS bcrypt
 * (prefer native bcrypt)", so the rule told anyone importing it to "migrate to
 * native crypto". That advice is wrong and acting on it is a downgrade:
 * `node:crypto` has no bcrypt, and the nearest thing it exposes is
 * `crypto.pbkdf2` / `crypto.scrypt` — different KDFs with different parameters,
 * not a drop-in. A developer who followed the message to `createHash('sha256')`
 * would replace a deliberately-slow password hash with a fast one, which is
 * CWE-916, a worse bug than the one being reported.
 *
 * The real remedy for `bcryptjs` is the native binding `bcrypt`, or `argon2`.
 * Both are third-party by necessity, so the message says so instead of
 * pretending the platform covers it.
 */
const PURE_JS_PASSWORD_HASH_LIBS = new Set([
  'bcryptjs',
  'bcrypt-nodejs',
]);

export const preferNativeCrypto = createRule<RuleOptions, MessageIds>({
  name: 'prefer-native-crypto',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/prefer-native-crypto.md',
      description: 'Prefer native crypto over third-party libraries',
      cwe: 'CWE-1104',
      cvss: 5.3,
    },
    messages: {
      preferNative: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Third-party crypto library',
        cwe: 'CWE-1104',
        description: '{{library}} is a third-party crypto library. Native crypto (Node.js crypto or Web Crypto API) is faster, more secure, and always maintained.',
        severity: 'MEDIUM',
        fix: 'Migrate to native crypto module',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),
      preferNativePasswordHash: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Pure-JS password hashing library',
        cwe: 'CWE-1104',
        description: '{{library}} is a pure-JavaScript password hash. It is orders of magnitude slower than a native implementation, so the same cost factor buys far less protection, and its maintenance has repeatedly lagged the native bindings.',
        severity: 'MEDIUM',
        fix: 'Use the native `bcrypt` binding, or `argon2` (Argon2id) for new code. Do NOT reach for node:crypto\'s createHash here — it has no bcrypt, and a general-purpose digest is not a password hash (CWE-916). crypto.scrypt is the only node:crypto function in this category.',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * Judge a module specifier, reporting at `node`.
     *
     * The base package name only, so `crypto-js/aes` and `crypto-js` are the
     * same dependency. Exact set membership — never a substring test — so a
     * local module called `./forge-adapter` is untouched.
     */
    function checkSpecifier(node: TSESTree.Node, specifier: string) {
      const lib = specifier.split('/')[0];
      if (PURE_JS_PASSWORD_HASH_LIBS.has(lib)) {
        context.report({
          node,
          messageId: 'preferNativePasswordHash',
          data: { library: lib },
        });
        return;
      }
      if (THIRD_PARTY_CRYPTO_LIBS.has(lib)) {
        context.report({
          node,
          messageId: 'preferNative',
          data: { library: lib },
        });
      }
    }

    return moduleSpecifierListener(context.sourceCode, checkSpecifier);
  },
});

export type { Options as PreferNativeCryptoOptions };
