/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-key-derivation
 * Detects PBKDF2 with insufficient iterations
 * CWE-916: Use of Password Hash With Insufficient Computational Effort
 *
 * OWASP 2023 recommends minimum 600,000 iterations for PBKDF2-SHA256
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  resolveModuleBinding,
  unwrapTypeSyntax,
  propertyName,
} from '@interlace/eslint-devkit';
import { constInitializerOf, resolveConstantString } from '../../utils/const-value';

type SourceCode = TSESLint.SourceCode;

/**
 * The PBKDF2 entry points, by export name.
 *
 * Exact membership against a closed API surface, not a substring test.
 * `node:crypto`, the `pbkdf2` npm ponyfill and `browserify-pbkdf2` all export
 * these two names with the same positional signature, so the receiver does not
 * have to be identified for the argument index to mean what it means.
 */
const PBKDF2_EXPORTS: ReadonlySet<string> = new Set(['pbkdf2', 'pbkdf2Sync']);

/** Web Crypto's derivation entry points, whose parameters arrive as an object. */
const SUBTLE_DERIVE_METHODS: ReadonlySet<string> = new Set(['deriveBits', 'deriveKey']);

/** A folded numeric constant, and the node a fixer must rewrite to change it. */
interface FoldedNumber {
  value: number;
  source: TSESTree.Node;
}

/**
 * The number this expression evaluates to.
 *
 * Wider than `resolveConstant`, which stops at a literal bound to a `const`.
 * Three shapes were missed and all three are ordinary style:
 *
 * ```js
 * const ROUNDS = 10 * 1000;                    // units spelled out
 * const KDF = { iterations: 1000 };            // parameters collected in one place
 * crypto.pbkdf2Sync(pw, salt, KDF.iterations, …)
 * ```
 *
 * `const` only, one hop into an object literal only. A `let` can be raised
 * between the declaration and the call, and a parameter is decided by a caller;
 * both stay unresolved, which is "no evidence", never "safe".
 */
function foldNumber(
  sourceCode: SourceCode,
  node: TSESTree.Node,
  depth = 0,
): FoldedNumber | null {
  if (depth > 6) return null;

  const bare = unwrapTypeSyntax(node);
  if (bare !== node) return foldNumber(sourceCode, bare, depth + 1);

  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'number' ? { value: node.value, source: node } : null;
  }

  if (node.type === AST_NODE_TYPES.UnaryExpression && node.operator === '-') {
    const inner = foldNumber(sourceCode, node.argument, depth + 1);
    return inner === null ? null : { value: -inner.value, source: node };
  }

  if (node.type === AST_NODE_TYPES.BinaryExpression) {
    const left = foldNumber(sourceCode, node.left as TSESTree.Node, depth + 1);
    const right = foldNumber(sourceCode, node.right, depth + 1);
    if (left === null || right === null) return null;
    switch (node.operator) {
      case '*': return { value: left.value * right.value, source: node };
      case '+': return { value: left.value + right.value, source: node };
      case '-': return { value: left.value - right.value, source: node };
      case '**': return { value: left.value ** right.value, source: node };
      default: return null;
    }
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    const init = constInitializerOf(sourceCode, node);
    return init === null ? null : foldNumber(sourceCode, init, depth + 1);
  }

  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const value = objectPropertyValue(sourceCode, node.object, propertyKey(sourceCode, node));
    return value === null ? null : foldNumber(sourceCode, value, depth + 1);
  }

  return null;
}

/** The property name a member expression reads, resolving a constant computed key. */
function propertyKey(sourceCode: SourceCode, node: TSESTree.MemberExpression): string | null {
  if (node.computed) return resolveConstantString(sourceCode, node.property)?.value ?? null;
  return node.property.type === AST_NODE_TYPES.Identifier ? node.property.name : null;
}

/**
 * The value written at `key` in an object literal, reached through at most one
 * `const` binding. Returns `null` when the object is not a literal this file
 * can see — a parameter, an import, a `let`.
 */
