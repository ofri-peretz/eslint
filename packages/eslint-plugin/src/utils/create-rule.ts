/**
 * Rule creator utility - Re-exported from @forge-js/eslint-plugin-utils
 * 
 * This provides a consistent way to create rules across the plugin
 */
import { createRuleCreator } from '@forge-js/eslint-plugin-utils';

/**
 * Create a rule with proper documentation links for this plugin
 */
export const createRule = createRuleCreator(
  (name) =>
    `https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin-llm-optimized/docs/rules/${name}.md`
);

/**
 * Re-export utilities from the utils package
 */
export * from '@forge-js/eslint-plugin-utils';
