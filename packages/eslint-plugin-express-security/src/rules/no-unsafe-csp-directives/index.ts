/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-csp-directives
 *
 * Detects Content-Security-Policy directives that hand back the protection
 * the header exists to provide:
 *   - `'unsafe-inline'` / `'unsafe-eval'` in a script-executing directive
 *   - a wildcard source (`*`, `data:`, `http:`, `https:`) in a script-executing
 *     directive
 *   - `frame-ancestors` set to `*` (clickjacking, CWE-1021)
 *   - `useDefaults: false` with no `frame-ancestors` at all — the directive has
 *     no fallback to `default-src`, so omitting it leaves framing wide open
 *   - `upgradeInsecureRequests: null` — helmet's documented way to drop the
 *     mixed-content upgrade (CWE-311)
 *
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 * OWASP A03:2021 – Injection
 *
 * ## Detection method: structural-pattern
 *
 * Fires on the AST shape of the helmet CSP config — directive keys and the
 * string literals inside their source arrays. Both the camelCase (`scriptSrc`)
 * and header (`script-src`) spellings are recognised. No variable name is ever
 * consulted; a source array built from an identifier is not analysed
 * (documented false negative, kept to avoid taint analysis).
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://cwe.mitre.org/data/definitions/1021.html
 * @see https://helmetjs.github.io/#content-security-policy
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'unsafeInlineSource'
  | 'wildcardSource'
  | 'permissiveFrameAncestors'
  | 'missingFrameAncestors'
  | 'mixedContentAllowed'
  | 'removeUnsafeSource';

export interface Options {
  /**
   * Also check style-executing directives (`style-src`, `style-src-elem`).
   * Default: true.
   */
  checkStyleSrc?: boolean;
}

type RuleOptions = [Options?];

/** camelCase or header spelling → canonical header spelling. */
function canonicalDirective(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/** Directives whose sources can execute script. */
const SCRIPT_DIRECTIVES = new Set([
  'default-src',
  'script-src',
  'script-src-elem',
  'script-src-attr',
  'object-src',
  'worker-src',
]);

/** Directives whose sources can inject presentation-layer attacks. */
const STYLE_DIRECTIVES = new Set(['style-src', 'style-src-elem', 'style-src-attr']);

/** Sources that defeat the directive they appear in. */
const UNSAFE_KEYWORDS = new Set(["'unsafe-inline'", "'unsafe-eval'"]);
const WILDCARD_SOURCES = new Set(['*', 'data:', 'http:', 'https:', 'http://*', 'https://*']);

function propertyKeyName(prop: TSESTree.Property): string | null {
  if (prop.computed) return null;
  if (prop.key.type === AST_NODE_TYPES.Identifier) return prop.key.name;
  if (
    prop.key.type === AST_NODE_TYPES.Literal &&
    typeof prop.key.value === 'string'
  ) {
    return prop.key.value;
  }
  return null;
}

/** `helmet.contentSecurityPolicy(...)` */
function isCspFactory(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
  if (callee.computed) return false;
  if (callee.object.type !== AST_NODE_TYPES.Identifier) return false;
  return (
    callee.object.name === 'helmet' &&
    callee.property.name === 'contentSecurityPolicy'
  );
}

/** `helmet(...)` */
function isHelmetCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'helmet'
  );
}

