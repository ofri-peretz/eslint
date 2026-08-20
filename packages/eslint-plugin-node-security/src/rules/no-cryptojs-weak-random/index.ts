/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-cryptojs-weak-random
 * Detects crypto-js WordArray.random() which was insecure pre-3.2.1
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator
 *
 * CVE-2020-36732: crypto-js < 3.2.1 used Math.random() for crypto operations
 * @see https://nvd.nist.gov/vuln/detail/CVE-2020-36732
 */
import type { ModuleBinding, TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  resolveModuleBinding,
  isTestFilePath,
} from '@interlace/eslint-devkit';

import { resolveConstantString } from '../../utils/const-value';
import { findVariable } from '../../utils/provenance';

type MessageIds =
  | 'weakRandom';

type SourceCode = TSESLint.SourceCode;

/**
 * crypto-js's one weak generator, as the export path it is reached by.
 *
 * The rule used to look for the *spelling* `WordArray` anywhere in the callee,
 * which reported three shapes that have nothing to do with CVE-2020-36732:
 * a local `class WordArray` written as a migration shim over
 * `crypto.randomBytes`, a local `const CryptoJS = { random: … }` facade, and an
 * unrelated `WordArray` imported from a passphrase wordlist. All three are
 * ordinary code in a repo that is REMOVING crypto-js, which is precisely the
 * repo this rule runs in.
 */
const WEAK_RANDOM_PATH = ['lib', 'WordArray', 'random'] as const;

function isCryptoJs(module: string): boolean {
  return module === 'crypto-js' || module.startsWith('crypto-js/');
}

/**
 * `…WordArray.random` — the last two hops, wherever the binding was split.
 *
 * `const { WordArray } = CryptoJS.lib`, `const random = lib.WordArray.random`
 * and the fully-spelled chain all resolve to the same path, so the suffix test
 * covers every way a file can carry the generator to its call site.
 */
function endsWithWordArrayRandom(path: readonly string[]): boolean {
  return path.length >= 2 && path.at(-2) === 'WordArray' && path.at(-1) === 'random';
}

/**
 * devkit's `resolveModuleBinding`, extended over one shape it abstains on: a
 * COMPUTED member whose key is a constant string. `CryptoJS.lib.WordArray[M]`
 * with `const M = 'random'` names the same export as the dotted form.
 */
function resolveBinding(
  sourceCode: SourceCode,
  node: TSESTree.Node,
): ModuleBinding | undefined {
  // No depth guard: the recursion walks `node.object`, which is strictly
  // smaller each step, so a member chain terminates by construction.
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const key = node.computed
      ? resolveConstantString(sourceCode, node.property)?.value
      : node.property.type === AST_NODE_TYPES.Identifier
        ? node.property.name
        : undefined;
    if (key === undefined) return undefined;
    const base = resolveBinding(sourceCode, node.object);
    return base && { module: base.module, path: [...base.path, key] };
  }

  return resolveModuleBinding(node, sourceCode.getScope(node));
}

/** The member path as written, and the expression it hangs off. */
function syntacticPath(
  sourceCode: SourceCode,
  node: TSESTree.Node,
): { root: TSESTree.Node; path: string[] } | null {
  const path: string[] = [];
  let current = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    const key = current.computed
      ? resolveConstantString(sourceCode, current.property)?.value
      : current.property.type === AST_NODE_TYPES.Identifier
        ? current.property.name
        : undefined;
    if (key === undefined) return null;
    path.unshift(key);
    current = current.object;
  }
  return { root: current, path };
}

/**
 * Does this callee reach crypto-js's `lib.WordArray.random`?
 *
 * Two admissible kinds of evidence, and no third:
 *
 * 1. The binding resolves to the crypto-js module — an import, a require, a
 *    destructure, an alias, a computed key. This is the bundler case and it is
 *    the one that proves the dependency.
 * 2. The root identifier resolves to NOTHING and the path is the full
 *    three-segment API `lib.WordArray.random`. crypto-js is still shipped by
 *    `<script>` tag, where `CryptoJS` is a global there is no binding for, and
 *    dropping this would have traded the browser case away for the fix above.
 *    The root must be UNDECLARED — no definition in this file, which is what a
 *    `/* global CryptoJS *\/` comment or a `globals` config entry produces — so
 *    a local class or object of the same name can never take this path, and the
 *    whole path must match, so a bare `WordArray.random()` — a name and nothing
 *    else — no longer counts.
 */
function isWeakRandomCall(sourceCode: SourceCode, callee: TSESTree.Node): boolean {
  const binding = resolveBinding(sourceCode, callee);
  if (binding !== undefined) {
    return isCryptoJs(binding.module) && endsWithWordArrayRandom(binding.path);
  }

  const spelled = syntacticPath(sourceCode, callee);
  if (spelled === null || spelled.root.type !== AST_NODE_TYPES.Identifier) return false;
  // A `/* global */` declaration carries no `defs`; a `const`, a `class` or a
  // parameter of the same name carries one, and that is a different value.
  if ((findVariable(sourceCode, spelled.root)?.defs.length ?? 0) > 0) return false;
  return (
    spelled.path.length === WEAK_RANDOM_PATH.length &&
    WEAK_RANDOM_PATH.every((segment, i) => spelled.path[i] === segment)
  );
}

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noCryptojsWeakRandom = createRule<RuleOptions, MessageIds>({
  name: 'no-cryptojs-weak-random',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-cryptojs-weak-random.md',
      description: 'Disallow crypto-js WordArray.random() (CVE-2020-36732)',
      cwe: 'CWE-338',
      cvss: 5.3,
    },
    messages: {
      weakRandom: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak random in crypto-js',
        cwe: 'CWE-338',
        description: 'CryptoJS.lib.WordArray.random() was insecure in versions < 3.2.1 (CVE-2020-36732). Used Math.random() instead of CSPRNG.',
        severity: 'CRITICAL',
        fix: 'Use crypto.randomBytes() from Node.js or crypto.getRandomValues() in browsers',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2020-36732',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;
      if (!isWeakRandomCall(context.sourceCode, node.callee)) return;
      context.report({
        node,
        messageId: 'weakRandom',
      });
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoCryptojsWeakRandomOptions };
