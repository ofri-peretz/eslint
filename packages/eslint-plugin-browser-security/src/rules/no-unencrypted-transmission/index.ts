/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unencrypted-transmission
 * Detects unencrypted data transmission (HTTP vs HTTPS, plain text protocols)
 * CWE-319: Cleartext Transmission of Sensitive Information
 *
 * @see https://cwe.mitre.org/data/definitions/319.html
 * @see https://owasp.org/www-community/vulnerabilities/Insecure_Transport
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { isNonTransmittingUrl } from '../../utils/loopback-hosts';
import {
  AST_NODE_TYPES,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'unencryptedTransmission' | 'useHttps';

export interface Options {
  /** Allow unencrypted transmission in test files. Default: false */
  allowInTests?: boolean;

  /** Insecure protocol patterns. Default: ['http://', 'ws://', 'ftp://', 'tcp://', 'mongodb://', 'redis://', 'mysql://'] */
  insecureProtocols?: string[];

  /** Secure protocol alternatives mapping. Default: { 'http://': 'https://', 'ws://': 'wss://', ... } */
  secureAlternatives?: Record<string, string>;

  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Default insecure protocol patterns.
 *
 * ## Rule partition — cleartext transport (CWE-319 / CWE-311)
 *
 * **This rule owns the NON-WEB cleartext protocols** — `ftp:` `tcp:`
 * `mongodb:` `redis:` `mysql:`. Nothing else in this package detects them, and
 * a `mongodb://user:pass@host` connection string is a materially different
 * finding from a cleartext page asset: it usually carries credentials, and it
 * survives being copied to staging with only the host swapped.
 *
 * `http://` and `ws://` were removed from these defaults. They were never this
 * rule's to report:
 *
 * - `http://` is owned by `require-https-only` (a `fetch`/`axios` URL
 *   argument), `detect-mixed-content` (a subresource position) and
 *   `no-http-urls` (everything else). All three carry richer messages — the
 *   URL itself, compliance tags, an `allowedHosts` escape hatch — while this
 *   rule said only "using insecure protocol http://".
 * - `ws://` is owned by `require-websocket-wss` (the `new WebSocket(…)`
 *   argument, where it ships an autofix) and `no-insecure-websocket`.
 *
 * Measured before the change: `const API_BASE = "http://api.acme-corp.io"` drew
 * three reports, `fetch("http://api.acme-corp.io")` drew four, and
 * `new WebSocket("ws://live.acme-corp.io")` drew three. This rule was one of
 * the duplicates in all three, and contributed no fact the owner did not
 * already state.
 *
 * A project that genuinely wants the second opinion can still ask for it:
 * `insecureProtocols` is user-configurable, and listing `'http://'` there opts
 * back into the doubling deliberately rather than by default.
 *
 * `SECURE_ALTERNATIVES` deliberately keeps its `http://` and `ws://` entries so
 * that an explicit opt-in still gets the right remediation and autofix.
 */
const DEFAULT_INSECURE_PROTOCOLS = [
  'ftp://',
  'tcp://',
  'mongodb://',
  'redis://',
  'mysql://',
];

/**
 * Secure protocol alternatives
 */
const SECURE_ALTERNATIVES: Record<string, string> = {
  'http://': 'https://',
  'ws://': 'wss://',
  'ftp://': 'ftps://',
  'tcp://': 'tls://',
  'mongodb://': 'mongodb+srv://',
  'redis://': 'rediss://',
  'mysql://': 'mysqls://',
};

/**
 * Check if a string contains insecure protocol
 */
function containsInsecureProtocol(
  value: string,
  insecureProtocols: string[],
): { isInsecure: boolean; protocol: string } {
  // Leading whitespace only — the scheme must START the value.
  //
  // The test used to be `value.includes(protocol)`, which matches the scheme
  // ANYWHERE, so any sentence that mentions one reported:
  //
  //   'Connection strings must not use redis:// or mysql://; use TLS variants.'
  //
  // That is a string explaining the rule, reported BY the rule. Found by the
  // corpus. A URL's scheme is at position 0 by definition, and every sibling in
  // this family already anchored (`/^http:\/\//i`, `startsWith('ws://')`) — this
  // rule was the only one that did not, so the family disagreed about what
  // counts as a URL.
  const lowerValue = value.toLowerCase().trimStart();

  for (const protocol of insecureProtocols) {
    const lowerProtocol = protocol.toLowerCase();
    if (lowerValue.startsWith(lowerProtocol)) {
      // A "the secure variant appears somewhere in the string, so skip it"
      // check used to sit here. It was compensating for the unanchored match
      // above — it is what let `'see http:// vs https:// docs'` through. With
      // the scheme anchored, that string no longer matches at all, and the
      // check had become a pure FALSE NEGATIVE generator:
      //
      //   'http://evil.acme-corp.io/?next=https://ok.acme-corp.io'
      //
      // starts with a cleartext scheme, mentions `https://` in its query, and
      // was therefore exempt. An attacker-supplied query parameter turned the
      // rule off.
      //
      // The secure variants need no special case: `rediss://`, `ftps://` and
      // `mongodb+srv://` all fail `startsWith` against their insecure
      // counterparts, because the character after the scheme name differs.
      return { isInsecure: true, protocol };
    }
  }

  return { isInsecure: false, protocol: '' };
}

/**
 * Check if a string matches any ignore pattern
 */
function matchesIgnorePattern(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      return false;
    }
  });
}

