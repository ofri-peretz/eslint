/**
 * @fileoverview Require abort signal for streaming AI calls
 * @description Ensures streamText/streamObject have AbortSignal for proper cleanup
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/generating-text
 * @see OWASP LLM10: Unbounded Consumption
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingAbortSignal';

export interface Options {
  /** Functions that should have abort signal */
  targetFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireAbortSignal = createRule<RuleOptions, MessageIds>({
  name: 'require-abort-signal',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require AbortSignal for streaming AI calls to enable proper cleanup',
    },
    messages: {
      missingAbortSignal: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing AbortSignal in Streaming Call',
        cwe: 'CWE-404',
        owasp: 'A05:2021',
        cvss: 4.0,
        description: '{{function}} call without abortSignal. Users cannot cancel long-running streams.',
        severity: 'LOW',
        fix: 'Add abortSignal option: {{function}}({ ..., abortSignal: controller.signal })',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/generating-text',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          targetFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Functions that should have abort signal',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      targetFunctions: ['streamText', 'streamObject'],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const targetFunctions = options.targetFunctions ?? ['streamText', 'streamObject'];

    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is a target streaming function
        const matchedFunction = targetFunctions.find((fn: string) => callee.includes(fn));
        if (!matchedFunction) return;

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // Check if abortSignal is present
        const hasAbortSignal = optionsArg.properties.some(prop => {
          if (prop.type !== 'Property') return false;
          const keyName = prop.key.type === 'Identifier' 
            ? prop.key.name 
            : prop.key.type === 'Literal' 
              ? String(prop.key.value)
              : null;
          return keyName === 'abortSignal' || keyName === 'signal';
        });

        if (!hasAbortSignal) {
          context.report({
            node,
            messageId: 'missingAbortSignal',
            data: { function: matchedFunction },
          });
        }
      },
    };
  },
});
