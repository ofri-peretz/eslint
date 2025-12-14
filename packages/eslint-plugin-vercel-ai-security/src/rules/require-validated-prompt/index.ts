/**
 * @fileoverview Require validated prompts in generateText calls
 * @description Detects when user input is passed directly to generateText without validation
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/generating-text
 * @see https://owasp.org/www-project-top-10-for-large-language-model-applications/
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unsafePrompt' | 'unsafeSystemPrompt';

export interface Options {
  /** Function names considered as input validators */
  validatorFunctions?: string[];
  
  /** Variable patterns that suggest user input */
  userInputPatterns?: string[];
  
  /** Allow in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireValidatedPrompt = createRule<RuleOptions, MessageIds>({
  name: 'require-validated-prompt',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require validated/sanitized prompts in generateText and streamText calls',
    },
    messages: {
      unsafePrompt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Prompt in Vercel AI SDK',
        cwe: 'CWE-74',
        owasp: 'A03:2021',
        cvss: 9.0,
        description: 'User input "{{input}}" passed directly to {{function}} prompt without validation',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'GDPR'],
        fix: 'Validate input before use: generateText({ prompt: validateInput(userInput) })',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
      unsafeSystemPrompt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe System Prompt',
        cwe: 'CWE-74',
        owasp: 'A03:2021',
        cvss: 8.5,
        description: 'Dynamic value in system prompt can lead to prompt injection',
        severity: 'HIGH',
        fix: 'Use static system prompts or validate dynamic content',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          validatorFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Function names considered as input validators',
          },
          userInputPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variable patterns that suggest user input (regex)',
          },
          allowInTests: {
            type: 'boolean',
            description: 'Allow unsafe patterns in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      validatorFunctions: [
        'validateInput',
        'sanitizeInput',
        'validatePrompt',
        'sanitizePrompt',
        'escapeInput',
        'cleanInput',
      ],
      userInputPatterns: [
        'userInput',
        'userPrompt',
        'userMessage',
        'userQuery',
        'userContent',
        'input',
        'query',
        'message',
        'req.body',
        'request.body',
      ],
      allowInTests: false,
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const validatorFunctions = options.validatorFunctions ?? [
      'validateInput', 'sanitizeInput', 'validatePrompt', 'sanitizePrompt',
    ];
    const userInputPatterns = options.userInputPatterns ?? [
      'userInput', 'userPrompt', 'userMessage', 'userQuery', 'userContent',
      'input', 'query', 'message', 'req.body', 'request.body',
    ];
    const allowInTests = options.allowInTests ?? false;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    // Skip test files if allowed
    if (allowInTests && /\.(test|spec)\.[jt]sx?$/.test(filename)) {
      return {};
    }

    // Vercel AI SDK function names
    const vercelAIFunctions = [
      'generateText',
      'streamText', 
      'generateObject',
      'streamObject',
    ];

    /**
     * Check if a node is a call to a validation function
     */
    function isValidatedCall(node: TSESTree.Node): boolean {
      if (node.type !== 'CallExpression') return false;
      
      const callee = sourceCode.getText(node.callee);
      return validatorFunctions.some((v: string) => callee.includes(v));
    }

    /**
     * Check if an identifier suggests user input
     */
    function isUserInput(node: TSESTree.Node): boolean {
      const text = sourceCode.getText(node);
      return userInputPatterns.some((pattern: string) => text.includes(pattern));
    }

    /**
     * Check if a node contains unsafe user input
     */
    function hasUnsafeUserInput(node: TSESTree.Node): { unsafe: boolean; input?: string } {
      // If it's validated, it's safe
      if (isValidatedCall(node)) {
        return { unsafe: false };
      }

      // Check for template literals with user input
      if (node.type === 'TemplateLiteral') {
        for (const expr of node.expressions) {
          const result = hasUnsafeUserInput(expr);
          if (result.unsafe) return result;
        }
      }

      // Check identifiers
      if (node.type === 'Identifier') {
        if (isUserInput(node)) {
          return { unsafe: true, input: node.name };
        }
      }

      // Check member expressions
      if (node.type === 'MemberExpression') {
        const text = sourceCode.getText(node);
        if (isUserInput(node)) {
          return { unsafe: true, input: text };
        }
      }

      // Check binary expressions (concatenation)
      if (node.type === 'BinaryExpression') {
        const leftResult = hasUnsafeUserInput(node.left);
        if (leftResult.unsafe) return leftResult;
        const rightResult = hasUnsafeUserInput(node.right);
        if (rightResult.unsafe) return rightResult;
      }

      return { unsafe: false };
    }

    /**
     * Check generateText/streamText call for unsafe prompts
     */
    function checkAICall(node: TSESTree.CallExpression): void {
      const callee = sourceCode.getText(node.callee);
      
      // Get which function is being called
      const matchedFunction = vercelAIFunctions.find(fn => callee.includes(fn));
      if (!matchedFunction) {
        return;
      }

      // Check first argument (options object)
      const optionsArg = node.arguments[0];
      if (!optionsArg || optionsArg.type !== 'ObjectExpression') {
        return;
      }

      // Check for unsafe prompt property
      for (const prop of optionsArg.properties) {
        if (prop.type !== 'Property') continue;
        
        const keyName = prop.key.type === 'Identifier' 
          ? prop.key.name 
          : prop.key.type === 'Literal' 
            ? String(prop.key.value)
            : null;

        if (keyName === 'prompt') {
          const result = hasUnsafeUserInput(prop.value);
          if (result.unsafe) {
            context.report({
              node: prop.value,
              messageId: 'unsafePrompt',
              data: { 
                input: result.input || 'user input',
                function: matchedFunction,
              },
            });
          }
        }

        if (keyName === 'system') {
          const result = hasUnsafeUserInput(prop.value);
          if (result.unsafe) {
            context.report({
              node: prop.value,
              messageId: 'unsafeSystemPrompt',
            });
          }
        }
      }
    }

    return {
      CallExpression: checkAICall,
    };
  },
});
