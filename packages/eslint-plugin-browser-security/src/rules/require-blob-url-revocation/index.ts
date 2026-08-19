/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-blob-url-revocation
 * Detects Blob URLs that are not revoked, preventing memory leaks
 * CWE-401: Missing Release of Memory after Effective Lifetime
 *
 * @see https://cwe.mitre.org/data/definitions/401.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';

import { resolveGlobalObject } from '../../utils/global-object';

type MessageIds = 'missingRevoke';

/**
 * `URL` — the global, bare or qualified.
 *
 * `resolveGlobalObject` accepts `URL` and `window.URL` / `self.URL` /
 * `globalThis.URL` alike. The rule used to require a bare `Identifier` named
 * `URL` on BOTH halves, which produced a false negative and a false positive
 * from the same omission: `window.URL.createObjectURL(blob)` was not a
 * creation, and `window.URL.revokeObjectURL(url)` was not a revocation — so
 * code that spelled the global out leaked silently, and code that spelled only
 * the revocation out was reported for a leak it had already fixed. Inside a
 * worker `self.URL` is the only spelling available.
 */
const URL_GLOBAL: ReadonlySet<string> = new Set(['URL']);

function isUrlMethod(node: TSESTree.CallExpression, method: string): boolean {
  const callee = node.callee;
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    callee.property.name === method &&
    resolveGlobalObject(callee.object, URL_GLOBAL) !== null
  );
}

/**
 * A stable key for a non-computed property path — `img.src`, `this.previewUrl`.
 *
 * Object URLs are routinely parked on a property rather than a `const`:
 * `img.src = URL.createObjectURL(file)` is the single most common spelling of
 * this API, and the rule tracked ONLY `VariableDeclarator` initialisers, so the
 * most common shape was invisible to it in both directions.
 *
 * This is structural equality of an access path, not a name heuristic: two
 * paths match only when every link matches, and a computed link makes the path
 * untrackable rather than approximately equal.
 */
function pathKey(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name;
  if (node.type === AST_NODE_TYPES.ThisExpression) return 'this';
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier
  ) {
    const base = pathKey(node.object);
    return base === null ? null : `${base}.${node.property.name}`;
  }
  return null;
}

/**
 * What owns a handle referred to by this identifier.
 *
 * Ownership is keyed on the resolved BINDING, not the spelling. A file-wide
 * name map merged every `const url` in the file into one entry, so a single
 * revocation anywhere marked every same-named handle in every other function as
 * released — the classic shape being two sibling helpers that both call their
 * handle `url` and only one of which cleans up.
 *
 * An identifier with no binding at all (an implicit global, `url = ...` in a
 * module that never declared it) falls back to its name: there is exactly one
 * such slot per name in the program, so the name IS the identity.
 */
type HandleOwner = TSESLint.Scope.Variable | string;

function ownerOf(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): HandleOwner {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const found = scope.variables.find((v) => v.name === identifier.name);
    if (found !== undefined) return found;
  }
  return identifier.name;
}

/**
 * Does this handle leave the file, so that revocation is the caller's job?
 *
 * `return URL.createObjectURL(blob)` and `resolve(url)` hand ownership out. The
 * rule cannot see the caller, and reporting a helper that correctly delegates
 * cleanup is a false positive in exactly the well-factored code most likely to
 * be doing it right. Escaping handles are therefore not reported.
 */
function escapes(node: TSESTree.CallExpression): boolean {
  // A `CallExpression` is never the root of a program, so it always has a
  // parent. Guarding for one would be an unreachable branch.
  const parent = node.parent;
  return (
    parent.type === AST_NODE_TYPES.ReturnStatement ||
    parent.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    parent.type === AST_NODE_TYPES.CallExpression ||
    parent.type === AST_NODE_TYPES.Property ||
    parent.type === AST_NODE_TYPES.ArrayExpression
  );
}

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireBlobUrlRevocation = createRule<RuleOptions, MessageIds>({
  name: 'require-blob-url-revocation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-blob-url-revocation.md',
      description: 'Require revoking Blob URLs to prevent memory leaks',
      cwe: 'CWE-401',
      cvss: 5.3,
    },
    messages: {
      missingRevoke: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Blob URL Memory Leak',
        cwe: 'CWE-401',
        owasp: 'A06:2021',
        cvss: 5.3,
        description:
          'URL.createObjectURL() creates a reference that persists until explicitly revoked. Without revokeObjectURL(), memory leaks occur.',
        severity: 'MEDIUM',
        fix: 'Call URL.revokeObjectURL(blobUrl) when the URL is no longer needed.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const isTestFile = isTestFilePath(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    /** Handles owned by a binding (or, for an implicit global, by its name). */
    const byOwner = new Map<HandleOwner, TSESTree.Node>();
    /** Handles parked on a property path — `img.src`, `this.previewUrl`. */
    const byPath = new Map<string, TSESTree.Node>();
    /** Handles nothing in this file can ever reach again. */
    const unreachable: TSESTree.Node[] = [];

    const revokedOwners = new Set<HandleOwner>();
    const revokedPaths = new Set<string>();

    /** Record where a freshly created object URL was stored, if anywhere. */
    function trackCreation(node: TSESTree.CallExpression): void {
      const parent = node.parent;

      if (
        parent.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier
      ) {
        byOwner.set(ownerOf(parent.id, sourceCode), parent);
        return;
      }

      if (parent.type === AST_NODE_TYPES.AssignmentExpression) {
        if (parent.left.type === AST_NODE_TYPES.Identifier) {
          byOwner.set(ownerOf(parent.left, sourceCode), parent);
          return;
        }
        const key = pathKey(parent.left);
        if (key !== null) byPath.set(key, parent);
        return;
      }

      // Handed out of the file (returned, passed on, put in a literal): the
      // caller owns the release and this file cannot see it.
      if (escapes(node)) return;

      // Stored nowhere at all. The handle exists for the lifetime of the
      // document and no code can ever revoke it.
      unreachable.push(node);
    }

    /** Record a released handle. */
    function trackRevocation(node: TSESTree.CallExpression): void {
      const arg = node.arguments[0];
      if (arg === undefined) return;
      if (arg.type === AST_NODE_TYPES.Identifier) {
        revokedOwners.add(ownerOf(arg, sourceCode));
        return;
      }
      const key = pathKey(arg);
      if (key !== null) revokedPaths.add(key);
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isUrlMethod(node, 'createObjectURL')) trackCreation(node);
        if (isUrlMethod(node, 'revokeObjectURL')) trackRevocation(node);
      },

      'Program:exit'() {
        for (const [owner, site] of byOwner) {
          if (!revokedOwners.has(owner)) {
            context.report({ node: site, messageId: 'missingRevoke' });
          }
        }
        for (const [key, site] of byPath) {
          if (!revokedPaths.has(key)) {
            context.report({ node: site, messageId: 'missingRevoke' });
          }
        }
        for (const site of unreachable) {
          context.report({ node: site, messageId: 'missingRevoke' });
        }
      },
    };
  },
});
