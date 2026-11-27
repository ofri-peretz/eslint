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
  propertyName,
} from '@interlace/eslint-devkit';

import { resolveGlobalObject } from '../../utils/global-object';
import {
  COLLECTION_ADDERS,
  calledFunction,
  enumeratedCollection,
  parameterIndex,
  rangesOver,
  stateOfSetter,
  variableOf,
  type FunctionNode,
} from './release-paths';

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
    // `URL['createObjectURL'](blob)` mints the same object URL.
    propertyName(callee) === method &&
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
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    // `preview['src']` is the same path as `preview.src`, so both must key the
    // same way — otherwise a URL created under one spelling is never matched to
    // the revoke written in the other. A runtime key names no stable path.
    // `this.#url` is a private field: one stable path per class, named with
    // its `#` so it cannot collide with a public `url`. A `#name` has exactly
    // one spelling (it cannot be written computed), so reading `.name` here
    // is deliberate and misses no alias.
    const segment =
      !node.computed && node.property.type === AST_NODE_TYPES.PrivateIdentifier
        ? `#${node.property.name}`
        : propertyName(node);
    if (segment === null) return null;
    const base = pathKey(node.object);
    return base === null ? null : `${base}.${segment}`;
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
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let sourceCode: Readonly<TSESLint.SourceCode>;
    let byOwner: Map<HandleOwner, TSESTree.Node>;
    let byPath: Map<string, TSESTree.Node>;
    let unreachable: TSESTree.Node[];
    let revokedOwners: Set<HandleOwner>;
    let revokedPaths: Set<string>;
    /** Collections (by path) whose every member some loop or callback revokes. */
    let revokedCollections: Set<string>;
    /** Collections and property paths a handle was stored in, per handle. */
    let storedIn: Map<HandleOwner, Set<string>>;
    let parkedAt: Map<HandleOwner, Set<string>>;
    /** Functions defined here that revoke the argument at a given position. */
    let helperRevokes: Map<FunctionNode, Set<number>>;
    /** Every call with an argument, for the helper and setter routes. */
    let calls: TSESTree.CallExpression[];

    function remember(
      into: Map<HandleOwner, Set<string>>,
      owner: HandleOwner,
      key: string,
    ): void {
      const keys = into.get(owner) ?? new Set<string>();
      keys.add(key);
      into.set(owner, keys);
    }

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
        const variable = variableOf(arg, sourceCode);
        if (variable === null) return;
        // `const u = ref.current; URL.revokeObjectURL(u)` revokes the path.
        const def = variable.defs[0];
        if (
          variable.defs.length === 1 &&
          def.type === 'Variable' &&
          def.node.init != null &&
          variable.references.filter((ref) => ref.isWrite()).length === 1
        ) {
          const alias = pathKey(def.node.init);
          if (alias !== null) revokedPaths.add(alias);
        }
        // `for (const u of cache.values()) URL.revokeObjectURL(u)` revokes
        // every handle the collection holds.
        const range = rangesOver(variable);
        const collection =
          range === null ? null : pathKey(enumeratedCollection(range));
        if (collection !== null) revokedCollections.add(collection);
        // `function dispose(u) { URL.revokeObjectURL(u) }` revokes whatever
        // its callers pass.
        const parameter = parameterIndex(variable);
        if (parameter !== null) {
          const positions = helperRevokes.get(parameter.fn) ?? new Set();
          positions.add(parameter.index);
          helperRevokes.set(parameter.fn, positions);
        }
        return;
      }
      const key = pathKey(arg);
      if (key !== null) revokedPaths.add(key);
    }

    /** `cache.set(k, url)`, `list.push(url)`: the handle now lives in a collection. */
    function trackStore(node: TSESTree.CallExpression): void {
      if (
        node.callee.type !== AST_NODE_TYPES.MemberExpression ||
        !COLLECTION_ADDERS.has(propertyName(node.callee) as string)
      ) {
        return;
      }
      const collection = pathKey(node.callee.object);
      if (collection === null) return;
      for (const arg of node.arguments) {
        if (arg.type === AST_NODE_TYPES.Identifier) {
          remember(storedIn, ownerOf(arg, sourceCode), collection);
        }
      }
    }

    /** `ref.current = url`, `cache[k] = url`: the handle is parked somewhere. */
    function trackParking(node: TSESTree.AssignmentExpression): void {
      if (
        node.right.type !== AST_NODE_TYPES.Identifier ||
        node.left.type !== AST_NODE_TYPES.MemberExpression
      ) {
        return;
      }
      const owner = ownerOf(node.right, sourceCode);
      if (node.left.computed) {
        const collection = pathKey(node.left.object);
        if (collection !== null) remember(storedIn, owner, collection);
        return;
      }
      const path = pathKey(node.left);
      if (path !== null) remember(parkedAt, owner, path);
    }

    /**
     * Fold the routes that need the whole file into the revoked sets: a call
     * to a function that revokes its argument, and a state setter whose state
     * is revoked.
     */
    function resolveIndirectRevocations(): Map<HandleOwner, Set<HandleOwner>> {
      const setterStates = new Map<HandleOwner, Set<HandleOwner>>();
      for (const call of calls) {
        const fn = calledFunction(call, sourceCode);
        const positions = fn === null ? undefined : helperRevokes.get(fn);
        if (positions !== undefined) {
          for (const position of positions) {
            // `release()` with fewer arguments than the helper takes passes
            // nothing at this position.
            const arg = call.arguments[position] as TSESTree.Node | undefined;
            if (arg === undefined) continue;
            if (arg.type === AST_NODE_TYPES.Identifier) {
              revokedOwners.add(ownerOf(arg, sourceCode));
              continue;
            }
            const key = pathKey(arg);
            if (key !== null) revokedPaths.add(key);
          }
        }
        if (call.callee.type !== AST_NODE_TYPES.Identifier) continue;
        const setter = variableOf(call.callee, sourceCode);
        const state =
          setter === null ? null : stateOfSetter(setter, sourceCode);
        if (state === null) continue;
        for (const arg of call.arguments) {
          if (arg.type !== AST_NODE_TYPES.Identifier) continue;
          const owner = ownerOf(arg, sourceCode);
          const states = setterStates.get(owner) ?? new Set<HandleOwner>();
          states.add(state);
          setterStates.set(owner, states);
        }
      }
      return setterStates;
    }

    const anyIn = <T>(items: Iterable<T> | undefined, wanted: Set<T>) =>
      items !== undefined && [...items].some((item) => wanted.has(item));

    return {
      before() {
        const [options = {}] = currentOptions();
        const { allowInTests } = options as Required<Options>;
        const filename = context.filename;
        const isTestFile = isTestFilePath(filename);

        if (allowInTests && isTestFile) {
          return false;
        }

        sourceCode = context.sourceCode;

        /** Handles owned by a binding (or, for an implicit global, by its name). */
        byOwner = new Map<HandleOwner, TSESTree.Node>();
        /** Handles parked on a property path — `img.src`, `this.previewUrl`. */
        byPath = new Map<string, TSESTree.Node>();
        /** Handles nothing in this file can ever reach again. */
        unreachable = [];

        revokedOwners = new Set<HandleOwner>();
        revokedPaths = new Set<string>();
        revokedCollections = new Set<string>();
        storedIn = new Map();
        parkedAt = new Map();
        helperRevokes = new Map();
        calls = [];
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (isUrlMethod(node, 'createObjectURL')) trackCreation(node);
        if (isUrlMethod(node, 'revokeObjectURL')) trackRevocation(node);
        trackStore(node);
        if (node.arguments.length > 0) calls.push(node);
      },
      AssignmentExpression: trackParking,

      'Program:exit'() {
        const setterStates = resolveIndirectRevocations();
        for (const [owner, site] of byOwner) {
          const released =
            revokedOwners.has(owner) ||
            anyIn(storedIn.get(owner), revokedCollections) ||
            anyIn(parkedAt.get(owner), revokedPaths) ||
            anyIn(setterStates.get(owner), revokedOwners);
          if (!released) {
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
