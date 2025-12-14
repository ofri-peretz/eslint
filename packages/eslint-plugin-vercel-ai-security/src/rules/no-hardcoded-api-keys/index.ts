/**
 * @fileoverview Prevent hardcoded API keys in AI SDK calls
 * @description Detects hardcoded API keys/secrets in model configuration
 * @see OWASP ASI03: Identity & Privilege Abuse
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'hardcodedApiKey';

export interface Options {
  /** Patterns that suggest API key configuration */
  apiKeyPatterns?: string[];
}

type RuleOptions = [Options?];

export const noHardcodedApiKeys = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-api-keys',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent hardcoded API keys in AI SDK model configuration',
    },
    messages: {
      hardcodedApiKey: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded API Key Detected',
        cwe: 'CWE-798',
        owasp: 'A02:2021',
        cvss: 8.5,
        description: 'Hardcoded API key "{{key}}" detected. Use environment variables instead.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS', 'GDPR'],
        fix: 'Use environment variable: apiKey: process.env.OPENAI_API_KEY',
        documentationLink: 'https://sdk.vercel.ai/docs/ai-sdk-core/settings',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          apiKeyPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Property names that contain API keys',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      apiKeyPatterns: ['apiKey', 'api_key', 'token', 'secret', 'credentials'],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const apiKeyPatterns = options.apiKeyPatterns ?? [
      'apiKey', 'api_key', 'token', 'secret', 'credentials',
    ];

    const sourceCode = context.sourceCode || context.getSourceCode();

    // Known model provider functions
    const providerFunctions = [
      'openai', 'anthropic', 'google', 'cohere', 'mistral',
      'createOpenAI', 'createAnthropic', 'createGoogle', 'createMistral',
    ];

    /**
     * Check if a string looks like an API key
     */
    function looksLikeApiKey(value: string): boolean {
      // Common API key patterns
      const patterns = [
        /^sk-[a-zA-Z0-9]{20,}$/,           // OpenAI
        /^sk-ant-[a-zA-Z0-9-]+$/,          // Anthropic
        /^[a-zA-Z0-9]{32,}$/,              // Generic long alphanumeric
        /^[A-Z0-9]{20,}$/,                 // AWS-style keys
        /^AIza[a-zA-Z0-9-_]{35}$/,         // Google AI
      ];
      return patterns.some(p => p.test(value));
    }

    return {
      Property(node: TSESTree.Property) {
        const keyName = node.key.type === 'Identifier' 
          ? node.key.name 
          : node.key.type === 'Literal' 
            ? String(node.key.value)
            : null;

        if (!keyName) return;

        // Check if this is an API key property
        const isApiKeyProp = apiKeyPatterns.some(
          (pattern: string) => keyName.toLowerCase().includes(pattern.toLowerCase())
        );

        if (!isApiKeyProp) return;

        // Check if value is a hardcoded string
        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          const value = node.value.value;
          
          // Skip placeholder values
          if (value === '' || value === 'YOUR_API_KEY' || value.startsWith('$')) {
            return;
          }

          // Report if it looks like a real API key
          if (looksLikeApiKey(value) || value.length > 20) {
            context.report({
              node: node.value,
              messageId: 'hardcodedApiKey',
              data: { key: value.substring(0, 10) + '...' },
            });
          }
        }
      },

      // Also check model provider function calls
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is a model provider function
        const isProvider = providerFunctions.some(fn => callee.includes(fn));
        if (!isProvider) return;

        // Check if second argument is options with apiKey
        const optionsArg = node.arguments[1];
        if (optionsArg && optionsArg.type === 'ObjectExpression') {
          for (const prop of optionsArg.properties) {
            if (prop.type !== 'Property') continue;
            
            const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
            if (keyName === 'apiKey' || keyName === 'api_key') {
              if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
                const value = prop.value.value;
                if (looksLikeApiKey(value) || value.length > 20) {
                  context.report({
                    node: prop.value,
                    messageId: 'hardcodedApiKey',
                    data: { key: value.substring(0, 10) + '...' },
                  });
                }
              }
            }
          }
        }
      },
    };
  },
});
