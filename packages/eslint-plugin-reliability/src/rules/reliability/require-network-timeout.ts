/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require timeout limits for network requests
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/770.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isGlobalReference,
  MessageIcons,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
  resolveObjectLiteral,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

type SourceCode = Readonly<TSESLint.SourceCode>;

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

/**
 * Where each axios method takes its request config. `post`, `put` and `patch`
 * take the request BODY second, so a `timeout` field there bounds nothing.
 * Methods not listed (`create`, `isCancel`, `all`, ...) send no request.
 */
const AXIOS_CONFIG_SLOT: ReadonlyMap<string, number> = new Map(
  Object.entries({
    request: 0,
    get: 1,
    delete: 1,
    head: 1,
    options: 1,
    post: 2,
    put: 2,
    patch: 2,
    postForm: 2,
    putForm: 2,
    patchForm: 2,
  }),
);

/** Names a global — undeclared in the file — rather than a local binding. */
function isGlobalNamed(
  node: TSESTree.Node,
  name: string,
  sourceCode: SourceCode,
): boolean {
  return (
    node.type === AST_NODE_TYPES.Identifier &&
    node.name === name &&
    isGlobalReference(node, sourceCode)
  );
}

/** The axios module itself: imported or required from 'axios', or the global. */
function isAxiosRoot(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  if (isGlobalNamed(node, 'axios', sourceCode)) return true;
  const binding = resolveModuleBinding(node, sourceCode.getScope(node));
  return (
    binding?.module === 'axios' &&
    (binding.path.length === 0 ||
      (binding.path.length === 1 && binding.path[0] === 'default'))
  );
}

/**
 * The argument index holding this request's options, or `null` when the call
 * sends no network request: the global `fetch` (also `globalThis.fetch`), and
 * axios called directly or through a request method.
 */
function configSlot(
  node: TSESTree.CallExpression,
  sourceCode: SourceCode,
): number | null {
  const callee = node.callee;
  if (isGlobalNamed(callee, 'fetch', sourceCode)) return 1;
  if (callee.type === AST_NODE_TYPES.MemberExpression) {
    const name = propertyName(callee);
    if (
      name === 'fetch' &&
      ['globalThis', 'window', 'self'].some((g) =>
        isGlobalNamed(callee.object, g, sourceCode),
      )
    ) {
      return 1;
    }
    const slot = name === null ? undefined : AXIOS_CONFIG_SLOT.get(name);
    if (slot !== undefined && isAxiosRoot(callee.object, sourceCode)) {
      return slot;
    }
    return null;
  }
  if (isAxiosRoot(callee, sourceCode)) {
    // `axios(url, config)` when a second argument or a string URL says so,
    // otherwise `axios(config)`.
    const first = node.arguments[0];
    const urlFirst =
      node.arguments.length > 1 ||
      first?.type === AST_NODE_TYPES.TemplateLiteral ||
      (first?.type === AST_NODE_TYPES.Literal &&
        typeof first.value === 'string');
    return urlFirst ? 1 : 0;
  }
  return null;
}

type Bound = 'bounded' | 'unbounded' | 'unknown';

/**
 * Does the request's options object bound it? Only an object the file shows
 * can answer `unbounded`: no options at all, or a literal (inline or behind a
 * `const`) with neither `timeout` nor `signal`. Options the file cannot see —
 * a parameter, a spread of one — prove nothing, so they answer `unknown`.
 */
function boundOf(
  node: TSESTree.Node | undefined,
  sourceCode: SourceCode,
  depth = 0,
): Bound {
  if (!node) return 'unbounded';
  if (depth > 4) return 'unknown';
  const object = resolveObjectLiteral(node, sourceCode);
  if (!object) return 'unknown';
  let result: Bound = 'unbounded';
  for (const property of object.properties) {
    if (property.type === AST_NODE_TYPES.SpreadElement) {
      const inner = boundOf(property.argument, sourceCode, depth + 1);
      if (inner === 'bounded') return 'bounded';
      if (inner === 'unknown') result = 'unknown';
      continue;
    }
    const key = objectKeyName(property);
    if (key === null) result = 'unknown';
    else if (key === 'timeout' || key === 'signal') return 'bounded';
  }
  return result;
}

export const requireNetworkTimeout = createRule<RuleOptions, MessageIds>({
  name: 'require-network-timeout',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/require-network-timeout.md',
      description: 'Require timeout limits for network requests',
      cwe: 'CWE-400',
      cvss: 5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-400',
        description:
          'Require timeout limits for network requests detected - fetch/axios without timeout option',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const sourceCode = context.sourceCode;
        const slot = configSlot(node, sourceCode);
        if (slot === null) return;
        if (boundOf(node.arguments[slot], sourceCode) === 'unbounded') {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
