/**
 * eslint-plugin-agentic-security
 * 
 * ⚠️ DEPRECATED: This package has been deprecated in favor of SDK-specific ESLint plugins.
 * 
 * Agentic AI security rules that guess SDK interfaces are fundamentally unreliable.
 * Each SDK (OpenAI, Anthropic, LangChain, etc.) has different APIs.
 * 
 * MIGRATION:
 * - For cross-vendor security: Use eslint-plugin-secure-coding
 * - For SDK-specific security: Coming soon - eslint-plugin-openai-security, etc.
 * 
 * @see https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-agentic-security/README.md
 * @deprecated Use SDK-specific ESLint plugins instead
 */

import type { TSESLint } from '@interlace/eslint-devkit';

/**
 * @deprecated This plugin is deprecated. Use SDK-specific plugins instead.
 * 
 * Rules have been removed because they relied on guessing SDK interfaces
 * (e.g., `llm.complete`, `openai.chat`), which is unreliable.
 * 
 * Coming soon:
 * - eslint-plugin-openai-security
 * - eslint-plugin-langchain-security
 * - eslint-plugin-anthropic-security
 * - eslint-plugin-vercel-ai-security
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // All rules have been deprecated
  // SDK-specific rules will be in separate packages
};

/**
 * @deprecated This plugin is deprecated. Use SDK-specific plugins instead.
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-agentic-security',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * @deprecated This plugin is deprecated. Use SDK-specific plugins instead.
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * @deprecated All configurations are deprecated.
   * Use eslint-plugin-secure-coding for cross-vendor security.
   */
  recommended: {
    plugins: {
      'agentic-security': plugin,
    },
    rules: {},
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * @deprecated Use SDK-specific ESLint plugins instead.
 */
export default plugin;

// Re-export types
export type {} from './types/index';
