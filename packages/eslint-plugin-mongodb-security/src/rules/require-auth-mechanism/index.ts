/**
 * ESLint Rule: require-auth-mechanism
 * Requires explicit authentication mechanism
 * CWE-287: Improper Authentication
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireAuthMechanism';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const requireAuthMechanism = createRule<RuleOptions, MessageIds>({
  name: 'require-auth-mechanism',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require explicit authentication mechanism (SCRAM-SHA-256)' },
    hasSuggestions: true,
    messages: {
      requireAuthMechanism: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implicit Auth Mechanism',
        cwe: 'CWE-287',
        owasp: 'A07:2021',
        cvss: 6.5,
        description: 'MongoDB connection uses default authentication mechanism',
        severity: 'MEDIUM',
        fix: 'Add { authMechanism: "SCRAM-SHA-256" } to connection options',
        documentationLink: 'https://www.mongodb.com/docs/manual/core/authentication/',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default requireAuthMechanism;
