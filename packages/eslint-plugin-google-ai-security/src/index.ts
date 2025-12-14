/**
 * eslint-plugin-google-ai-security
 * 
 * Google AI SDK-specific security ESLint plugin with verifiable rules
 * for detecting and preventing vulnerabilities in Google AI API usage.
 * 
 * @see https://github.com/ofri-peretz/eslint#readme
 */

import type { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of Google AI SDK security rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // TODO: Add Google AI-specific security rules
  // Example:
  // 'require-max-tokens': requireMaxTokens,
  // 'no-unvalidated-tool-calls': noUnvalidatedToolCalls,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-google-ai-security',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended Google AI security configuration
   */
  recommended: {
    plugins: {
      'google-ai-security': plugin,
    },
    rules: {
      // TODO: Add recommended rules
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict Google AI security configuration
   */
  strict: {
    plugins: {
      'google-ai-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [`google-ai-security/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;
