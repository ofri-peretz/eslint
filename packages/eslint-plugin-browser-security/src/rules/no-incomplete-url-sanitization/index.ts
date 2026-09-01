/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-incomplete-url-sanitization
 * CWE-020: Improper Input Validation
 *
 * Two URL checks that read as security decisions but cannot make one:
 *
 * 1. **A substring test standing in for a host check.**
 *    `url.includes('trusted.com')` is true for `https://evil.io/?r=trusted.com`
 *    and for `https://trusted.com.evil.io/`. The host of a URL lives in exactly
 *    one place — the authority component — and the only way to read it is to
 *    parse the URL. `indexOf(…) !== -1` and `lastIndexOf(…) !== -1` are the same
 *    test spelled differently; `lastIndexOf` in particular is often written
 *    *intending* a suffix check, which it only becomes when compared against
 *    `length - needle.length`.
 *
 * 2. **A dangerous-scheme denylist that stops at `javascript:`.**
 *    A sanitiser that rejects `javascript:` and returns everything else still
 *    hands `data:text/html;base64,…` — which executes script in `href` on every
 *    current browser — straight to the sink. The rule only speaks up when
 *    `javascript:` is explicitly denied and `data:` is never mentioned: a lone
 *    `data:` test is nearly always feature detection ("is this an inline
 *    image?"), not sanitisation, and flagging it would be noise.
 *
 * @see https://cwe.mitre.org/data/definitions/20.html
 * @see https://cwe.mitre.org/data/definitions/601.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import { isAttackerSteerableUrl } from '../../utils/url-taint';

type MessageIds = 'substringHostCheck' | 'incompleteSchemeDenylist';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {
  /**
   * Substrings that say the value under test is a URL, host or origin, matched
   * case-insensitively. REPLACES the default.
   *
   * This is one of TWO independent kinds of evidence — the other is taint
   * analysis — so the list widens recall rather than deciding alone. That is
   * exactly why it has to be replaceable: a project whose URL variable is
   * `endereco` or `adresse` gets nothing from the English default and has no
   * way to ask for it, while a `linkedList` gets flagged for containing
   * `link`.
   *
   * @example
   * ```json
   * "browser-security/no-incomplete-url-sanitization": [
   *   "error",
   *   { "urlNameWords": ["url", "endereco", "enlace"] }
   * ]
   * ```
   */
  urlNameWords?: string[];
}

type RuleOptions = [Options?];

/**
 * Top-level labels a host literal may end with.
 *
 * Deliberately a closed list rather than "two-or-more dot-separated labels":
 * `package.json`, `index.html` and `bundle.min.js` all satisfy the shape test,
 * and `manifest.includes('package.json')` is not a security decision about a
 * host. Extensions that double as real TLDs (`.sh`, `.so`, `.it`, `.is`) are
 * left out for the same reason — the recall they buy is not worth the noise.
 */
const HOST_TLDS: ReadonlySet<string> = new Set([
  'com',
  'net',
  'org',
  'io',
  'dev',
  'co',
  'app',
  'ai',
  'edu',
  'gov',
  'mil',
  'info',
  'biz',
  'me',
  'us',
  'uk',
  'ca',
  'de',
  'fr',
  'jp',
  'cn',
  'au',
  'eu',
  'xyz',
  'cloud',
  'tv',
  'online',
  'site',
  'store',
  'link',
  'tech',
  'local',
]);

/**
 * Is this string literal a bare host or origin — `trusted.com`,
 * `.trusted.com`, `https://app.example.com`, `example.com:8443`?
 *
 * Anything carrying a path, query, fragment or credentials is rejected: those
 * are prefix checks, a different (and differently-bypassed) shape.
 */
function isHostLikeLiteral(raw: string): boolean {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^https?:/, '');
  value = value.replace(/^\/\//, '');
  value = value.replace(/^\./, '');
  const withoutPort = value.replace(/:\d{1,5}$/, '');
  if (/[/?#@\s:]/.test(withoutPort)) return false;
  const labels = withoutPort.split('.');
  if (labels.length < 2) return false;
  if (!labels.every((label) => /^[a-z0-9-]+$/.test(label))) return false;
  return HOST_TLDS.has(labels[labels.length - 1]);
}

/**
 * Method calls that reshape a string without changing what it names, so the
 * receiver's identity survives them: `String(host).trim().toLowerCase()`.
 */
/**
 * @vocabulary These are `String.prototype` methods, defined by ECMAScript, and
 * the TLDs above are IANA's. Neither is a name a consumer picked, so neither
 * is behind an option — unlike `urlNamePatterns`, which is our guess at what
 * they call their own variables.
 *
 * @see https://tc39.es/ecma262/#sec-properties-of-the-string-prototype-object
 * @see https://data.iana.org/TLD/tlds-alpha-by-domain.txt
 */
const PASSTHROUGH_METHODS: ReadonlySet<string> = new Set([
  'trim',
  'trimStart',
  'trimEnd',
  'toLowerCase',
  'toUpperCase',
  'toString',
  'normalize',
  'valueOf',
]);

/**
 * Names that say the value under test is a URL, host or origin.
 *
 * A guess at somebody else's vocabulary, and replaceable for that reason —
 * see the `urlNamePatterns` option. Not a `@vocabulary` case: nothing
 * publishes these, we picked them.
 */
const DEFAULT_URL_NAME_WORDS = [
  'url',
  'uri',
  'href',
  'host',
  'origin',
  'domain',
  // Both spellings, because these are SUBSTRINGS now and not a regex. The
  // option used to compile consumer-supplied sources with `new RegExp(...)`,
  // which the rule-audit ratchet flagged as `dynamic-regexp` — a security
  // plugin building a regex out of config is the shape these very plugins
  // report in other people's code. Substring matching removes it, and
  // "the name contains one of these words" is a clearer contract anyway.
  'referer',
  'referrer',
  'endpoint',
  'link',
];

/**
 * The name the receiver is known by, read off the AST — never off printed
 * source. `req.headers.host` answers `host`, `new URL(x).hostname` answers
 * `hostname`, `String(raw).toLowerCase()` answers whatever `raw` answers.
 */
function receiverName(node: TSESTree.Node): string | null {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression') {
    // `url['hostname']` names the same field `url.hostname` does.
    return propertyName(node);
  }
  if (node.type !== 'CallExpression') {
    return null;
  }
  const callee = node.callee;
  if (
    callee.type === 'MemberExpression' &&
    // `raw['toLowerCase']()` answers whatever `raw.toLowerCase()` answers.
    PASSTHROUGH_METHODS.has(propertyName(callee) ?? '')
  ) {
    return receiverName(callee.object);
  }
  if (
    callee.type === 'Identifier' &&
    callee.name === 'String' &&
    node.arguments.length > 0
  ) {
    return receiverName(node.arguments[0]);
  }
  return null;
}

/**
 * Does this expression hold a URL/host at all?
 *
 * Two independent kinds of evidence, either of which is enough: the binding is
 * *named* for one, or taint analysis says an attacker chose it. Requiring both
 * would drop `location.hash`; requiring neither would flag
 * `changelog.includes('example.com')`.
 */
function isUrlBearingReceiver(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  urlNameTest: (name: string) => boolean,
): boolean {
  const name = receiverName(node);
  if (name !== null && urlNameTest(name)) return true;
  return isAttackerSteerableUrl(node, sourceCode);
}

/** The numeric value of `0`, `-1`, … as written. */
function literalNumber(node: TSESTree.Node): number | null {
  if (node.type === 'Literal' && typeof node.value === 'number') {
    return node.value;
  }
  if (
    node.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument.type === 'Literal' &&
    typeof node.argument.value === 'number'
  ) {
    return -node.argument.value;
  }
  return null;
}

/** Comparison operators as seen from the other operand. */
const FLIPPED: Readonly<Record<string, string>> = {
  '>': '<',
  '<': '>',
  '>=': '<=',
  '<=': '>=',
};

/**
 * Is `indexOf(…)`'s result being read as "the needle is in there somewhere"?
 *
 * `!== -1`, `> -1` and `>= 0` all mean containment. `=== host.length - n.length`
 * is a genuine suffix check and `=== 0` a genuine prefix check — neither is
 * this bug, and both must survive.
 */
function isContainmentComparison(call: TSESTree.CallExpression): boolean {
  const parent = call.parent;
  if (parent.type !== 'BinaryExpression') return false;

  const callIsLeft = parent.left === call;
  const bound = literalNumber(callIsLeft ? parent.right : parent.left);
  if (bound === null) return false;

  const operator = callIsLeft
    ? parent.operator
    : (FLIPPED[parent.operator] ?? parent.operator);

  if ((operator === '!==' || operator === '!=') && bound === -1) return true;
  if (operator === '>' && bound === -1) return true;
  return operator === '>=' && bound === 0;
}

/**
 * Positions in which a boolean is a decision rather than a datum.
 *
 * A predicate's `return`, an `if`/ternary test, a `!`, an `&&`/`||` operand, an
 * expression-bodied arrow, or a `const ok = …`. A boolean handed to a function
 * or stored on an object is not evidence that anything branches on it.
 */
function isGuardPosition(node: TSESTree.Node): boolean {
  const parent = node.parent as TSESTree.Node;
  switch (parent.type) {
    case 'IfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'LogicalExpression':
    case 'ReturnStatement':
    case 'VariableDeclarator':
    // An expression can only be an arrow's body; its parameters are patterns.
    case 'ArrowFunctionExpression':
      return true;
    case 'ConditionalExpression':
    case 'ForStatement':
      return parent.test === node;
    case 'UnaryExpression':
      return parent.operator === '!';
    default:
      return false;
  }
}

/** URL schemes that execute script when navigated to. */
const SCRIPTABLE_SCHEMES = ['javascript:', 'data:', 'vbscript:'] as const;
type ScriptableScheme = (typeof SCRIPTABLE_SCHEMES)[number];

/** Which scriptable scheme, if any, does this literal text name? */
function schemeOf(text: string): ScriptableScheme | null {
  const value = text.trim().toLowerCase();
  return SCRIPTABLE_SCHEMES.find((scheme) => value.startsWith(scheme)) ?? null;
}

/** Same question for a regexp literal's pattern, read from `node.regex`. */
function schemeOfPattern(pattern: string): ScriptableScheme | null {
  const value = pattern.toLowerCase().replace(/\\/g, '');
  return SCRIPTABLE_SCHEMES.find((scheme) => value.includes(scheme)) ?? null;
}

/** Methods whose first argument is the thing being looked for. */
const NEEDLE_METHODS: ReadonlySet<string> = new Set([
  'startsWith',
  'endsWith',
  'includes',
  'indexOf',
  'lastIndexOf',
  'search',
  'match',
]);

/** The function (or module) a node makes its decision inside. */
function enclosingScopeNode(node: TSESTree.Node): TSESTree.Node {
  let current: TSESTree.Node = node;
  while (
    current.type !== 'FunctionDeclaration' &&
    current.type !== 'FunctionExpression' &&
    current.type !== 'ArrowFunctionExpression' &&
    current.type !== 'Program'
  ) {
    current = current.parent;
  }
  return current;
}

export const noIncompleteUrlSanitization = createRule<RuleOptions, MessageIds>({
  name: 'no-incomplete-url-sanitization',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-incomplete-url-sanitization.md',
      description:
        'Disallow URL substring tests and partial scheme denylists as security decisions',
      cwe: 'CWE-020',
      cvss: 7.5,
    },
    messages: {
      substringHostCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'URL substring check used as a host allowlist',
        cwe: 'CWE-020',
        description:
          'A substring test cannot decide the host of a URL — "https://evil.io/?r=trusted.com" and "https://trusted.com.evil.io/" both contain the string.',
        severity: 'HIGH',
        fix: "Parse the URL and compare the host: const { hostname } = new URL(url); hostname === 'trusted.com' || hostname.endsWith('.trusted.com')",
        documentationLink: 'https://cwe.mitre.org/data/definitions/20.html',
      }),
      incompleteSchemeDenylist: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Incomplete URL scheme denylist',
        cwe: 'CWE-020',
        description:
          'Only "javascript:" is denied, so "data:text/html;base64,…" still reaches the sink and still executes script.',
        severity: 'HIGH',
        fix: "Allowlist instead of denylist: ['http:', 'https:'].includes(new URL(raw, location.origin).protocol)",
        documentationLink: 'https://cwe.mitre.org/data/definitions/20.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          urlNameWords: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_URL_NAME_WORDS],
            description:
              'Substrings that say a value is a URL, host or origin, matched case-insensitively. Replaces the default.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const sourceCode = context.sourceCode;
    const urlNameWords = (
      context.options[0]?.urlNameWords ?? DEFAULT_URL_NAME_WORDS
    ).map((word) => word.toLowerCase());
    const urlNameTest = (name: string): boolean => {
      const lower = name.toLowerCase();
      return urlNameWords.some((word) => lower.includes(word));
    };

    /** Per enclosing function: which scriptable schemes it tests, and where. */
    const schemeTests = new Map<
      TSESTree.Node,
      { tested: Set<ScriptableScheme>; firstJavascript: TSESTree.Node | null }
    >();

    /**
     * Record a scheme test. `at` is the node the *decision* is made on, which
     * for `indexOf` is the comparison rather than the call.
     */
    function collectSchemeTest(at: TSESTree.Node, needle: TSESTree.Node) {
      if (!isGuardPosition(at)) return;
      if (needle.type !== 'Literal') return;

      const scheme =
        typeof needle.value === 'string'
          ? schemeOf(needle.value)
          : 'regex' in needle
            ? schemeOfPattern(needle.regex.pattern)
            : null;
      if (scheme === null) return;

      const scope = enclosingScopeNode(at);
      let entry = schemeTests.get(scope);
      if (entry === undefined) {
        entry = { tested: new Set(), firstJavascript: null };
        schemeTests.set(scope, entry);
      }
      entry.tested.add(scheme);
      if (scheme === 'javascript:' && entry.firstJavascript === null) {
        entry.firstJavascript = at;
      }
    }

    function checkSubstringHostCheck(
      node: TSESTree.CallExpression,
      method: string,
      receiver: TSESTree.Node,
    ) {
      if (
        method !== 'includes' &&
        method !== 'indexOf' &&
        method !== 'lastIndexOf'
      ) {
        return;
      }

      const needle = node.arguments[0];
      if (
        node.arguments.length !== 1 ||
        needle.type !== 'Literal' ||
        typeof needle.value !== 'string' ||
        !isHostLikeLiteral(needle.value)
      ) {
        return;
      }

      // `indexOf` only makes a containment claim once it is compared to -1/0.
      // Left uncompared, or compared for position, it is not this bug.
      if (method === 'includes') {
        if (!isGuardPosition(node)) return;
        if (!isUrlBearingReceiver(receiver, sourceCode, urlNameTest)) return;
        context.report({ node, messageId: 'substringHostCheck' });
        return;
      }

      if (!isContainmentComparison(node)) return;
      const decision = node.parent;
      if (!isGuardPosition(decision)) return;
      if (!isUrlBearingReceiver(receiver, sourceCode, urlNameTest)) return;
      context.report({ node: decision, messageId: 'substringHostCheck' });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;
        // `url['includes']('trusted.com')` is the same substring check.
        const method = propertyName(callee);
        if (method === null) return;

        if (node.arguments.length > 0) {
          checkSubstringHostCheck(node, method, callee.object);
        }

        // `href.startsWith('javascript:')`, `href.indexOf('javascript:') > -1`.
        if (NEEDLE_METHODS.has(method) && node.arguments.length > 0) {
          const at =
            method === 'indexOf' || method === 'lastIndexOf'
              ? node.parent
              : node;
          collectSchemeTest(at, node.arguments[0]);
        }

        // `/^javascript:/i.test(href)`
        if (method === 'test' && callee.object.type === 'Literal') {
          collectSchemeTest(node, callee.object);
        }
      },

      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '===' && node.operator !== '!==') return;
        const literal = node.left.type === 'Literal' ? node.left : node.right;
        collectSchemeTest(node, literal);
      },

      'Program:exit'() {
        for (const entry of schemeTests.values()) {
          if (entry.firstJavascript === null) continue;
          if (entry.tested.has('data:')) continue;
          context.report({
            node: entry.firstJavascript,
            messageId: 'incompleteSchemeDenylist',
          });
        }
      },
    };
  },
});
