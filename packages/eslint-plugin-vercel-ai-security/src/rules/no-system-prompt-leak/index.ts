/**
 * @fileoverview Prevent system prompt leakage to clients
 * @description Detects when system prompts are exposed in API responses
 * @see OWASP LLM07: System Prompt Leakage
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'systemPromptLeak';

export interface Options {
  /** Patterns that suggest system prompt variables */
  systemPromptPatterns?: string[];
}

type RuleOptions = [Options?];

export const noSystemPromptLeak = createRule<RuleOptions, MessageIds>({
  name: 'no-system-prompt-leak',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent system prompts from being exposed in API responses or client code',
    },
    messages: {
      systemPromptLeak: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'System Prompt Leakage',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 7.5,
        description: 'System prompt "{{variable}}" is exposed in return statement. This reveals AI behavior instructions to users.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Remove system prompt from API response. Only return the AI-generated content.',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          systemPromptPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variable patterns that suggest system prompts',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      systemPromptPatterns: [
        'systemPrompt', 'system_prompt', 'SYSTEM_PROMPT',
        'systemMessage', 'system_message', 'SYSTEM_MESSAGE',
        'instructions', 'INSTRUCTIONS', 'aiInstructions',
        'agentPrompt', 'basePrompt', 'contextPrompt',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const systemPromptPatterns = options.systemPromptPatterns ?? [
      'systemPrompt', 'system_prompt', 'SYSTEM_PROMPT',
      'systemMessage', 'instructions', 'agentPrompt',
    ];

    const sourceCode = context.sourceCode || context.getSourceCode();

    /**
     * Check if identifier matches system prompt pattern
     */
    function isSystemPromptVariable(name: string): boolean {
      const lowerName = name.toLowerCase();
      return systemPromptPatterns.some((pattern: string) => 
        lowerName.includes(pattern.toLowerCase())
      );
    }

    /**
     * Find system prompt variables in an expression
     */
    function findSystemPromptVar(node: TSESTree.Node): string | null {
      if (node.type === 'Identifier' && isSystemPromptVariable(node.name)) {
        return node.name;
      }
      if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
        if (isSystemPromptVariable(node.property.name)) {
          return sourceCode.getText(node);
        }
      }
      return null;
    }

    /**
     * Check object properties for system prompt leaks
     */
    function checkObjectForLeaks(node: TSESTree.ObjectExpression): void {
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        
        // Check if property value contains system prompt
        const leakedVar = findSystemPromptVar(prop.value);
        if (leakedVar) {
          context.report({
            node: prop,
            messageId: 'systemPromptLeak',
            data: { variable: leakedVar },
          });
        }
      }
    }

    return {
      // Check return statements in functions
      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (!node.argument) return;
        
        // Check if returning an object with system prompt
        if (node.argument.type === 'ObjectExpression') {
          checkObjectForLeaks(node.argument);
        }
        
        // Check if returning system prompt directly
        const leakedVar = findSystemPromptVar(node.argument);
        if (leakedVar) {
          context.report({
            node,
            messageId: 'systemPromptLeak',
            data: { variable: leakedVar },
          });
        }
      },

      // Check Response.json() calls
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check for Response.json, res.json, res.send patterns
        if (!callee.match(/\.(json|send)\s*$/)) return;

        const arg = node.arguments[0];
        if (arg && arg.type === 'ObjectExpression') {
          checkObjectForLeaks(arg);
        }
      },
    };
  },
});