export const noUnsafeCspDirectives = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-csp-directives',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-unsafe-csp-directives.md',
      description:
        "Disallow Content-Security-Policy directives that permit 'unsafe-inline', 'unsafe-eval', wildcard sources, or unrestricted framing",
      cwe: 'CWE-79',
      cvss: 6.5,
      confidence: 'high',
    },
    messages: {
      unsafeInlineSource: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'CSP Allows Unsafe Script Execution (CWE-79)',
        cwe: 'CWE-79',
        cvss: 6.5,
        description:
          "{{directive}} includes {{source}}, which re-enables exactly the script execution CSP is there to block — an injected <script> or eval() runs normally.",
        severity: 'HIGH',
        // oxlint-disable-next-line no-template-curly-in-string
        fix: "Remove {{source}} and use a per-response nonce or hash source instead: scriptSrc: [\"'self'\", (req, res) => `'nonce-${res.locals.nonce}'`].",
        documentationLink: 'https://cwe.mitre.org/data/definitions/79.html',
      }),
      wildcardSource: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'CSP Wildcard Source (CWE-79)',
        cwe: 'CWE-79',
        description:
          '{{directive}} includes the wildcard source {{source}}, so script can be loaded from any host — the directive stops constraining anything.',
        severity: 'HIGH',
        fix: 'List the exact origins the app loads code from instead of a wildcard scheme or host.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/79.html',
      }),
      permissiveFrameAncestors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'CSP Permits Framing By Any Origin (CWE-1021)',
        cwe: 'CWE-1021',
        description:
          "frame-ancestors is set to {{source}}, so any site can embed this app in an iframe and drive clicks through it (clickjacking).",
        severity: 'MEDIUM',
        fix: "Set frameAncestors: [\"'self'\"] — or name the exact origins allowed to frame the app.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/1021.html',
      }),
      missingFrameAncestors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'CSP Without frame-ancestors (CWE-1021)',
        cwe: 'CWE-1021',
        description:
          'useDefaults is false and no frame-ancestors directive is set. frame-ancestors does NOT fall back to default-src, so this policy places no limit on who may frame the app.',
        severity: 'MEDIUM',
        fix: "Add frameAncestors: [\"'self'\"] to the directives object, or drop `useDefaults: false` and keep helmet's defaults.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/1021.html',
      }),
      mixedContentAllowed: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'CSP Mixed-Content Upgrade Removed (CWE-311)',
        cwe: 'CWE-311',
        description:
          'upgradeInsecureRequests is set to null, which removes the directive from the policy. Sub-resources referenced over http:// are then fetched in cleartext from an https:// page.',
        severity: 'MEDIUM',
        fix: 'Delete the `upgradeInsecureRequests: null` entry so the directive stays in the policy.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/311.html',
      }),
      removeUnsafeSource: 'Remove {{source}} from {{directive}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkStyleSrc: {
            type: 'boolean',
            description:
              'Also report unsafe sources in style-executing directives',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    const { checkStyleSrc } = options as Options;
    const withStyle = checkStyleSrc ?? true;

    /** Removes one source string (and its comma) from a directive array. */
    function removeElement(
      fixer: TSESLint.RuleFixer,
      element: TSESTree.Node,
    ): TSESLint.RuleFix {
      const sourceCode = context.sourceCode;
      const after = sourceCode.getTokenAfter(element);
      if (after && after.value === ',') {
        return fixer.removeRange([element.range[0], after.range[1]]);
      }
      const before = sourceCode.getTokenBefore(element);
      if (before && before.value === ',') {
        return fixer.removeRange([before.range[0], element.range[1]]);
      }
      return fixer.remove(element);
    }

    function reportSource(
      element: TSESTree.Node,
      messageId: 'unsafeInlineSource' | 'wildcardSource',
      directive: string,
      source: string,
    ): void {
      context.report({
        node: element,
        messageId,
        data: { directive, source },
        suggest: [
          {
            messageId: 'removeUnsafeSource',
            data: { directive, source },
            fix: (fixer: TSESLint.RuleFixer) => removeElement(fixer, element),
          },
        ],
      });
    }

    /** Check the source list of one directive. */
    function checkSources(directive: string, value: TSESTree.Node): void {
      if (value.type !== AST_NODE_TYPES.ArrayExpression) return;

      const isScript = SCRIPT_DIRECTIVES.has(directive);
      const isStyle = withStyle && STYLE_DIRECTIVES.has(directive);
      const isFrameAncestors = directive === 'frame-ancestors';
      if (!isScript && !isStyle && !isFrameAncestors) return;

      for (const element of value.elements) {
        if (!element) continue;
        if (element.type !== AST_NODE_TYPES.Literal) continue;
        if (typeof element.value !== 'string') continue;
        const source = element.value;

        if (isFrameAncestors) {
          if (source === '*') {
            context.report({
              node: element,
              messageId: 'permissiveFrameAncestors',
              data: { source: "'*'" },
            });
          }
          continue;
        }

        if (UNSAFE_KEYWORDS.has(source)) {
          reportSource(element, 'unsafeInlineSource', directive, source);
          continue;
        }
        if (WILDCARD_SOURCES.has(source)) {
          reportSource(element, 'wildcardSource', directive, `'${source}'`);
        }
      }
    }

    /** Check a `directives: { ... }` object. */
    function checkDirectives(
      directives: TSESTree.ObjectExpression,
      useDefaultsDisabled: boolean,
    ): void {
      let sawFrameAncestors = false;

      for (const prop of directives.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;
        const name = propertyKeyName(prop);
        if (!name) continue;
        const directive = canonicalDirective(name);

        if (directive === 'frame-ancestors') {
          sawFrameAncestors = true;
        }
        if (
          directive === 'upgrade-insecure-requests' &&
          prop.value.type === AST_NODE_TYPES.Literal &&
          prop.value.value === null
        ) {
          context.report({ node: prop, messageId: 'mixedContentAllowed' });
          continue;
        }
        checkSources(directive, prop.value);
      }

      if (useDefaultsDisabled && !sawFrameAncestors) {
        context.report({ node: directives, messageId: 'missingFrameAncestors' });
      }
    }

    /** Check a CSP config object: { useDefaults, directives }. */
    function checkCspConfig(config: TSESTree.Node): void {
      if (config.type !== AST_NODE_TYPES.ObjectExpression) return;

      let directives: TSESTree.ObjectExpression | null = null;
      let useDefaultsDisabled = false;

      for (const prop of config.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;
        const name = propertyKeyName(prop);
        if (name === 'directives') {
          if (prop.value.type === AST_NODE_TYPES.ObjectExpression) {
            directives = prop.value;
          }
          continue;
        }
        if (
          name === 'useDefaults' &&
          prop.value.type === AST_NODE_TYPES.Literal &&
          prop.value.value === false
        ) {
          useDefaultsDisabled = true;
        }
      }

      if (directives) {
        checkDirectives(directives, useDefaultsDisabled);
      }
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isCspFactory(node)) {
          const config = node.arguments[0];
          if (config) checkCspConfig(config);
          return;
        }

        if (!isHelmetCall(node)) return;
        const config = node.arguments[0];
        if (!config || config.type !== AST_NODE_TYPES.ObjectExpression) return;

        for (const prop of config.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          if (propertyKeyName(prop) !== 'contentSecurityPolicy') continue;
          checkCspConfig(prop.value);
        }
      },
    };
  },
});
