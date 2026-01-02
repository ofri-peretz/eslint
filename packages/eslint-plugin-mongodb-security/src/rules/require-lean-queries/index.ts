/**
 * ESLint Rule: require-lean-queries
 * Suggests .lean() for read-only queries
 * CWE-400: Resource Exhaustion
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'useLean';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const requireLeanQueries = createRule<RuleOptions, MessageIds>({
  name: 'require-lean-queries',
  meta: {
    type: 'suggestion',
    docs: { description: 'Suggest .lean() for read-only Mongoose queries' },
    hasSuggestions: true,
    messages: {
      useLean: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Consider Using .lean()',
        cwe: 'CWE-400',
        owasp: 'A04:2021',
        cvss: 4.3,
        description: 'Full Mongoose documents use more memory than plain objects',
        severity: 'LOW',
        fix: 'Add .lean() for read-only queries to improve performance',
        documentationLink: 'https://mongoosejs.com/docs/tutorials/lean.html',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default requireLeanQueries;
