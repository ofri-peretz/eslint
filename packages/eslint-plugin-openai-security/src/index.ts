/**
 * eslint-plugin-openai-security
 * 
 * OpenAI SDK-specific security ESLint plugin with verifiable rules
 * for detecting and preventing vulnerabilities in OpenAI API usage.
 * 
 * @see https://github.com/ofri-peretz/eslint#readme
 */

import type { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of OpenAI SDK security rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // TODO: Add OpenAI-specific security rules
  // Example:
  // 'require-max-tokens': requireMaxTokens,
  // 'no-unvalidated-tool-calls': noUnvalidatedToolCalls,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-openai-security',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended OpenAI security configuration
   */
  recommended: {
    plugins: {
      'openai-security': plugin,
    },
    rules: {
      // TODO: Add recommended rules
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict OpenAI security configuration
   */
  strict: {
    plugins: {
      'openai-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [`openai-security/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;
