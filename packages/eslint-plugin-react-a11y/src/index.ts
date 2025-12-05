/**
 * eslint-plugin-react-a11y
 * 
 * A comprehensive React accessibility ESLint plugin with 37 LLM-optimized rules
 * for detecting and preventing accessibility violations in React/JSX code.
 * 
 * Features:
 * - WCAG 2.1 Level A, AA, and AAA compliance
 * - LLM-optimized error messages with fix suggestions
 * - Auto-fix capabilities where safe
 * - Structured context for AI assistants
 * 
 * @see https://github.com/ofri-peretz/forge-js#readme
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Anchor rules
import { anchorAmbiguousText } from './rules/anchor-ambiguous-text';
import { anchorHasContent } from './rules/anchor-has-content';
import { anchorIsValid } from './rules/anchor-is-valid';

// ARIA rules
import { ariaActivedescendantHasTabindex } from './rules/aria-activedescendant-has-tabindex';
import { ariaProps } from './rules/aria-props';
import { ariaRole } from './rules/aria-role';
import { ariaUnsupportedElements } from './rules/aria-unsupported-elements';

// Form & Input rules
import { autocompleteValid } from './rules/autocomplete-valid';
import { controlHasAssociatedLabel } from './rules/control-has-associated-label';
import { labelHasAssociatedControl } from './rules/label-has-associated-control';

// Event rules
import { clickEventsHaveKeyEvents } from './rules/click-events-have-key-events';
import { mouseEventsHaveKeyEvents } from './rules/mouse-events-have-key-events';

// Content rules
import { headingHasContent } from './rules/heading-has-content';
import { htmlHasLang } from './rules/html-has-lang';
import { iframeHasTitle } from './rules/iframe-has-title';
import { lang } from './rules/lang';
import { mediaHasCaption } from './rules/media-has-caption';

// Image rules
import { imgRedundantAlt } from './rules/img-redundant-alt';
import { imgRequiresAlt } from './rules/img-requires-alt';

// Interactive element rules
import { interactiveSupportsFocus } from './rules/interactive-supports-focus';
import { noInteractiveElementToNoninteractiveRole } from './rules/no-interactive-element-to-noninteractive-role';
import { noNoninteractiveElementInteractions } from './rules/no-noninteractive-element-interactions';
import { noNoninteractiveElementToInteractiveRole } from './rules/no-noninteractive-element-to-interactive-role';
import { noNoninteractiveTabindex } from './rules/no-noninteractive-tabindex';
import { noStaticElementInteractions } from './rules/no-static-element-interactions';

// Focus & Navigation rules
import { noAccessKey } from './rules/no-access-key';
import { noAriaHiddenOnFocusable } from './rules/no-aria-hidden-on-focusable';
import { noAutofocus } from './rules/no-autofocus';
import { noKeyboardInaccessibleElements } from './rules/no-keyboard-inaccessible-elements';
import { tabindexNoPositive } from './rules/tabindex-no-positive';

// Visual & Distraction rules
import { noDistractingElements } from './rules/no-distracting-elements';
import { noMissingAriaLabels } from './rules/no-missing-aria-labels';
import { noRedundantRoles } from './rules/no-redundant-roles';

// Role rules
import { roleHasRequiredAriaProps } from './rules/role-has-required-aria-props';
import { roleSupportsAriaProps } from './rules/role-supports-aria-props';
import { preferTagOverRole } from './rules/prefer-tag-over-role';

// Scope rule
import { scope } from './rules/scope';

/**
 * Collection of all accessibility ESLint rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // Anchor rules
  'anchor-ambiguous-text': anchorAmbiguousText,
  'anchor-has-content': anchorHasContent,
  'anchor-is-valid': anchorIsValid,
  
  // ARIA rules
  'aria-activedescendant-has-tabindex': ariaActivedescendantHasTabindex,
  'aria-props': ariaProps,
  'aria-role': ariaRole,
  'aria-unsupported-elements': ariaUnsupportedElements,
  
  // Form & Input rules
  'autocomplete-valid': autocompleteValid,
  'control-has-associated-label': controlHasAssociatedLabel,
  'label-has-associated-control': labelHasAssociatedControl,
  
  // Event rules
  'click-events-have-key-events': clickEventsHaveKeyEvents,
  'mouse-events-have-key-events': mouseEventsHaveKeyEvents,
  
  // Content rules
  'heading-has-content': headingHasContent,
  'html-has-lang': htmlHasLang,
  'iframe-has-title': iframeHasTitle,
  'lang': lang,
  'media-has-caption': mediaHasCaption,
  
  // Image rules
  'img-redundant-alt': imgRedundantAlt,
  'img-requires-alt': imgRequiresAlt,
  
  // Interactive element rules
  'interactive-supports-focus': interactiveSupportsFocus,
  'no-interactive-element-to-noninteractive-role': noInteractiveElementToNoninteractiveRole,
  'no-noninteractive-element-interactions': noNoninteractiveElementInteractions,
  'no-noninteractive-element-to-interactive-role': noNoninteractiveElementToInteractiveRole,
  'no-noninteractive-tabindex': noNoninteractiveTabindex,
  'no-static-element-interactions': noStaticElementInteractions,
  
  // Focus & Navigation rules
  'no-access-key': noAccessKey,
  'no-aria-hidden-on-focusable': noAriaHiddenOnFocusable,
  'no-autofocus': noAutofocus,
  'no-keyboard-inaccessible-elements': noKeyboardInaccessibleElements,
  'tabindex-no-positive': tabindexNoPositive,
  
  // Visual & Distraction rules
  'no-distracting-elements': noDistractingElements,
  'no-missing-aria-labels': noMissingAriaLabels,
  'no-redundant-roles': noRedundantRoles,
  
  // Role rules
  'role-has-required-aria-props': roleHasRequiredAriaProps,
  'role-supports-aria-props': roleSupportsAriaProps,
  'prefer-tag-over-role': preferTagOverRole,
  
  // Scope rule
  'scope': scope,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-react-a11y',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for accessibility rules
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended accessibility configuration
   * 
   * Enables critical accessibility rules with sensible severity levels:
   * - WCAG Level A violations as errors
   * - WCAG Level AA/AAA as warnings
   */
  recommended: {
    plugins: {
      'react-a11y': plugin,
    },
    rules: {
      // WCAG 2.1 Level A - Critical (errors)
      'react-a11y/img-requires-alt': 'error',
      'react-a11y/anchor-has-content': 'error',
      'react-a11y/aria-props': 'error',
      'react-a11y/aria-role': 'error',
      'react-a11y/aria-unsupported-elements': 'error',
      'react-a11y/role-has-required-aria-props': 'error',
      'react-a11y/role-supports-aria-props': 'error',
      'react-a11y/html-has-lang': 'error',
      'react-a11y/lang': 'error',
      'react-a11y/heading-has-content': 'error',
      'react-a11y/iframe-has-title': 'error',
      'react-a11y/no-distracting-elements': 'error',
      'react-a11y/scope': 'error',
      'react-a11y/no-aria-hidden-on-focusable': 'error',
      
      // WCAG 2.1 Level A - Keyboard accessibility
      'react-a11y/click-events-have-key-events': 'error',
      'react-a11y/no-keyboard-inaccessible-elements': 'error',
      'react-a11y/interactive-supports-focus': 'error',
      'react-a11y/no-noninteractive-element-interactions': 'warn',
      'react-a11y/no-static-element-interactions': 'warn',
      
      // WCAG 2.1 Level AA - Important (warnings)
      'react-a11y/anchor-is-valid': 'warn',
      'react-a11y/anchor-ambiguous-text': 'warn',
      'react-a11y/autocomplete-valid': 'warn',
      'react-a11y/control-has-associated-label': 'warn',
      'react-a11y/label-has-associated-control': 'warn',
      'react-a11y/media-has-caption': 'warn',
      'react-a11y/mouse-events-have-key-events': 'warn',
      'react-a11y/no-access-key': 'warn',
      'react-a11y/no-autofocus': 'warn',
      'react-a11y/no-redundant-roles': 'warn',
      'react-a11y/tabindex-no-positive': 'warn',
      'react-a11y/aria-activedescendant-has-tabindex': 'warn',
      
      // Best practices (warnings)
      'react-a11y/img-redundant-alt': 'warn',
      'react-a11y/no-missing-aria-labels': 'warn',
      'react-a11y/prefer-tag-over-role': 'warn',
      'react-a11y/no-interactive-element-to-noninteractive-role': 'warn',
      'react-a11y/no-noninteractive-element-to-interactive-role': 'warn',
      'react-a11y/no-noninteractive-tabindex': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict accessibility configuration
   * 
   * All accessibility rules set to 'error' for maximum WCAG compliance
   */
  strict: {
    plugins: {
      'react-a11y': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [`react-a11y/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * WCAG 2.1 Level A configuration
   * 
   * Only rules required for WCAG 2.1 Level A compliance
   */
  'wcag-a': {
    plugins: {
      'react-a11y': plugin,
    },
    rules: {
      // 1.1.1 Non-text Content
      'react-a11y/img-requires-alt': 'error',
      
      // 1.3.1 Info and Relationships
      'react-a11y/heading-has-content': 'error',
      'react-a11y/scope': 'error',
      'react-a11y/role-has-required-aria-props': 'error',
      
      // 2.1.1 Keyboard
      'react-a11y/click-events-have-key-events': 'error',
      'react-a11y/no-keyboard-inaccessible-elements': 'error',
      'react-a11y/interactive-supports-focus': 'error',
      
      // 2.4.4 Link Purpose
      'react-a11y/anchor-has-content': 'error',
      
      // 3.1.1 Language of Page
      'react-a11y/html-has-lang': 'error',
      'react-a11y/lang': 'error',
      
      // 4.1.1 Parsing
      'react-a11y/aria-props': 'error',
      'react-a11y/aria-role': 'error',
      'react-a11y/aria-unsupported-elements': 'error',
      
      // 4.1.2 Name, Role, Value
      'react-a11y/role-supports-aria-props': 'error',
      'react-a11y/iframe-has-title': 'error',
      
      // 2.3.1 Three Flashes or Below Threshold
      'react-a11y/no-distracting-elements': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * WCAG 2.1 Level AA configuration
   * 
   * Includes Level A + additional rules for Level AA compliance
   */
  'wcag-aa': {
    plugins: {
      'react-a11y': plugin,
    },
    rules: {
      // All Level A rules
      'react-a11y/img-requires-alt': 'error',
      'react-a11y/heading-has-content': 'error',
      'react-a11y/scope': 'error',
      'react-a11y/role-has-required-aria-props': 'error',
      'react-a11y/click-events-have-key-events': 'error',
      'react-a11y/no-keyboard-inaccessible-elements': 'error',
      'react-a11y/interactive-supports-focus': 'error',
      'react-a11y/anchor-has-content': 'error',
      'react-a11y/html-has-lang': 'error',
      'react-a11y/lang': 'error',
      'react-a11y/aria-props': 'error',
      'react-a11y/aria-role': 'error',
      'react-a11y/aria-unsupported-elements': 'error',
      'react-a11y/role-supports-aria-props': 'error',
      'react-a11y/iframe-has-title': 'error',
      'react-a11y/no-distracting-elements': 'error',
      
      // Level AA additions
      // 1.2.4 Captions (Live) & 1.2.5 Audio Description
      'react-a11y/media-has-caption': 'error',
      
      // 1.3.5 Identify Input Purpose
      'react-a11y/autocomplete-valid': 'error',
      
      // 1.4.4 Resize text (no autofocus related)
      'react-a11y/no-autofocus': 'error',
      
      // 2.4.6 Headings and Labels
      'react-a11y/control-has-associated-label': 'error',
      'react-a11y/label-has-associated-control': 'error',
      
      // 2.4.7 Focus Visible
      'react-a11y/tabindex-no-positive': 'error',
      'react-a11y/no-aria-hidden-on-focusable': 'error',
      
      // 3.2.1 On Focus
      'react-a11y/mouse-events-have-key-events': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

/**
 * Re-export types (will be created in types/index.ts)
 */
export * from './types/index';
