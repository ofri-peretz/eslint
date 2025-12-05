/**
 * Type definitions for eslint-plugin-react-a11y
 * 
 * This file exports all rule option types for consumers who want
 * to programmatically configure rules with type safety.
 */

// ============================================
// Anchor Rules
// ============================================

/** Options for anchor-ambiguous-text rule */
export interface AnchorAmbiguousTextOptions {
  /** Words to flag as ambiguous. Default: ['click here', 'here', 'more', 'read more'] */
  words?: string[];
}

/** Options for anchor-has-content rule */
export interface AnchorHasContentOptions {
  /** Components that render anchor elements */
  components?: string[];
}

/** Options for anchor-is-valid rule */
export interface AnchorIsValidOptions {
  /** Components that render anchor elements */
  components?: string[];
  /** Allow hash (#) as href */
  allowHash?: boolean;
}

// ============================================
// ARIA Rules
// ============================================

/** Options for aria-activedescendant-has-tabindex rule - no options currently */
export type AriaActivedescendantHasTabindexOptions = Record<string, never>;

/** Options for aria-props rule - no options currently */
export type AriaPropsOptions = Record<string, never>;

/** Options for aria-role rule */
export interface AriaRoleOptions {
  /** Allow abstract roles */
  allowAbstract?: boolean;
}

/** Options for aria-unsupported-elements rule - no options currently */
export type AriaUnsupportedElementsOptions = Record<string, never>;

// ============================================
// Form & Input Rules
// ============================================

/** Options for autocomplete-valid rule */
export interface AutocompleteValidOptions {
  /** Input types to check */
  inputTypes?: string[];
}

/** Options for control-has-associated-label rule */
export interface ControlHasAssociatedLabelOptions {
  /** Components to check */
  controlComponents?: string[];
  /** Required label sources */
  labelAttributes?: string[];
  /** Depth to search for text content */
  depth?: number;
}

/** Options for label-has-associated-control rule */
export interface LabelHasAssociatedControlOptions {
  /** Components that should be treated as labels */
  labelComponents?: string[];
  /** Attributes that establish association */
  labelAttributes?: string[];
  /** Components that should be treated as controls */
  controlComponents?: string[];
  /** Check nested control elements */
  depth?: number;
}

// ============================================
// Event Rules
// ============================================

/** Options for click-events-have-key-events rule */
export interface ClickEventsHaveKeyEventsOptions {
  /** Allow handlers for specific elements */
  allowedElements?: string[];
}

/** Options for mouse-events-have-key-events rule - no options currently */
export type MouseEventsHaveKeyEventsOptions = Record<string, never>;

// ============================================
// Content Rules
// ============================================

/** Options for heading-has-content rule */
export interface HeadingHasContentOptions {
  /** Components that render headings */
  components?: string[];
}

/** Options for html-has-lang rule - no options currently */
export type HtmlHasLangOptions = Record<string, never>;

/** Options for iframe-has-title rule - no options currently */
export type IframeHasTitleOptions = Record<string, never>;

/** Options for lang rule - no options currently */
export type LangOptions = Record<string, never>;

/** Options for media-has-caption rule */
export interface MediaHasCaptionOptions {
  /** Audio component names */
  audio?: string[];
  /** Video component names */
  video?: string[];
  /** Track component names */
  track?: string[];
}

// ============================================
// Image Rules
// ============================================

/** Options for img-redundant-alt rule */
export interface ImgRedundantAltOptions {
  /** Words to flag as redundant */
  words?: string[];
  /** Components that render images */
  components?: string[];
}

/** Options for img-requires-alt rule */
export interface ImgRequiresAltOptions {
  /** Allow aria-label as alternative to alt text */
  allowAriaLabel?: boolean;
  /** Allow aria-labelledby as alternative to alt text */
  allowAriaLabelledby?: boolean;
}

// ============================================
// Interactive Element Rules
// ============================================

/** Options for interactive-supports-focus rule */
export interface InteractiveSupportsFocusOptions {
  /** Tags to require focus support */
  tabbable?: string[];
}

/** Options for no-interactive-element-to-noninteractive-role rule - no options currently */
export type NoInteractiveElementToNoninteractiveRoleOptions = Record<string, never>;

/** Options for no-noninteractive-element-interactions rule */
export interface NoNoninteractiveElementInteractionsOptions {
  /** Handlers to check */
  handlers?: string[];
}

/** Options for no-noninteractive-element-to-interactive-role rule - no options currently */
export type NoNoninteractiveElementToInteractiveRoleOptions = Record<string, never>;

/** Options for no-noninteractive-tabindex rule */
export interface NoNoninteractiveTabindexOptions {
  /** Tags to allow tabindex on */
  allowExpressionValues?: boolean;
  /** Roles that are considered interactive */
  roles?: string[];
  /** Tags that are allowed */
  tags?: string[];
}

/** Options for no-static-element-interactions rule */
export interface NoStaticElementInteractionsOptions {
  /** Handlers to check */
  handlers?: string[];
  /** Allow expression values */
  allowExpressionValues?: boolean;
}

