/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
export type { ValidationFinding, ValidatorOptions } from './types';
export { validateInternalLinks } from './internal-links';
export {
  validateMdxFrontmatter,
  type FrontmatterValidatorOptions,
} from './mdx-frontmatter';
export { validateNavigationStructure } from './navigation-structure';
export {
  validatePluginTemplateConformance,
  type PluginTemplateConformanceOptions,
  type RequiredPage,
} from './plugin-template-conformance';
export {
  validateRuleDocConformance,
  DEFAULT_REQUIRED_SECTIONS,
  type RuleDocConformanceOptions,
  type RequiredSection,
} from './rule-doc-conformance';
export {
  validatePluginNameDrift,
  type PluginNameDriftOptions,
} from './plugin-name-drift';
export {
  validateInterlaceDomainDrift,
  type InterlaceDomainDriftOptions,
} from './interlace-domain-drift';
export { walkDirectory } from './walk';
