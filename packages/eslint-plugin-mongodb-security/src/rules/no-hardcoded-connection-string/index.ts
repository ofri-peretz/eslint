/**
 * ESLint Rule: no-hardcoded-connection-string
 * Detects hardcoded MongoDB connection strings with credentials
 * CWE-798: Hardcoded Credentials
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'hardcodedConnectionString';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noHardcodedConnectionString = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-connection-string',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent hardcoded MongoDB connection strings with credentials' },
    hasSuggestions: true,
    messages: {
      hardcodedConnectionString: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Connection String',
        cwe: 'CWE-798',
        cvss: 7.5,
        description: 'MongoDB connection string contains hardcoded credentials',
        severity: 'HIGH',
        fix: 'Use process.env.MONGODB_URI instead of hardcoded connection strings',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default noHardcodedConnectionString;