// ============================================
// Focus & Navigation Rules
// ============================================

/** Options for no-access-key rule - no options currently */
export type NoAccessKeyOptions = Record<string, never>;

/** Options for no-aria-hidden-on-focusable rule - no options currently */
export type NoAriaHiddenOnFocusableOptions = Record<string, never>;

/** Options for no-autofocus rule */
export interface NoAutofocusOptions {
  /** Ignore non-DOM elements */
  ignoreNonDOM?: boolean;
}

/** Options for no-keyboard-inaccessible-elements rule - no options currently */
export type NoKeyboardInaccessibleElementsOptions = Record<string, never>;

/** Options for tabindex-no-positive rule - no options currently */
export type TabindexNoPositiveOptions = Record<string, never>;

// ============================================
// Visual & Distraction Rules
// ============================================

/** Options for no-distracting-elements rule */
export interface NoDistractingElementsOptions {
  /** Elements to flag */
  elements?: string[];
}

/** Options for no-missing-aria-labels rule - no options currently */
export type NoMissingAriaLabelsOptions = Record<string, never>;

/** Options for no-redundant-roles rule - no options currently */
export type NoRedundantRolesOptions = Record<string, never>;

// ============================================
// Role Rules
// ============================================

/** Options for role-has-required-aria-props rule - no options currently */
export type RoleHasRequiredAriaPropsOptions = Record<string, never>;

/** Options for role-supports-aria-props rule - no options currently */
export type RoleSupportsAriaPropsOptions = Record<string, never>;

/** Options for prefer-tag-over-role rule - no options currently */
export type PreferTagOverRoleOptions = Record<string, never>;

// ============================================
// Scope Rule
// ============================================

/** Options for scope rule - no options currently */
export type ScopeOptions = Record<string, never>;

// ============================================
// Combined Type
// ============================================

/**
 * Combined type for all accessibility rule options
 * Useful for creating configuration utilities
 */
export interface AllAccessibilityRulesOptions {
  // Anchor rules
  'anchor-ambiguous-text'?: AnchorAmbiguousTextOptions;
  'anchor-has-content'?: AnchorHasContentOptions;
  'anchor-is-valid'?: AnchorIsValidOptions;
  
  // ARIA rules
  'aria-activedescendant-has-tabindex'?: AriaActivedescendantHasTabindexOptions;
  'aria-props'?: AriaPropsOptions;
  'aria-role'?: AriaRoleOptions;
  'aria-unsupported-elements'?: AriaUnsupportedElementsOptions;
  
  // Form & Input rules
  'autocomplete-valid'?: AutocompleteValidOptions;
  'control-has-associated-label'?: ControlHasAssociatedLabelOptions;
  'label-has-associated-control'?: LabelHasAssociatedControlOptions;
  
  // Event rules
  'click-events-have-key-events'?: ClickEventsHaveKeyEventsOptions;
  'mouse-events-have-key-events'?: MouseEventsHaveKeyEventsOptions;
  
  // Content rules
  'heading-has-content'?: HeadingHasContentOptions;
  'html-has-lang'?: HtmlHasLangOptions;
  'iframe-has-title'?: IframeHasTitleOptions;
  'lang'?: LangOptions;
  'media-has-caption'?: MediaHasCaptionOptions;
  
  // Image rules
  'img-redundant-alt'?: ImgRedundantAltOptions;
  'img-requires-alt'?: ImgRequiresAltOptions;
  
  // Interactive element rules
  'interactive-supports-focus'?: InteractiveSupportsFocusOptions;
  'no-interactive-element-to-noninteractive-role'?: NoInteractiveElementToNoninteractiveRoleOptions;
  'no-noninteractive-element-interactions'?: NoNoninteractiveElementInteractionsOptions;
  'no-noninteractive-element-to-interactive-role'?: NoNoninteractiveElementToInteractiveRoleOptions;
  'no-noninteractive-tabindex'?: NoNoninteractiveTabindexOptions;
  'no-static-element-interactions'?: NoStaticElementInteractionsOptions;
  
  // Focus & Navigation rules
  'no-access-key'?: NoAccessKeyOptions;
  'no-aria-hidden-on-focusable'?: NoAriaHiddenOnFocusableOptions;
  'no-autofocus'?: NoAutofocusOptions;
  'no-keyboard-inaccessible-elements'?: NoKeyboardInaccessibleElementsOptions;
  'tabindex-no-positive'?: TabindexNoPositiveOptions;
  
  // Visual & Distraction rules
  'no-distracting-elements'?: NoDistractingElementsOptions;
  'no-missing-aria-labels'?: NoMissingAriaLabelsOptions;
  'no-redundant-roles'?: NoRedundantRolesOptions;
  
  // Role rules
  'role-has-required-aria-props'?: RoleHasRequiredAriaPropsOptions;
  'role-supports-aria-props'?: RoleSupportsAriaPropsOptions;
  'prefer-tag-over-role'?: PreferTagOverRoleOptions;
  
  // Scope rule
  'scope'?: ScopeOptions;
}
