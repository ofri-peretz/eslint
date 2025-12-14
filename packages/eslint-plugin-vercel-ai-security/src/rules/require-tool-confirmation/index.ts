/**
 * @fileoverview Require human confirmation for destructive tool operations
 * @description Ensures tools that perform destructive actions have confirmation
 * @see OWASP ASI09: Human-Agent Trust Exploitation
 * @see OWASP LLM06: Excessive Agency
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingConfirmation';

export interface Options {
  /** Patterns that suggest destructive operations */
  destructivePatterns?: string[];
}

type RuleOptions = [Options?];

export const requireToolConfirmation = createRule<RuleOptions, MessageIds>({
  name: 'require-tool-confirmation',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require human confirmation for destructive tool operations (delete, transfer, execute)',
    },
    messages: {
      missingConfirmation: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Destructive Tool Without Confirmation',
        cwe: 'CWE-862',
        owasp: 'A01:2021',
        cvss: 7.0,
        description: 'Tool "{{toolName}}" performs destructive operation "{{operation}}" without requiring confirmation.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Add requiresConfirmation: true or implement confirmation logic in the tool',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          destructivePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns that suggest destructive operations',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      destructivePatterns: [
        'delete', 'remove', 'drop', 'truncate', 'destroy',
        'transfer', 'send', 'pay', 'withdraw', 'purchase',
        'execute', 'run', 'eval', 'exec', 'spawn',
        'update', 'modify', 'change', 'alter',
        'create', 'insert', 'post', 'write',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const destructivePatterns = options.destructivePatterns ?? [
      'delete', 'remove', 'transfer', 'execute', 'update', 'create',
    ];

    /**
     * Check if a tool name suggests destructive operation
     */
    function isDestructiveTool(name: string): string | null {
      const lowerName = name.toLowerCase();
      for (const pattern of destructivePatterns) {
        if (lowerName.includes(pattern.toLowerCase())) {
          return pattern;
        }
      }
      return null;
    }

    /**
     * Check if tool has confirmation requirement
     */
    function hasConfirmationFlag(toolDef: TSESTree.ObjectExpression): boolean {
      const confirmationProps = [
        'requiresConfirmation', 'requireConfirmation', 'confirmation',
        'requiresApproval', 'requireApproval', 'approval',
        'dangerouslyAllowBrowser', // If explicitly acknowledged
      ];
      
      return toolDef.properties.some(prop => {
        if (prop.type !== 'Property') return false;
        const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
        return keyName && confirmationProps.includes(keyName);
      });
    }

    return {
      Property(node: TSESTree.Property) {
        // Looking for tool definitions in tools object
        if (node.key.type !== 'Identifier' && node.key.type !== 'Literal') return;
        
        const toolName = node.key.type === 'Identifier' 
          ? node.key.name 
          : String(node.key.value);

        // Check if this looks like a tool definition
        if (node.value.type !== 'ObjectExpression' && node.value.type !== 'CallExpression') {
          return;
        }

        // Check if tool name suggests destructive operation
        const destructiveOp = isDestructiveTool(toolName);
        if (!destructiveOp) return;

        // Check the parent to ensure this is in a tools object
        const parent = node.parent;
        if (parent?.type !== 'ObjectExpression') return;
        
        const grandparent = parent.parent;
        if (grandparent?.type !== 'Property') return;
        
        const toolsKey = grandparent.key;
        if (toolsKey.type !== 'Identifier' || toolsKey.name !== 'tools') return;

        // For object expressions, check for confirmation flag
        if (node.value.type === 'ObjectExpression') {
          if (!hasConfirmationFlag(node.value)) {
            context.report({
              node,
              messageId: 'missingConfirmation',
              data: { 
                toolName,
                operation: destructiveOp,
              },
            });
          }
        }
        // For CallExpressions (tool() helper), we'll assume it might be handled
      },
    };
  },
});
