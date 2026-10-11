/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent hardcoded API keys in AI SDK calls
 * @description Detects hardcoded API keys/secrets in model configuration
 * @see OWASP ASI03: Identity & Privilege Abuse
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons, nameHasWord, objectKeyName, staticString } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-hardcoded-api-keys.md',
      description: 'Prevent hardcoded API keys in AI SDK model configuration',
      cwe: 'CWE-798',
      cvss: 8.5,
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
      apiKeyPatterns: ['apiKey', 'api_key', 'token', 'secret', 'credentials', 'authorization'],
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { apiKeyPatterns } = options as Required<Options>;

    /** The name a string is stored under: a property key or a declared variable. */
    function holderName(node: TSESTree.Node): string | null {
      const parent = node.parent;
      if (parent?.type === AST_NODE_TYPES.Property && parent.value === node) {
        return objectKeyName(parent);
      }
      if (
        parent?.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier
      ) {
        return parent.id.name;
      }
      return null;
    }

    function check(node: TSESTree.Literal | TSESTree.TemplateLiteral): void {
      const raw = staticString(node);
      if (raw === null) return;
      // `Authorization: 'Bearer sk-…'` carries the key after the scheme.
      const value = raw.replace(/^Bearer\s+/i, '');

      const holder = holderName(node);
      const isKey =
        PROVIDER_KEY_SHAPES.some((shape) => shape.test(value)) ||
        (holder !== null &&
          apiKeyPatterns.some((pattern: string) => nameHasWord(holder, pattern)) &&
          isGenericSecret(value));
      if (!isKey) return;

      context.report({
        node,
        messageId: 'hardcodedApiKey',
        data: { key: value.substring(0, 10) + '...' },
      });
    }

    return {
      Literal: check,
      TemplateLiteral: check,
    };
  },
});

/**
 * Provider key formats. Each is a fixed prefix plus a random body, and the
 * body must contain a digit — `sk-loading-spinner-…` is a CSS class.
 */
const PROVIDER_KEY_SHAPES: readonly RegExp[] = [
  /^sk-(?:proj-|ant-|svcacct-|admin-)?(?=[\w-]*\d)[\w-]{20,}$/, // OpenAI, Anthropic
  /^AIza[\w-]{35}$/, // Google
  /^(?:gsk|hf|r8)_(?=\w*\d)\w{20,}$/, // Groq, Hugging Face, Replicate
  /^(?:xai|pplx)-(?=\w*\d)\w{20,}$/, // xAI, Perplexity
  /^AKIA[0-9A-Z]{16}$/, // AWS access key id
];

/**
 * A long opaque token — not a URL, not a multi-segment resource path
 * (`projects/x/secrets/y`), not the NAME of an environment variable
 * (`OPENAI_API_KEY_PRODUCTION`), and not a placeholder.
 */
function isGenericSecret(value: string): boolean {
  return (
    value.length > 20 &&
    !value.startsWith('$') &&
    !/\s/.test(value) &&
    !value.includes('://') &&
    !(value.includes('_') && /^[A-Z][A-Z0-9_]*$/.test(value)) &&
    !/^[\w.-]+(?:\/[\w.-]+){2,}$/.test(value)
  );
}
