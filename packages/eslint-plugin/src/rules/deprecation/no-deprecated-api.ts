/**
 * ESLint Rule: no-deprecated-api
 * Detects deprecated API usage with replacement context and migration timeline
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'deprecatedAPI' | 'useReplacement';

interface DeprecatedAPI {
  name: string;
  replacement: string;
  deprecatedSince: string;
  removalDate?: string;
  reason: string;
  migrationGuide?: string;
}

export interface Options {
  /** Array of deprecated APIs to detect */
  apis?: DeprecatedAPI[];
  
  /** Days before removal date to start warning */
  warnDaysBeforeRemoval?: number;
}

type RuleOptions = [Options?];

export const noDeprecatedApi = createRule<RuleOptions, MessageIds>({
  name: 'no-deprecated-api',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent usage of deprecated APIs with migration context',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      // 🎯 Token optimization: 44% reduction (48→27 tokens) - removes verbose labels
      deprecatedAPI: formatLLMMessage({
        icon: MessageIcons.DEPRECATION,
        issueName: 'Deprecated API',
        cwe: 'CWE-1078',
        description: 'Deprecated API detected',
        severity: 'HIGH',
        fix: 'Migrate to recommended alternative with timeline guidance',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference',
      }),
      useReplacement: '✅ Replace with {{replacement}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          apis: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                replacement: { type: 'string' },
                deprecatedSince: { type: 'string' },
                removalDate: { type: 'string' },
                reason: { type: 'string' },
                migrationGuide: { type: 'string' },
              },
              required: ['name', 'replacement', 'deprecatedSince', 'reason'],
            },
          },
          warnDaysBeforeRemoval: {
            type: 'number',
            default: 90,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      apis: [],
      warnDaysBeforeRemoval: 90,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
apis = [], warnDaysBeforeRemoval = 90 
}: Options = options || {};

    // Early return if no deprecated APIs configured
    if (!apis || apis.length === 0) {
      return {};
    }

    /**
     * Calculate days until removal
     */
    const calculateDaysRemaining = (removalDate?: string): number | null => {
      if (!removalDate) return null;
      
      const removal = new Date(removalDate);
      const now = new Date();
      const diff = removal.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    /**
     * Determine urgency level
     */
    const getUrgencyLevel = (daysRemaining: number | null): 'critical' | 'high' | 'medium' | 'low' => {
      if (daysRemaining === null) return 'low';
      if (daysRemaining < 0) return 'critical'; // Already past removal date!
      if (daysRemaining < 30) return 'critical';
      if (daysRemaining < warnDaysBeforeRemoval) return 'high';
      return 'medium';
    };

    return {
      // Check member expressions (e.g., obj.deprecatedMethod())
      MemberExpression(node: TSESTree.MemberExpression) {
        if (node.property.type !== 'Identifier') return;

        const apiName = node.property.name;
        const deprecatedApi = apis.find((api: DeprecatedAPI) => api.name === apiName);

        if (!deprecatedApi) return;

        const daysRemaining = calculateDaysRemaining(deprecatedApi.removalDate);
        const urgency = getUrgencyLevel(daysRemaining);

        context.report({
          node,
          messageId: 'deprecatedAPI',
          data: {
            apiName: deprecatedApi.name,
            replacement: deprecatedApi.replacement,
            deprecatedSince: deprecatedApi.deprecatedSince,
            daysRemaining: String(daysRemaining ?? 'Unknown'),
            urgency: urgency.toUpperCase(),
            migrationGuide: deprecatedApi.migrationGuide || 'See documentation',
          },
          suggest: [
            {
              messageId: 'useReplacement',
              data: { replacement: deprecatedApi.replacement },
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(node.property, deprecatedApi.replacement);
              },
            },
          ],
        });
      },

      // Check call expressions (e.g., deprecatedFunction())
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;

        const apiName = node.callee.name;
        const deprecatedApi = apis.find((api: DeprecatedAPI) => api.name === apiName);

        if (!deprecatedApi) return;

        const daysRemaining = calculateDaysRemaining(deprecatedApi.removalDate);
        const urgency = getUrgencyLevel(daysRemaining);

        context.report({
          node,
          messageId: 'deprecatedAPI',
          data: {
            apiName: deprecatedApi.name,
            replacement: deprecatedApi.replacement,
            deprecatedSince: deprecatedApi.deprecatedSince,
            daysRemaining: String(daysRemaining ?? 'Unknown'),
            urgency: urgency.toUpperCase(),
            migrationGuide: deprecatedApi.migrationGuide || 'See documentation',
          },
          suggest: [
            {
              messageId: 'useReplacement',
              data: { replacement: deprecatedApi.replacement },
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(node.callee, deprecatedApi.replacement);
              },
            },
          ],
        });
      },
    };
  },
});

