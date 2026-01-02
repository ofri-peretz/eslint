/**
 * ESLint Rule: require-projection
 * Requires field projection on queries
 * CWE-200: Information Exposure
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireProjection';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const requireProjection = createRule<RuleOptions, MessageIds>({
  name: 'require-projection',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require field projection on MongoDB queries' },
    hasSuggestions: true,
    messages: {
      requireProjection: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Missing Projection',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 3.7,
        description: 'Query returns all fields without projection',
        severity: 'LOW',
        fix: 'Add projection to select only required fields',
        documentationLink: 'https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default requireProjection;
