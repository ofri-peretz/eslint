/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unescaped-url-parameter
 * CWE-79 / CWE-116: untrusted text interpolated into a URL without encoding.
 *
 * ## What this rule was, and why it was wrong in BOTH directions
 *
 * It decided everything from `sourceCode.getText()`. A node was "a URL" when
 * its printed source matched a `https?://` regex or a `url =` regex, and an
 * interpolation was "user input" when its printed source matched `\binput\b`,
 * `\bparam\b`, `\burl\b`, `\bnext\b` or `\bredirect\b`, case-insensitively.
 * Both directions failed, measurably:
 *
 * ```js
 * `…/items?price=${input.toFixed(2)}`   // reported — a NUMBER, `input` ⊂ the text
 * const PARAM = 'static'; `…?q=${PARAM}`// reported — a compile-time constant
 *
 * new URLSearchParams(location.search).get('q')  // MISSED
 * document.getElementById('q').value             // MISSED
 * export function search(q) { … }                // MISSED
 * ```
 *
 * Every genuinely attacker-controlled source was invisible while two provably
 * safe values were reported. That is the exact defect class CLAUDE.md opens
 * with, and it shipped to users.
 *
 * ## What it is now
 *
 * Two structural questions, both answered from the AST and from scope:
 *
 * 1. **Is this an encoding position?** `url-shape.ts` assembles the URL's
 *    static *value* from cooked quasis and string literals and records where
 *    each interpolation lands. Only holes in the path, query or fragment
 *    qualify — a hole in the authority chooses the host, which is an open
 *    redirect and belongs to `no-insecure-redirects` / `require-url-validation`.
 * 2. **Is the value untrusted?** `untrusted-text.ts` proves it: a `location`
 *    read, a `URLSearchParams`/`URL` container read, a `req.query`/`body`/
 *    `params` member, a DOM `value`/`textContent` on a resolved element, a
 *    `FormData` field, or a parameter of an EXPORTED function. Unknown calls
 *    stay opaque, which is what makes `encodeURIComponent(q)` and
 *    `input.toFixed(2)` clean without either being named.
 *
 * ## Partition
 *
 * | Sink | Owner |
 * |---|---|
 * | untrusted text in the path/query/fragment of a URL | **no-unescaped-url-parameter** |
 * | untrusted text choosing the scheme or host | `no-insecure-redirects`, `require-url-validation` |
 * | any write to a `Location`, `location.assign/replace`, `.redirect(x)` | `no-insecure-redirects` |
 * | `window.open(x)`, `router.push(x)` | `require-url-validation` |
 * | a credential embedded in the URL string | `no-password-in-url` |
 *
 * The `AssignmentExpression` visitor this rule used to carry — which matched
 * `objectName.includes('location')` — is gone: every `Location` write is
 * `no-insecure-redirects`', and duplicating it reported the same defect twice
 * under two CWEs.
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://cwe.mitre.org/data/definitions/116.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  compileUserPatterns,
  createRule,
  formatLLMMessage,
  MessageIcons,
  resolveModuleBinding,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import { carriesUntrustedText } from './untrusted-text';
import { isEncodingPosition, urlKind, urlShape } from './url-shape';

type MessageIds = 'unescapedUrlParameter';

export interface Options {
  /** Allow unescaped URL parameters in test files. Default: false */
  allowInTests?: boolean;

