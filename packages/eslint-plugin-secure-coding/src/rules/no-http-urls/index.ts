/**
 * @fileoverview Disallow hardcoded HTTP URLs
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/319.html
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'insecureHttp' | 'insecureHttpWithException';

export interface Options {
  /** List of hostnames allowed to use HTTP (e.g., localhost, 127.0.0.1) */
  allowedHosts?: string[];
  
  /** List of ports allowed for HTTP (e.g., 3000, 8080 for development) */
  allowedPorts?: number[];
}

type RuleOptions = [Options?];

export const noHttpUrls = createRule<RuleOptions, MessageIds>({
  name: 'no-http-urls',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded HTTP URLs (require HTTPS)',
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
            description: 'List of hostnames allowed to use HTTP (e.g., localhost, 127.0.0.1)',
          },
          allowedPorts: {
            type: 'array',
            items: { type: 'number' },
            description: 'List of ports allowed for HTTP (e.g., 3000, 8080 for development)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowedHosts: ['localhost', '127.0.0.1'],
      allowedPorts: [],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const allowedHosts = options.allowedHosts ?? ['localhost', '127.0.0.1'];
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

    function checkStringValue(node: TSESTree.Node, value: string): void {
      const httpPattern = /^http:\/\//i;
      
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
        if (node.value.cooked) {
          checkStringValue(node, node.value.cooked);
        }
      },
    };
  },
});