/**
 * URIs that are *identifiers*, not network destinations.
 *
 * `xmlns="http://www.w3.org/2000/svg"` is the single most common `http://`
 * string in any React codebase — every inline SVG carries one. It is never
 * fetched: XML namespaces are opaque identifiers, and changing it to https
 * breaks the document. Same for the XSD/XSL/DTD namespaces and the XML
 * specification URIs.
 */
const NAMESPACE_URI_PREFIXES = [
  'http://www.w3.org/',
  'http://schemas.xmlsoap.org/',
  'http://purl.org/',
  'http://xmlns.com/',
  'http://ns.adobe.com/',
  'http://sodipodi.sourceforge.net/',
  'http://www.inkscape.org/',
];

/** Is this string an XML/RDF namespace identifier rather than an endpoint? */
function isNamespaceUri(value: string): boolean {
  return NAMESPACE_URI_PREFIXES.some((prefix) => value.startsWith(prefix));
}


/**
 * String methods that *inspect* a value rather than transmit it.
 *
 * `url.startsWith('http://')` is a guard — the literal is the thing being
 * looked for, not an endpoint being called. Reporting it flags the security
 * check as the vulnerability, which is exactly backwards: measured on the
 * Interlace repo, the rule's own finding landed inside an `if` that *skips*
 * insecure URLs.
 */
/** Of the inspection methods, these write their second argument. */
const WRITES_SECOND_ARGUMENT = new Set(['replace', 'replaceAll']);

const INSPECTION_METHODS = new Set([
  'startsWith',
  'endsWith',
  'includes',
  'indexOf',
  'lastIndexOf',
  'search',
  'match',
  'matchAll',
  'test',
  'split',
  'replace',
  'replaceAll',
]);

/**
 * Is this literal being examined rather than used as a destination?
 *
 * Two shapes count: an argument to one of the inspection methods above, and an
 * operand of an equality/comparison expression (`protocol === 'http://'`). Both
 * mean the code is reasoning *about* the protocol string.
 */
function isProtocolInspection(
  node: TSESTree.Node,
  parent: TSESTree.Node,
): boolean {
  if (
    parent.type === AST_NODE_TYPES.CallExpression &&
    parent.callee.type === AST_NODE_TYPES.MemberExpression &&
    parent.callee.property.type === AST_NODE_TYPES.Identifier &&
    INSPECTION_METHODS.has(parent.callee.property.name)
  ) {
    // `replace`/`replaceAll` take a *replacement* as their second argument, and
    // that one is content being written — `url.replace(p, 'http://evil.test')`
    // is a genuine insecure destination. Only the search operand is inspection.
    //
    // Compared by identity against argument 0 rather than scanned for with
    // indexOf: the only question is whether this literal is the first argument,
    // and scanning made a call with many literal arguments O(n²) over the pass.
    if (WRITES_SECOND_ARGUMENT.has(parent.callee.property.name)) {
      return parent.arguments[0] === node;
    }
    return true;
  }

  return (
    parent.type === AST_NODE_TYPES.BinaryExpression &&
    COMPARISON_OPERATORS.has(parent.operator)
  );
}

/**
 * Equality operators only. Nobody orders protocol strings with `<` / `>`, so
 * including them widened the exemption past what the function promises.
 */
const COMPARISON_OPERATORS = new Set(['===', '!==', '==', '!=']);

