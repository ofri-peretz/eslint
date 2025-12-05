/**
 * Rule Creator - Main utility for creating well-typed ESLint rules
 * 
 * Inspired by typescript-eslint's RuleCreator
 * Provides a factory function for creating rules with proper types and documentation
 */
import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * Documentation URL resolver function type
 */
type DocsUrl = (ruleName: string) => string;

/**
 * Create a rule creator with a custom documentation URL resolver
 * 
 * @param urlCreator - Function that generates documentation URLs for rules
 * @returns A rule creator function with the specified URL resolver
 * 
 * @example
 * ```typescript
 * const createRule = createRuleCreator(
 *   (name) => `https://github.com/my-org/eslint-plugin/docs/rules/${name}.md`
 * );
 * 
 * export const myRule = createRule({
 *   name: 'my-rule',
 *   meta: { ... },
 *   defaultOptions: [],
 *   create(context) { ... }
 * });
 * ```
 */
export function createRuleCreator(urlCreator: DocsUrl) {
  return ESLintUtils.RuleCreator(urlCreator);
}

/**
 * Default rule creator with a generic documentation URL pattern
 * 
 * This can be used directly if you don't need custom URL generation
 */
export const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/${name}.md`
);

/**
 * Re-export the base RuleCreator from @typescript-eslint/utils
 */
export { ESLintUtils };
