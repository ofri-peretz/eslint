/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow hardcoded HTTP URLs
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/319.html
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  isXmlNamespaceUri,
  isTrustworthyLocalUrl,
  isDiscardedUrlBase,
} from '../../utils/namespace-uris';
import { isReservedExampleUrl } from '../../utils/loopback-hosts';
import { isProtocolInspection } from '../../utils/protocol-inspection';

type MessageIds = 'insecureHttp' | 'insecureHttpWithException';

export interface Options {
  /** List of hostnames allowed to use HTTP (e.g., localhost, 127.0.0.1) */
  allowedHosts?: string[];
  
  /** List of ports allowed for HTTP (e.g., 3000, 8080 for development) */
  allowedPorts?: number[];
}

type RuleOptions = [Options?];

/**
 * The one place the default lives.
 *
 * It used to be written out three times — in `defaultOptions`, in the
 * `create()` destructuring, and nowhere at all in `meta.schema`, so the
 * generated docs claimed the option had no default while the code applied one.
 */
const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1'];

export const noHttpUrls = createRule<RuleOptions, MessageIds>({
  name: 'no-http-urls',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-http-urls.md',
      description: 'Disallow hardcoded HTTP URLs (require HTTPS)',
      cwe: 'CWE-319',
      cvss: 7.5,
    },
    messages: {
      insecureHttp: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure HTTP URL',
        cwe: 'CWE-319',
        owasp: 'A02:2021',
        cvss: 7.5,
        description: 'Hardcoded HTTP URL detected: "{{url}}"',
        severity: 'HIGH',
        compliance: ['SOC2', 'PCI-DSS', 'HIPAA'],
        fix: 'Use HTTPS instead: const url = "https://..."',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      }),
      insecureHttpWithException: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Insecure HTTP URL',
        cwe: 'CWE-319',
        owasp: 'A02:2021',
        cvss: 5.3,
        description: 'HTTP URL detected: "{{url}}"',
        severity: 'MEDIUM',
        fix: 'Use HTTPS or add to allowedHosts config',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedHosts: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ALLOWED_HOSTS,
            description: 'List of hostnames allowed to use HTTP (e.g., localhost, 127.0.0.1)',
          },
          allowedPorts: {
            type: 'array',
            items: { type: 'number' },
            default: [],
            description: 'List of ports allowed for HTTP (e.g., 3000, 8080 for development)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowedHosts: DEFAULT_ALLOWED_HOSTS,
      allowedPorts: [],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const allowedHosts = options.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;
    const allowedPorts = options.allowedPorts ?? [];

    function isAllowedException(url: string): boolean {
      try {
        const parsedUrl = new URL(url);
        
        // Check if host is in allowed list
        if (allowedHosts.includes(parsedUrl.hostname)) {
          return true;
        }

        // Check if port is in allowed list
        if (parsedUrl.port && allowedPorts.includes(parseInt(parsedUrl.port, 10))) {
          return true;
        }

        return false;
      } catch {
        // If URL parsing fails, treat as pattern match
        return allowedHosts.some(host => url.includes(host));
      }
    }

    /**
     * The attribute or property this string was written under, when there is
     * one. `xmlns="…"` settles the question on its own.
     */
    function declarationName(node: TSESTree.Node): string | undefined {
      // Every node the visitors hand us is reached from Program, so it always
      // has a parent — only Program itself does not, and Program is never a
      // Literal or TemplateElement. Asserting beats an unreachable branch.
      const parent = node.parent as TSESTree.Node;
      if (parent.type === 'JSXAttribute') {
        // JSXAttribute.name is exactly JSXIdentifier | JSXNamespacedName, so
        // the ternary is exhaustive and needs no unreachable fallback.
        const name = parent.name;
        return name.type === 'JSXIdentifier'
          ? name.name
          : `${name.namespace.name}:${name.name.name}`;
      }
      if (parent.type === 'Property' && parent.value === node && !parent.computed) {
        if (parent.key.type === 'Identifier') return parent.key.name;
        if (parent.key.type === 'Literal' && typeof parent.key.value === 'string') {
          return parent.key.value;
        }
      }
      return undefined;
    }

    /**
     * Is the *authority* of this `http://` template chunk supplied by an
     * interpolation rather than written down?
     *
     * ``` `http://${host}:${port}` ``` is not a hardcoded HTTP URL — it is a
     * configured endpoint, and this rule has no host to judge. Five of the
     * eight corpus findings were exactly this shape (webpack dev-server proxy
     * targets and the Shopify CLI's local theme server), each reported with
     * the message `Hardcoded HTTP URL detected: "http://"`, which is not true
     * of the code and not actionable.
     *
     * Deliberately narrow: only a *fully* interpolated authority is unknowable.
     * ``` `http://api.${env}.com/x` ``` still reports, because `api.` is
     * already enough to know the host is not loopback.
     */
    function hasInterpolatedAuthority(node: TSESTree.TemplateElement, cooked: string): boolean {
      const rest = /^http:\/\/(.*)$/is.exec(cooked)?.[1];
      if (rest === undefined) return false;
      // The authority runs to the first path / query / fragment delimiter.
      const authority = rest.split(/[/?#]/)[0];
      // Something was written down — judge it normally.
      if (authority !== '') return false;
      // Nothing written down, and another chunk follows: the next `${…}` IS
      // the authority.
      return !node.tail;
    }

    function checkStringValue(node: TSESTree.Node, value: string): void {
      const httpPattern = /^http:\/\//i;

      // An XML namespace URI is an opaque identifier, never fetched. Rewriting
      // it to https breaks the document, so reporting it is worse than noise.
      if (isXmlNamespaceUri(value, declarationName(node))) {
        return;
      }

      // Loopback origins are potentially trustworthy per the Secure Contexts
      // spec — no browser treats them as cleartext-transmission risk, and no
      // packet leaves the machine. Shared with `detect-mixed-content` so the
      // two rules cannot disagree about what "local" means; it covers `::1`,
      // `0.0.0.0` and `*.localhost`, which the `allowedHosts` default misses.
      if (isTrustworthyLocalUrl(value)) {
        return;
      }

      // A literal being EXAMINED is a guard, not a destination.
      // `canonic_module_name.indexOf('http://') !== -1` is pm2 deciding whether a module
      // spec is a remote URL; reporting it flags the check as the vulnerability. Shared
      // with no-unencrypted-transmission so the two cannot disagree.
      {
        const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (parent !== undefined && isProtocolInspection(node, parent)) {
          return;
        }
      }

      // RFC 2606 reserved domains exist so that nothing treats them as a real endpoint.
      // `redirectUri: 'http://example.com'` was the largest single false-positive shape
      // for this rule — our highest-volume rule — across the real-source corpus.
      if (isReservedExampleUrl(value)) {
        return;
      }

      // A parsing base whose origin is destructured away transmits nothing —
      // there is no URL object left to fetch. Shared with `detect-mixed-content`
      // so the two rules cannot disagree about it.
      if (isDiscardedUrlBase(node)) {
        return;
      }

      if (httpPattern.test(value) && !isAllowedException(value)) {
        context.report({
          node,
          messageId: allowedHosts.length > 0 || allowedPorts.length > 0 
            ? 'insecureHttpWithException' 
            : 'insecureHttp',
          data: { url: value },
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          checkStringValue(node, node.value);
        }
      },
      TemplateElement(node) {
        const cooked = node.value.cooked;
        if (cooked && !hasInterpolatedAuthority(node, cooked)) {
          checkStringValue(node, cooked);
        }
      },
    };
  },
});