function objectPropertyValue(
  sourceCode: SourceCode,
  node: TSESTree.Node,
  key: string | null,
): TSESTree.Node | null {
  if (key === null) return null;
  let object = unwrapTypeSyntax(node);
  if (object.type === AST_NODE_TYPES.Identifier) {
    const init = constInitializerOf(sourceCode, object);
    if (init === null) return null;
    object = unwrapTypeSyntax(init);
  }
  if (object.type !== AST_NODE_TYPES.ObjectExpression) return null;
  for (const property of object.properties) {
    if (property.type !== AST_NODE_TYPES.Property || property.computed) continue;
    // A non-computed object key is an Identifier or a string/number Literal.
    // There is no third spelling, so there is no third arm to guard.
    const name =
      property.key.type === AST_NODE_TYPES.Identifier
        ? property.key.name
        : String((property.key as TSESTree.Literal).value);
    if (name === key) return property.value;
  }
  return null;
}

/** `util.promisify(...)`, resolved through the module binding rather than the name. */
function isPromisifyCall(sourceCode: SourceCode, node: TSESTree.Node): node is TSESTree.CallExpression {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const binding = resolveModuleBinding(node.callee, sourceCode.getScope(node));
  return binding?.module === 'util' && binding.path.at(-1) === 'promisify';
}

/**
 * Does this callee run PBKDF2?
 *
 * Three admissible spellings, all of which reach the same primitive with the
 * same argument order (promisify drops only the trailing callback):
 *
 * ```js
 * crypto.pbkdf2Sync(pw, salt, 1000, 64, 'sha512')                  // named
 * import { pbkdf2Sync as deriveKey } from 'node:crypto'            // renamed at the boundary
 * const pbkdf2Async = promisify(crypto.pbkdf2)                     // promisified
 * ```
 *
 * The last two were the majority of modern Node code and both were silent.
 */
function isPbkdf2Callee(sourceCode: SourceCode, callee: TSESTree.Node, depth = 0): boolean {
  if (depth > 4) return false;

  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    PBKDF2_EXPORTS.has(propertyName(callee) as string)
  ) {
    return true;
  }
  if (callee.type === AST_NODE_TYPES.Identifier && PBKDF2_EXPORTS.has(callee.name)) return true;

  // `import { pbkdf2Sync as deriveKeyMaterial }` — the export name survives the
  // rename, and the binding is where it is recorded.
  const binding = resolveModuleBinding(callee, sourceCode.getScope(callee));
  if (binding !== undefined && PBKDF2_EXPORTS.has(binding.path.at(-1) ?? '')) return true;

  if (callee.type === AST_NODE_TYPES.CallExpression) {
    return (
      isPromisifyCall(sourceCode, callee) &&
      callee.arguments.length > 0 &&
      isPbkdf2Callee(sourceCode, callee.arguments[0], depth + 1)
    );
  }
  if (callee.type === AST_NODE_TYPES.Identifier) {
    const init = constInitializerOf(sourceCode, callee);
    return (
      init !== null &&
      isPromisifyCall(sourceCode, init) &&
      init.arguments.length > 0 &&
      isPbkdf2Callee(sourceCode, init.arguments[0], depth + 1)
    );
  }
  return false;
}

// `useScrypt` and `useArgon2` used to sit here too, as INFO messages with no
// report path: the single `context.report` offers exactly one suggestion,
// `useMinIterations`. Wiring them would mean a suggestion that rewrites
// `crypto.pbkdf2(pw, salt, n, len, digest, cb)` into `crypto.scrypt(…)` — a
// different signature and a different output length, which is not a mechanical
// fix ESLint may apply. Their advice already survives in the `fix:` line of
// `insufficientIterations` ("…or use scrypt/Argon2"), so they are deleted
// rather than kept as dead metadata.
type MessageIds = 'insufficientIterations' | 'useMinIterations';

