/**
 * @fileoverview Require Zod schema validation for tool parameters
 * @description Ensures all tools have proper inputSchema defined with Zod
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
 * @see OWASP ASI02: Tool Misuse & Exploitation
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingInputSchema' | 'emptyToolsObject';

export interface Options {
  /** Allow tools without inputSchema in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireToolSchema = createRule<RuleOptions, MessageIds>({
  name: 'require-tool-schema',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require inputSchema (Zod schema) for all AI SDK tools',
    },
    messages: {
      missingInputSchema: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Tool Missing Input Schema',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 7.5,
        description: 'Tool "{{toolName}}" is missing inputSchema. Unvalidated tool parameters can lead to injection attacks.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Add inputSchema using Zod: tool({ inputSchema: z.object({ ... }), execute: ... })',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling',
      }),
      emptyToolsObject: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Empty Tools Object',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        description: 'Tools object is empty or has no tool definitions',
        severity: 'LOW',
        fix: 'Define tools with proper schemas or remove tools property',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            description: 'Allow tools without inputSchema in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const allowInTests = options.allowInTests ?? false;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    // Skip test files if allowed
    if (allowInTests && /\.(test|spec)\.[jt]sx?$/.test(filename)) {
      return {};
    }

    // Vercel AI SDK functions that use tools
    const functionsWithTools = ['generateText', 'streamText', 'generateObject', 'streamObject'];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is a target AI function or a tool() helper
        const isAIFunction = functionsWithTools.some(fn => callee.includes(fn));
        const isToolHelper = callee === 'tool' || callee.endsWith('.tool');
        
        if (isToolHelper) {
          // Check tool() helper for inputSchema
          const toolArg = node.arguments[0];
          if (toolArg && toolArg.type === 'ObjectExpression') {
            const hasInputSchema = toolArg.properties.some(prop => {
              if (prop.type !== 'Property') return false;
              const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
              return keyName === 'inputSchema' || keyName === 'parameters';
            });

            if (!hasInputSchema) {
              context.report({
                node: toolArg,
                messageId: 'missingInputSchema',
                data: { toolName: 'unnamed tool' },
              });
            }
          }
          return;
        }

        if (!isAIFunction) return;

        // Check for tools property in AI function call
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        const toolsProp = optionsArg.properties.find(prop => {
          if (prop.type !== 'Property') return false;
          const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
          return keyName === 'tools';
        }) as TSESTree.Property | undefined;

        if (!toolsProp) return;

        // Check each tool in the tools object
        if (toolsProp.value.type === 'ObjectExpression') {
          for (const toolDef of toolsProp.value.properties) {
            if (toolDef.type !== 'Property') continue;
            
            const toolName = toolDef.key.type === 'Identifier' 
              ? toolDef.key.name 
              : toolDef.key.type === 'Literal' 
                ? String(toolDef.key.value)
                : 'unknown';

            // Check if tool value is an object with inputSchema
            if (toolDef.value.type === 'ObjectExpression') {
              const hasInputSchema = toolDef.value.properties.some(prop => {
                if (prop.type !== 'Property') return false;
                const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
                return keyName === 'inputSchema' || keyName === 'parameters';
              });

              if (!hasInputSchema) {
                context.report({
                  node: toolDef.value,
                  messageId: 'missingInputSchema',
                  data: { toolName },
                });
              }
            }
            // If it's a CallExpression (tool() helper), it will be checked separately
          }
        }
      },
    };
  },
});
