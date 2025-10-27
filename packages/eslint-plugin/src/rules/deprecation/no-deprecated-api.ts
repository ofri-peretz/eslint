/**
 * ESLint Rule: no-deprecated-api
 * Detects deprecated API usage with replacement context and migration timeline
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext } from '../../utils/llm-context';

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
  apis?: DeprecatedAPI[];
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
      deprecatedAPI: '⚠️ Deprecated API | {{apiName}} → {{replacement}} | Days until removal: {{daysRemaining}}',
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
    const { apis = [], warnDaysBeforeRemoval = 90 } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

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

    /**
     * Extract API signature changes
     */
    const getAPIChanges = (deprecatedApi: DeprecatedAPI, node: TSESTree.Node): {
      oldSignature: string;
      newSignature: string;
      behaviorChanges: string[];
    } => {
      const oldSignature = sourceCode.getText(node);
      
      // Simple replacement (can be enhanced)
      const newSignature = oldSignature.replace(
        deprecatedApi.name,
        deprecatedApi.replacement
      );

      return {
        oldSignature,
        newSignature,
        behaviorChanges: [
          `API name changed: ${deprecatedApi.name} → ${deprecatedApi.replacement}`,
          deprecatedApi.reason,
        ],
      };
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
        const apiChanges = getAPIChanges(deprecatedApi, node);

        const llmContext = generateLLMContext('deprecation/no-deprecated-api', {
          severity: urgency === 'critical' ? 'error' : 'warning',
          category: 'deprecation',
          filePath: filename,
          node,
          details: {
            deprecatedAPI: deprecatedApi.name,
            replacement: deprecatedApi.replacement,
            deprecatedSince: deprecatedApi.deprecatedSince,
            removalDate: deprecatedApi.removalDate || 'Not specified',
            daysUntilRemoval: daysRemaining !== null ? daysRemaining : 'Unknown',
            urgency,
            reason: deprecatedApi.reason,
            apiChanges,
            contextAwareReplacement: {
              currentUsage: sourceCode.getText(node),
              suggestedFix: apiChanges.newSignature,
              additionalChanges: apiChanges.behaviorChanges,
            },
            impactAnalysis: {
              usagesInFile: 1, // Would need full file scan to count
              estimatedMigrationTime: '5-10 minutes',
            },
            migrationResources: {
              guide: deprecatedApi.migrationGuide || 'No guide provided',
            },
          },
          resources: {
            docs: deprecatedApi.migrationGuide,
          },
        });

        context.report({
          node,
          messageId: 'deprecatedAPI',
          data: {
            apiName: deprecatedApi.name,
            replacement: deprecatedApi.replacement,
            daysRemaining: String(daysRemaining ?? 'Unknown'),
            ...llmContext,
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
            daysRemaining: String(daysRemaining ?? 'Unknown'),
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

