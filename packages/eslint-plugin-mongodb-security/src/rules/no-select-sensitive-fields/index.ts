/**
 * ESLint Rule: no-select-sensitive-fields
 * Prevents returning sensitive fields like password
 * CWE-200: Information Exposure
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'selectSensitiveFields';
export interface Options { allowInTests?: boolean; sensitiveFields?: string[]; }
type RuleOptions = [Options?];

export const noSelectSensitiveFields = createRule<RuleOptions, MessageIds>({
  name: 'no-select-sensitive-fields',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent returning sensitive fields like password in queries' },
    hasSuggestions: true,
    messages: {
      selectSensitiveFields: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Field Exposure',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 5.3,
        description: 'Query may return sensitive fields like password or token',
        severity: 'MEDIUM',
        fix: 'Add .select("-password -refreshToken") to exclude sensitive fields',
        documentationLink: 'https://mongoosejs.com/docs/api/query.html#Query.prototype.select()',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true }, sensitiveFields: { type: 'array', items: { type: 'string' } } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true, sensitiveFields: ['password', 'refreshToken', 'apiKey', 'secret'] }],
  create() { return {}; },
});

export default noSelectSensitiveFields;