  /**
   * Modules whose exports produce already-encoded URL text. Resolved through
   * the import graph, so a value merely *named* `url` no longer qualifies.
   * Default: ['url', 'querystring']
   */
  trustedLibraries?: string[];

  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_TRUSTED_LIBRARIES: readonly string[] = ['url', 'querystring'];

/**
 * Calls that take a URL and do something with it.
 *
 * Only consulted for RELATIVE text (`/api/search?q=…`): a string starting with
 * a slash is a URL only in context, whereas `https://…` is one wherever it is
 * written. Without this the rule would have to report every path-shaped string
 * in a program.
 */
const URL_SINK_FUNCTIONS: ReadonlySet<string> = new Set(['fetch']);
const URL_SINK_CONSTRUCTORS: ReadonlySet<string> = new Set(['URL', 'Request']);
/** `xhr.open(method, url)` — the URL is the SECOND argument. */
const XHR_OPEN_URL_INDEX = 1;
/** JSX attributes whose value the browser resolves as a URL. */
const URL_ATTRIBUTES: ReadonlySet<string> = new Set([
  'href',
  'src',
  'action',
  'formAction',
  'poster',
]);
const HTTP_CLIENT_MODULES: ReadonlySet<string> = new Set(['axios', 'ky']);

export const noUnescapedUrlParameter = createRule<RuleOptions, MessageIds>({
  name: 'no-unescaped-url-parameter',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-unescaped-url-parameter.md',
      description: 'Detects unescaped URL parameters',
      cwe: 'CWE-79',
      cvss: 6.1,
    },
    messages: {
      unescapedUrlParameter: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unescaped URL Parameter',
        cwe: 'CWE-79',
        description: 'Unescaped URL parameter detected: {{parameter}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/79.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow unescaped URL parameters in test files',
          },
          trustedLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['url', 'querystring'],
            description:
              'Modules whose exports produce already-encoded URL text',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional safe patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      trustedLibraries: ['url', 'querystring'],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = false,
      trustedLibraries = DEFAULT_TRUSTED_LIBRARIES,
      ignorePatterns = [],
    } = options;

    const isTestFile = allowInTests && isTestFilePath(context.filename);
    if (isTestFile) return {};

    const sourceCode = context.sourceCode;
    const trusted: ReadonlySet<string> = new Set(trustedLibraries);
    // `compileUserPattern`, not a bare `new RegExp`. The try/catch that used to
    // sit here handled an INVALID pattern but not a pathological one: a user
    // ignorePattern like `(a+)+$` compiles fine and then stalls the whole lint
    // run on a long identifier. The devkit helper screens the shape first,
    // degrades to a substring match instead of throwing, and resets `lastIndex`
    // per call so a /g pattern cannot answer differently on its second use.
    const ignoreRegexes = compileUserPatterns(ignorePatterns, 'i');

