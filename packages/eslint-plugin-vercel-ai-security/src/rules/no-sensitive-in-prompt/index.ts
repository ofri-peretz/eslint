/**
 * @fileoverview Prevent sensitive data from being passed to LLM prompts
 * @description Detects secrets, credentials, PII in prompts
 * @see OWASP LLM02: Sensitive Information Disclosure
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'sensitiveInPrompt';

export interface Options {
  /** Patterns that suggest sensitive data */
  sensitivePatterns?: string[];
}

type RuleOptions = [Options?];

export const noSensitiveInPrompt = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-in-prompt',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent sensitive data (secrets, credentials, PII) from being passed to LLM prompts',
    },
    messages: {
      sensitiveInPrompt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in LLM Prompt',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 8.0,
        description: 'Sensitive data "{{variable}}" detected in prompt. Secrets and PII should never be sent to LLMs.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'GDPR', 'HIPAA', 'PCI-DSS'],
        fix: 'Remove sensitive data from prompt or redact before sending: prompt: redact(sensitiveData)',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variable patterns that suggest sensitive data',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      sensitivePatterns: [
        'password', 'secret', 'apiKey', 'api_key', 'token', 'credential',
        'ssn', 'socialSecurity', 'creditCard', 'cardNumber', 'cvv',
        'privateKey', 'private_key', 'accessToken', 'access_token',
        'refreshToken', 'refresh_token', 'authToken', 'bearer',
        'connectionString', 'dbPassword', 'dbUser',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const sensitivePatterns = options.sensitivePatterns ?? [
      'password', 'secret', 'apiKey', 'api_key', 'token', 'credential',
      'ssn', 'creditCard', 'privateKey', 'accessToken',
    ];

    const sourceCode = context.sourceCode || context.getSourceCode();

    // Vercel AI SDK functions
    const aiSDKFunctions = ['generateText', 'streamText', 'generateObject', 'streamObject'];

    /**
     * Check if an identifier name matches sensitive patterns
     */
    function isSensitiveIdentifier(name: string): boolean {
      const lowerName = name.toLowerCase();
      return sensitivePatterns.some((pattern: string) => 
        lowerName.includes(pattern.toLowerCase())
      );
    }

    /**
     * Check if a node contains sensitive data
     */
    function findSensitiveData(node: TSESTree.Node): string | null {
      if (node.type === 'Identifier' && isSensitiveIdentifier(node.name)) {
        return node.name;
      }
      if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
        if (isSensitiveIdentifier(node.property.name)) {
          return sourceCode.getText(node);
        }
      }
      if (node.type === 'TemplateLiteral') {
        for (const expr of node.expressions) {
          const sensitive = findSensitiveData(expr);
          if (sensitive) return sensitive;
        }
      }
      if (node.type === 'BinaryExpression') {
        const leftSensitive = findSensitiveData(node.left);
        if (leftSensitive) return leftSensitive;
        const rightSensitive = findSensitiveData(node.right);
        if (rightSensitive) return rightSensitive;
      }
      return null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is an AI SDK function
        const isAIFunction = aiSDKFunctions.some(fn => callee.includes(fn));
        if (!isAIFunction) return;

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // Check prompt, system, and messages properties
        const propsToCheck = ['prompt', 'system', 'messages'];
        
        for (const prop of optionsArg.properties) {
          if (prop.type !== 'Property') continue;
          
          const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
          if (!keyName || !propsToCheck.includes(keyName)) continue;

          const sensitiveVar = findSensitiveData(prop.value);
          if (sensitiveVar) {
            context.report({
              node: prop.value,
              messageId: 'sensitiveInPrompt',
              data: { variable: sensitiveVar },
            });
          }
        }
      },
    };
  },
});
