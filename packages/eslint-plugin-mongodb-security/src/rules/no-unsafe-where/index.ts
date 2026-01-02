/**
 * ESLint Rule: no-unsafe-where
 * Detects dangerous $where operator usage (CVE-2025-23061, CVE-2024-53900)
 * CWE-943: NoSQL Injection
 *
 * @see https://nvd.nist.gov/vuln/detail/CVE-2025-23061
 */
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeWhere';

export interface Options {
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noUnsafeWhere = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-where',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent $where operator RCE attacks (CVE-2025-23061)',
    },
    hasSuggestions: true,
    messages: {
      unsafeWhere: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: '$where Operator RCE',
        cwe: 'CWE-943',
        owasp: 'A01:2021',
        cvss: 9.0,
        description: 'The $where operator executes JavaScript and enables Remote Code Execution',
        severity: 'CRITICAL',
        fix: 'Remove $where and use standard query operators like $eq, $in, $regex',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2025-23061',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create() {
    // TODO: Implement rule logic
    return {};
  },
});

export default noUnsafeWhere;
