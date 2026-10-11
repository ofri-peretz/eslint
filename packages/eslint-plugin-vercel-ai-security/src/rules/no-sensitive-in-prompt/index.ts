/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent sensitive data from being passed to LLM prompts
 * @description Detects secrets, credentials, PII in prompts
 * @see OWASP LLM02: Sensitive Information Disclosure
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons, nameHasWord, propertyName } from '@interlace/eslint-devkit';
import { SYSTEM_PROMPT_PROPS, getStaticPropName } from '../../utils/prompt-props';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { sdkCallName } from '../../utils/sdk';

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-sensitive-in-prompt.md',
      description: 'Prevent sensitive data (secrets, credentials, PII) from being passed to LLM prompts',
      cwe: 'CWE-200',
      cvss: 8,
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
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { sensitivePatterns } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    /**
     * Whole words of the name, not substrings: `businessName` has no `ssn`
     * word and `maxTokens` is a count of tokens, not a token.
     */
    function isSensitiveIdentifier(name: string): boolean {
      return sensitivePatterns.some((pattern: string) => nameHasWord(name, pattern));
    }

    /**
     * Find a sensitive reference in a prompt value: a name, a property, a
     * template / concatenation part, or — for `messages` — an array element
     * or a message object's values. Calls are not entered: `redact(secret)`
     * is the fix this rule recommends.
     */
    function findSensitiveData(node: TSESTree.Node | null): string | null {
      if (node === null) return null;
      switch (node.type) {
        case 'Identifier':
          return isSensitiveIdentifier(node.name) ? node.name : null;
        case 'MemberExpression': {
          const name = propertyName(node);
          return name !== null && isSensitiveIdentifier(name) ? sourceCode.getText(node) : null;
        }
        case 'TemplateLiteral':
          return firstSensitive(node.expressions);
        case 'BinaryExpression':
          return findSensitiveData(node.left) ?? findSensitiveData(node.right);
        case 'ArrayExpression':
          return firstSensitive(node.elements);
        case 'SpreadElement':
          return findSensitiveData(node.argument);
        case 'ObjectExpression':
          return firstSensitive(
            node.properties.map((prop) => (prop.type === 'Property' ? prop.value : prop)),
          );
        default:
          return null;
      }
    }

    function firstSensitive(nodes: ReadonlyArray<TSESTree.Node | null>): string | null {
      for (const node of nodes) {
        const found = findSensitiveData(node);
        if (found) return found;
      }
      return null;
    }

    // `prompt`, the system-prompt props, and `messages`
    const propsToCheck = new Set(['prompt', 'messages', ...SYSTEM_PROMPT_PROPS]);

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!sdkCallName(node)) return;

        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        for (const prop of optionsArg.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;

          const keyName = getStaticPropName(prop);
          if (!keyName || !propsToCheck.has(keyName)) continue;

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