export const noUnencryptedTransmission = createRule<RuleOptions, MessageIds>({
  name: 'no-unencrypted-transmission',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-unencrypted-transmission.md',
      description:
        'Detects unencrypted data transmission (HTTP vs HTTPS, plain text protocols)',
      cwe: 'CWE-319',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      unencryptedTransmission: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unencrypted Transmission',
        cwe: 'CWE-319',
        description: 'Unencrypted transmission detected: {{issue}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      }),
      useHttps: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use HTTPS',
        description: 'Use secure protocol',
        severity: 'LOW',
        fix: 'Replace http:// with https://',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow unencrypted transmission in test files',
          },
          insecureProtocols: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Insecure protocol patterns to detect',
          },
          secureAlternatives: {
            type: 'object',
            additionalProperties: { type: 'string' },
            default: {},
            description:
              'Mapping of insecure protocols to their secure alternatives',
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
      insecureProtocols: [],
      secureAlternatives: {},
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = false,
      insecureProtocols,
      secureAlternatives,
      ignorePatterns = [],
    } = options as Options;

    const protocolsToCheck =
      insecureProtocols && insecureProtocols.length > 0
        ? insecureProtocols
        : DEFAULT_INSECURE_PROTOCOLS;

    // Merge user-provided secure alternatives with defaults
    const secureAlternativesToUse =
      secureAlternatives && Object.keys(secureAlternatives).length > 0
        ? { ...SECURE_ALTERNATIVES, ...secureAlternatives }
        : SECURE_ALTERNATIVES;

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);
    const sourceCode = context.sourceCode;

    function checkLiteral(node: TSESTree.Literal) {
      if (typeof node.value !== 'string') {
        return;
      }

      const value = node.value;
      const text = sourceCode.getText(node);

      // A protocol string being tested against is not a transmission.
      if (isProtocolInspection(node, node.parent as TSESTree.Node)) {
        return;
      }

      // Nor is an XML namespace identifier, which is never fetched.
      if (isNamespaceUri(value)) {
        return;
      }

      // Nor a loopback address (nothing leaves the machine) or an RFC 2606 reserved
      // domain (guaranteed never to resolve to a real service). Shared with no-http-urls
      // and no-insecure-websocket so the three cannot disagree about what "local" means.
      if (isNonTransmittingUrl(value)) {
        return;
      }

      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // NOTE: a test-file carve-out for `localhost` used to sit here. It is now unreachable:
      // `isNonTransmittingUrl` above returns for every loopback host in every file, test or
      // not, so the carve-out could never be the thing that returned. Removed rather than
      // covered — a test for an unreachable branch documents nothing.

      const { isInsecure, protocol } = containsInsecureProtocol(value, protocolsToCheck);

      if (isInsecure) {
        // NOTE: localhost URLs in test files already returned above, so no
        // second `isTestFile && localhost` check is needed here.
        const secureProtocol =
          secureAlternativesToUse[protocol.toLowerCase()] || 'secure protocol';
        const safeAlternative = `Use ${secureProtocol} instead of ${protocol}`;

        context.report({
          node,
          messageId: 'unencryptedTransmission',
          data: {
            issue: `using insecure protocol ${protocol}`,
            safeAlternative,
          },
          suggest: [
            {
              messageId: 'useHttps',
              data: {
                protocol,
                secureProtocol,
              },
              fix(fixer: TSESLint.RuleFixer) {
                if (secureProtocol && secureProtocol !== 'secure protocol') {
                  // Replace the insecure protocol with secure one
                  const newValue = value.replace(
                    new RegExp(
                      protocol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                      'gi',
                    ),
                    secureProtocol,
                  );
                  return fixer.replaceText(node, JSON.stringify(newValue));
                }
                return null;
              },
            },
          ],
        });
      }
    }

    function checkTemplateLiteral(node: TSESTree.TemplateLiteral) {
      if (isTestFile) {
        return;
      }

      const text = sourceCode.getText(node);

      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // Check each quasis (static parts) and expressions
      for (const quasi of node.quasis) {
        const value = quasi.value.raw;
        const { isInsecure, protocol } = containsInsecureProtocol(value, protocolsToCheck);

        if (isInsecure) {
          const secureProtocol =
            secureAlternativesToUse[protocol.toLowerCase()] ||
            'secure protocol';
          const safeAlternative = `Use ${secureProtocol} instead of ${protocol}`;

          context.report({
            node: quasi,
            messageId: 'unencryptedTransmission',
            data: {
              issue: `using insecure protocol ${protocol} in template literal`,
              safeAlternative,
            },
            // Don't provide auto-fix for template literals (too risky - might break interpolation)
          });
        }
      }
    }

    return {
      Literal: checkLiteral,
      TemplateLiteral: checkTemplateLiteral,
    };
  },
});
