/**
 * ESLint Rule: require-tls-connection
 * Requires TLS for MongoDB connections
 * CWE-295: Improper Certificate Validation
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireTls';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const requireTlsConnection = createRule<RuleOptions, MessageIds>({
  name: 'require-tls-connection',
  meta: {
    type: 'problem',
    docs: { description: 'Require TLS for MongoDB connections in production' },
    hasSuggestions: true,
    messages: {
      requireTls: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing TLS Connection',
        cwe: 'CWE-295',
        owasp: 'A02:2021',
        cvss: 7.4,
        description: 'MongoDB connection is not using TLS encryption',
        severity: 'HIGH',
        fix: 'Add { tls: true } to connection options',
        documentationLink: 'https://www.mongodb.com/docs/manual/tutorial/configure-ssl/',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default requireTlsConnection;
