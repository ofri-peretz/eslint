/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-dynamic-service-worker-url
 * Detects dynamic/untrusted URLs used for service worker registration
 * CWE-829: Inclusion of Functionality from Untrusted Control Sphere
 *
 * @see https://cwe.mitre.org/data/definitions/829.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isStaticExpression,
  MessageIcons,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'dynamicSwUrl';

/**
 * Names that denote the global object, for `window.navigator.serviceWorker`.
 * Exact membership against a closed set, never a substring test.
 */
const GLOBAL_RECEIVERS: ReadonlySet<string> = new Set([
  'window',
  'self',
  'globalThis',
]);

/** `navigator` / `window.navigator` / `self.navigator` / `globalThis.navigator`. */
function isNavigator(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name === 'navigator';
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    GLOBAL_RECEIVERS.has(node.object.name) &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'navigator'
  );
}

/**
 * Is this expression the `ServiceWorkerContainer`?
 *
 * `navigator.serviceWorker`, the global-qualified spellings, and the
 * destructured binding `const { serviceWorker } = navigator`. The receiver used
 * to be ignored entirely — `property.name === 'serviceWorker'` on ANY object —
 * so any object with a `serviceWorker` field was a registration surface.
 */
function isServiceWorkerContainer(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'serviceWorker'
  ) {
    return isNavigator(node.object);
  }
  if (node.type === AST_NODE_TYPES.Identifier) {
    return containerFromBinding(node, sourceCode);
  }
  return false;
}

/**
 * Resolve a name to the container through its **binding**.
 *
 * Covers `const sw = navigator.serviceWorker` and the destructured
 * `const { serviceWorker } = navigator`, which is how most registration helpers
 * are actually written. A re-assigned or multiply-declared binding is refused:
 * its value at the point of use is not knowable, and guessing is the defect this
 * package keeps re-learning.
 */
function containerFromBinding(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): boolean {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === node.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return false;
    if (variable.references.filter((ref) => ref.isWrite()).length > 1) {
      return false;
    }
    const def = variable.defs[0];
    if (def.type !== 'Variable') return false;
    const declarator = def.node;
    if (declarator.init == null) return false;
    if (declarator.id.type === AST_NODE_TYPES.Identifier) {
      return isServiceWorkerContainer(declarator.init, sourceCode);
    }
    if (declarator.id.type === AST_NODE_TYPES.ObjectPattern) {
      const picked = declarator.id.properties.some(
        (property) =>
          property.type === AST_NODE_TYPES.Property &&
          !property.computed &&
          property.key.type === AST_NODE_TYPES.Identifier &&
          property.key.name === 'serviceWorker' &&
          property.value.type === AST_NODE_TYPES.Identifier &&
          property.value.name === node.name,
      );
      return picked && isNavigator(declarator.init);
    }
    return false;
  }
  return false;
}

/**
 * `new URL('./sw.js', import.meta.url)` — the bundler idiom.
 *
 * Vite, webpack 5 and Parcel all rewrite this at build time into a hashed asset
 * path; it is the spelling their documentation prescribes for registering a
 * service worker, and it is as static as a string literal. The rule reported it,
 * so the *recommended* way to register a worker was the one thing it flagged.
 *
 * The BASE matters as much as the path: `new URL('./sw.js', remote.origin)`
 * resolves against an attacker-chosen origin and is exactly the vulnerability.
 * So a static first argument is necessary but not sufficient — the base must be
 * `import.meta.url` or itself static.
 */
function isStaticUrlConstruction(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (node.type !== AST_NODE_TYPES.NewExpression) return false;
  if (
    node.callee.type !== AST_NODE_TYPES.Identifier ||
    node.callee.name !== 'URL'
  ) {
    return false;
  }
  const [pathArg, baseArg] = node.arguments;
  if (pathArg === undefined) return false;
  if (!isStaticExpression({ node: pathArg, scope })) return false;
  if (baseArg === undefined) return true;
  // `import.meta.url` is the module's own location — the bundler's anchor.
  if (
    baseArg.type === AST_NODE_TYPES.MemberExpression &&
    !baseArg.computed &&
    baseArg.property.type === AST_NODE_TYPES.Identifier &&
    baseArg.property.name === 'url' &&
    baseArg.object.type === AST_NODE_TYPES.MetaProperty
  ) {
    return true;
  }
  return isStaticExpression({ node: baseArg, scope });
}

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noDynamicServiceWorkerUrl = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-service-worker-url',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-dynamic-service-worker-url.md',
      description: 'Disallow dynamic URLs in service worker registration',
      cwe: 'CWE-829',
      cvss: 8.1,
    },
    messages: {
      dynamicSwUrl: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic Service Worker URL',
        cwe: 'CWE-829',
        owasp: 'A08:2021',
        cvss: 8.1,
        description:
          'Using dynamic URL for service worker registration. A compromised URL could give attacker persistent control over the page.',
        severity: 'HIGH',
        fix: 'Use a static, hardcoded path for service worker registration.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register',
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

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          // `navigator.serviceWorker['register'](u)` registers the same worker.
          propertyName(node.callee) !== 'register'
        ) {
          return;
        }
        if (!isServiceWorkerContainer(node.callee.object, context.sourceCode)) {
          return;
        }

        const urlArg = node.arguments[0];
        if (!urlArg) return;

        // "Not a string Literal" was the whole test, so THREE static spellings
        // were reported as attacker-controlled: a folded `const SW_URL`, a
        // template literal with no expressions, and `new URL('./sw.js',
        // import.meta.url)` — the idiom every bundler's own docs prescribe.
        // `isStaticExpression` answers the real question ("can an attacker
        // influence this value") instead of the syntactic proxy.
        const scope = context.sourceCode.getScope(node);
        if (isStaticExpression({ node: urlArg, scope })) return;
        if (isStaticUrlConstruction(urlArg, scope)) return;

        context.report({
          node,
          messageId: 'dynamicSwUrl',
        });
      },
    };
  },
});
