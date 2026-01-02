/**
 * ESLint Rule: no-unbounded-find
 * Requires limit() on find queries
 * CWE-400: Resource Exhaustion
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unboundedFind';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noUnboundedFind = createRule<RuleOptions, MessageIds>({
  name: 'no-unbounded-find',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require limit() on find queries to prevent resource exhaustion' },
    hasSuggestions: true,
    messages: {
      unboundedFind: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Unbounded Query',
        cwe: 'CWE-400',
        owasp: 'A04:2021',
        cvss: 4.3,
        description: 'find() without limit() may return excessive data',
        severity: 'LOW',
        fix: 'Add .limit(100) or appropriate limit to the query',
        documentationLink: 'https://www.mongodb.com/docs/manual/reference/method/cursor.limit/',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default noUnboundedFind;