export interface Options {
  /** Minimum PBKDF2 iterations. Default: 100000 */
  minIterations?: number;
}

type RuleOptions = [Options?];

// OWASP 2023 recommendations
const DEFAULT_MIN_ITERATIONS = 100000;

export const noInsecureKeyDerivation = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-key-derivation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-insecure-key-derivation.md',
      description: 'Disallow PBKDF2 with insufficient iterations (< 100,000)',
      cwe: 'CWE-916',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      insufficientIterations: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insufficient PBKDF2 iterations',
        cwe: 'CWE-916',
        description: 'PBKDF2 with {{actual}} iterations is too low. Minimum recommended: {{minimum}} iterations (OWASP 2023).',
        severity: 'HIGH',
        fix: 'Increase iterations to at least {{minimum}}, or use scrypt/Argon2',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
      }),
      useMinIterations: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use minimum iterations',
        description: 'Use at least {{minimum}} iterations for PBKDF2',
        severity: 'LOW',
        fix: 'crypto.pbkdf2(password, salt, {{minimum}}, keylen, digest)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptopbkdf2password-salt-iterations-keylen-digest-callback',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minIterations: {
            type: 'number',
            default: DEFAULT_MIN_ITERATIONS,
            description: 'Minimum required PBKDF2 iterations',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minIterations: DEFAULT_MIN_ITERATIONS,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { minIterations = DEFAULT_MIN_ITERATIONS } = options as Options;

    const sourceCode = context.sourceCode;

    /** Report at the count, raise the number where it is written. */
    function judgeIterations(iterationsArg: TSESTree.Node | undefined | null) {
      if (iterationsArg === undefined || iterationsArg === null) return;

      // `const ROUNDS = 1000; crypto.pbkdf2(pw, salt, ROUNDS, …)` runs 1000
      // rounds exactly as the inline number does.
      const folded = foldNumber(sourceCode, iterationsArg);
      if (folded === null || folded.value >= minIterations) return;

      context.report({
        node: iterationsArg,
        messageId: 'insufficientIterations',
        data: {
          actual: String(folded.value),
          minimum: String(minIterations),
        },
        suggest: [
          {
            messageId: 'useMinIterations',
            data: { minimum: String(minIterations) },
            fix: (fixer: TSESLint.RuleFixer) => {
              return fixer.replaceText(folded.source, String(minIterations));
            },
          },
        ],
      });
    }

    function checkCallExpression(node: TSESTree.CallExpression) {
      // pbkdf2(password, salt, iterations, keylen, digest[, callback])
      if (isPbkdf2Callee(sourceCode, node.callee)) {
        judgeIterations(node.arguments[2]);
        return;
      }

      // CryptoJS.PBKDF2(password, salt, { keySize, iterations }) — the same
      // primitive with the count in an options object. crypto-js defaults it to
      // ONE iteration, but an omitted key is not evidence of what the author
      // meant, so only an explicit count is judged here.
      if (
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(node.callee) === 'PBKDF2') ||
        (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === 'PBKDF2')
      ) {
        const options = node.arguments[2];
        if (options !== undefined) {
          judgeIterations(objectPropertyValue(sourceCode, options, 'iterations'));
        }
        return;
      }

      // subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash }, key, len)
      // — the Web Crypto spelling, which is what a codebase shared with the
      // browser has to write. The algorithm is named in the parameter object,
      // so the callee alone never identifies the sink.
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        SUBTLE_DERIVE_METHODS.has(propertyName(node.callee) as string)
      ) {
        const params = node.arguments[0];
        if (params === undefined) return;
        const algorithm = objectPropertyValue(sourceCode, params, 'name');
        if (algorithm === null) return;
        if (resolveConstantString(sourceCode, algorithm)?.value !== 'PBKDF2') return;
        judgeIterations(objectPropertyValue(sourceCode, params, 'iterations'));
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoInsecureKeyDerivationOptions };
