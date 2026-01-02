/**
 * ESLint Rule: no-debug-mode-production
 * Prevents Mongoose debug mode in production
 * CWE-489: Active Debug Code
 */
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'debugModeProduction';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noDebugModeProduction = createRule<RuleOptions, MessageIds>({
  name: 'no-debug-mode-production',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent Mongoose debug mode in production' },
    hasSuggestions: true,
    messages: {
      debugModeProduction: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Debug Mode in Production',
        cwe: 'CWE-489',
        owasp: 'A05:2021',
        cvss: 3.1,
        description: 'mongoose.set("debug", true) exposes query details in production',
        severity: 'LOW',
        fix: 'Use mongoose.set("debug", process.env.NODE_ENV !== "production")',
        documentationLink: 'https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.set()',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create() { return {}; },
});

export default noDebugModeProduction;