    /**
     * Was this value produced by a module the user declared trusted?
     *
     * Resolved through the import graph with `resolveModuleBinding`. The
     * previous implementation lowercased the receiver's identifier and
     * substring-matched the library list against it, so `urlBuilder`,
     * `myUrls` and `curlOptions` all silenced the rule while a genuine
     * `import { format } from 'url'` under any local alias did not.
     */
    function isTrustedLibraryCall(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.CallExpression) return false;
      const binding = resolveModuleBinding(
        node.callee,
        sourceCode.getScope(node),
      );
      if (binding === undefined) return false;
      const module = binding.module.replace(/^node:/, '');
      return trusted.has(module);
    }

    /** `axios.get(url)` / `ky(url)` on a resolved module binding. */
    function isHttpClientCall(node: TSESTree.CallExpression): boolean {
      const binding = resolveModuleBinding(
        node.callee,
        sourceCode.getScope(node),
      );
      return binding !== undefined && HTTP_CLIENT_MODULES.has(binding.module);
    }

    /** Is `name` the environment's global rather than a local binding? */
    function isUnshadowedGlobal(
      node: TSESTree.Node,
      names: ReadonlySet<string>,
    ): boolean {
      if (node.type !== AST_NODE_TYPES.Identifier || !names.has(node.name)) {
        return false;
      }
      for (
        let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
        scope !== null;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === node.name);
        if (variable !== undefined) return variable.defs.length === 0;
      }
      return true;
    }

    /** Does `node` sit directly in a position the browser reads as a URL? */
    function isUrlSinkPosition(node: TSESTree.Node): boolean {
      const parent = node.parent;

      if (parent?.type === AST_NODE_TYPES.JSXExpressionContainer) {
        const attribute = parent.parent;
        return (
          attribute?.type === AST_NODE_TYPES.JSXAttribute &&
          attribute.name.type === AST_NODE_TYPES.JSXIdentifier &&
          URL_ATTRIBUTES.has(attribute.name.name)
        );
      }

      if (parent?.type === AST_NODE_TYPES.NewExpression) {
        return (
          parent.arguments[0] === node &&
          isUnshadowedGlobal(parent.callee, URL_SINK_CONSTRUCTORS)
        );
      }

      if (parent?.type !== AST_NODE_TYPES.CallExpression) return false;
      if (
        parent.arguments[0] === node &&
        isUnshadowedGlobal(parent.callee, URL_SINK_FUNCTIONS)
      ) {
        return true;
      }
      if (parent.arguments[0] === node && isHttpClientCall(parent)) return true;
      // `xhr.open('GET', url)`
      return (
        parent.arguments[XHR_OPEN_URL_INDEX] === node &&
        parent.callee.type === AST_NODE_TYPES.MemberExpression &&
        !parent.callee.computed &&
        parent.callee.property.type === AST_NODE_TYPES.Identifier &&
        parent.callee.property.name === 'open'
      );
    }

    /**
     * `const url = `/api?q=${q}`; fetch(url);` — one hop, resolved through
     * scope. The URL text and the sink are almost never on the same line in
     * real code, and a rule that only understood the inline form would miss
     * the shape people actually write.
     */
    function reachesUrlSink(node: TSESTree.Node): boolean {
      if (isUrlSinkPosition(node)) return true;
      const declarator = node.parent;
      if (
        declarator?.type !== AST_NODE_TYPES.VariableDeclarator ||
        declarator.init !== node ||
        declarator.id.type !== AST_NODE_TYPES.Identifier
      ) {
        return false;
      }
      return sourceCode.getDeclaredVariables(declarator).some(
        (variable) =>
          // The initialiser is itself a write; a second one means the value
          // that reaches the sink is no longer the URL this template built.
          variable.references.filter((r) => r.isWrite()).length === 1 &&
          variable.references.some(
            (reference) =>
              !reference.isWrite() && isUrlSinkPosition(reference.identifier),
          ),
      );
    }

    /**
     * Every `+` chain is analysed once, from its outermost node.
     *
     * `parent` is asserted rather than tested: only `Program` has none, and a
     * template or a `+` is never the root. A runtime guard here would be a
     * branch no input can reach.
     */
    function isInnerConcatenation(node: TSESTree.Node): boolean {
      const parent = node.parent as TSESTree.Node;
      return (
        parent.type === AST_NODE_TYPES.BinaryExpression &&
        parent.operator === '+'
      );
    }

    function check(node: TSESTree.Node): void {
      const shape = urlShape(node, sourceCode);
      const kind = urlKind(shape.text);
      if (kind === null) return;
      if (kind === 'relative' && !reachesUrlSink(node)) return;

      for (const hole of shape.holes) {
        if (!isEncodingPosition(shape, hole)) continue;
        if (isTrustedLibraryCall(hole.expression)) continue;
        const text = sourceCode.getText(hole.expression);
        if (ignoreRegexes.some((regex) => regex.test(text))) continue;
        if (!carriesUntrustedText(hole.expression, sourceCode)) continue;

        context.report({
          node: hole.expression,
          messageId: 'unescapedUrlParameter',
          data: {
            parameter: text,
            safeAlternative: `Wrap it: encodeURIComponent(${text}) — or build the query with URLSearchParams.`,
          },
        });
      }
    }

    return {
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // A template inside a `+` chain is analysed as part of that chain, so
        // its holes are not offered twice.
        if (isInnerConcatenation(node)) return;
        // A tagged template is whatever the tag makes of it; `sql`…`` and
        // `css`…`` are not URLs, and the tag function is opaque.
        const parent = node.parent as TSESTree.Node;
        if (parent.type === AST_NODE_TYPES.TaggedTemplateExpression) {
          return;
        }
        check(node);
      },
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '+') return;
        if (isInnerConcatenation(node)) return;
        check(node);
      },
    };
  },
});
