/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-react-features
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

// React rules
import { requiredAttributes } from './rules/react/required-attributes';
import { jsxKey } from './rules/react/jsx-key';
import { noDirectMutationState } from './rules/react/no-direct-mutation-state';
import { requireOptimization } from './rules/react/require-optimization';
import { noSetState } from './rules/react/no-set-state';
import { noThisInSfc } from './rules/react/no-this-in-sfc';
import { noAccessStateInSetState } from './rules/react/no-access-state-in-setstate';
import { noChildrenProp } from './rules/react/no-children-prop';
import { noDanger } from './rules/react/no-danger';
import { noStringRefs } from './rules/react/no-string-refs';
import { noUnknownProperty } from './rules/react/no-unknown-property';
import { checkedRequiresOnchangeOrReadonly } from './rules/react/checked-requires-onchange-or-readonly';
import { defaultPropsMatchPropTypes } from './rules/react/default-props-match-prop-types';
import { displayName } from './rules/react/display-name';
import { jsxHandlerNames } from './rules/react/jsx-handler-names';
import { jsxMaxDepth } from './rules/react/jsx-max-depth';
import { jsxNoBind } from './rules/react/jsx-no-bind';
import { jsxNoLiterals } from './rules/react/jsx-no-literals';
import { noAdjacentInlineElements } from './rules/react/no-adjacent-inline-elements';
import { noArrowFunctionLifecycle } from './rules/react/no-arrow-function-lifecycle';
import { noDidMountSetState } from './rules/react/no-did-mount-set-state';
import { noDidUpdateSetState } from './rules/react/no-did-update-set-state';
import { noInvalidHtmlAttribute } from './rules/react/no-invalid-html-attribute';
import { noIsMounted } from './rules/react/no-is-mounted';
import { noMultiComp } from './rules/react/no-multi-comp';
import { noNamespace } from './rules/react/no-namespace';
import { noObjectTypeAsDefaultProp } from './rules/react/no-object-type-as-default-prop';
import { noRedundantShouldComponentUpdate } from './rules/react/no-redundant-should-component-update';
import { noRenderReturnValue } from './rules/react/no-render-return-value';
import { noTypos } from './rules/react/no-typos';
import { noUnescapedEntities } from './rules/react/no-unescaped-entities';
import { preferEs6Class } from './rules/react/prefer-es6-class';
import { preferStatelessFunction } from './rules/react/prefer-stateless-function';
import { propTypes } from './rules/react/prop-types';
import { reactInJsxScope } from './rules/react/react-in-jsx-scope';
import { requireDefaultProps } from './rules/react/require-default-props';
import { requireRenderReturn } from './rules/react/require-render-return';
import { sortComp } from './rules/react/sort-comp';
import { stateInConstructor } from './rules/react/state-in-constructor';
import { staticPropertyPlacement } from './rules/react/static-property-placement';
import { hooksExhaustiveDeps } from './rules/react/hooks-exhaustive-deps';

// Security rules
import { jsxNoTargetBlank } from './rules/react/jsx-no-target-blank';
import { jsxNoScriptUrl } from './rules/react/jsx-no-script-url';
import { jsxNoDuplicateProps } from './rules/react/jsx-no-duplicate-props';
import { noDangerWithChildren } from './rules/react/no-danger-with-children';
import { noDeprecated } from './rules/react/no-deprecated';

// JSX scope and correctness rules (eslint-plugin-react's recommended set)
import { jsxNoCommentTextnodes } from './rules/react/jsx-no-comment-textnodes';
import { jsxNoUndef } from './rules/react/jsx-no-undef';
import { jsxUsesReact } from './rules/react/jsx-uses-react';
import { jsxUsesVars } from './rules/react/jsx-uses-vars';

// Deprecated API rules
import { noFindDomNode } from './rules/react/no-find-dom-node';
import { noUnsafe } from './rules/react/no-unsafe';
import { voidDomElementsNoChildren } from './rules/react/void-dom-elements-no-children';

// Migration rules
import { reactClassToHooks } from './rules/migration/react-class-to-hooks';

// React Performance rules
import { noUnnecessaryRerenders } from './rules/performance/no-unnecessary-rerenders';
import { reactRenderOptimization } from './rules/performance/react-render-optimization';
import { reactNoInlineFunctions } from './rules/performance/react-no-inline-functions';

// Component-API rules (interlace-component skill R5/R6/R8/R11/R12/R18/R19)
import { noDefaultTestId } from './rules/component-api/no-default-test-id';
import { requireDataSlot } from './rules/component-api/require-data-slot';
import { noIsPrefixProp } from './rules/component-api/no-is-prefix-prop';
import { noInlineStyle } from './rules/component-api/no-inline-style';
import { noRawColorLiteral } from './rules/component-api/no-raw-color-literal';
import { noArbitraryTokenClass } from './rules/component-api/no-arbitrary-token-class';
import { noKindPropDiscriminator } from './rules/component-api/no-kind-prop-discriminator';
import { noWrapperSubComponent } from './rules/component-api/no-wrapper-sub-component';

export const rules = {
  // Flat names
  'required-attributes': requiredAttributes,
  'jsx-key': jsxKey,
  'no-direct-mutation-state': noDirectMutationState,
  'require-optimization': requireOptimization,
  'no-set-state': noSetState,
  'no-this-in-sfc': noThisInSfc,
  'no-access-state-in-setstate': noAccessStateInSetState,
  'no-children-prop': noChildrenProp,
  'no-danger': noDanger,
  'no-string-refs': noStringRefs,
  'no-unknown-property': noUnknownProperty,
  'checked-requires-onchange-or-readonly': checkedRequiresOnchangeOrReadonly,
  'default-props-match-prop-types': defaultPropsMatchPropTypes,
  'display-name': displayName,
  'jsx-handler-names': jsxHandlerNames,
  'jsx-max-depth': jsxMaxDepth,
  'jsx-no-bind': jsxNoBind,
  'jsx-no-literals': jsxNoLiterals,
  'no-adjacent-inline-elements': noAdjacentInlineElements,
  'no-arrow-function-lifecycle': noArrowFunctionLifecycle,
  'no-did-mount-set-state': noDidMountSetState,
  'no-did-update-set-state': noDidUpdateSetState,
  'no-invalid-html-attribute': noInvalidHtmlAttribute,
  'no-is-mounted': noIsMounted,
  'no-multi-comp': noMultiComp,
  'no-namespace': noNamespace,
  'no-object-type-as-default-prop': noObjectTypeAsDefaultProp,
  'no-redundant-should-component-update': noRedundantShouldComponentUpdate,
  'no-render-return-value': noRenderReturnValue,
  'no-typos': noTypos,
  'no-unescaped-entities': noUnescapedEntities,
  'prefer-es6-class': preferEs6Class,
  'prefer-stateless-function': preferStatelessFunction,
  'prop-types': propTypes,
  'react-in-jsx-scope': reactInJsxScope,
  'require-default-props': requireDefaultProps,
  'require-render-return': requireRenderReturn,
  'sort-comp': sortComp,
  'state-in-constructor': stateInConstructor,
  'static-property-placement': staticPropertyPlacement,
  'hooks-exhaustive-deps': hooksExhaustiveDeps,
  
  // Security and bug prevention
  'jsx-no-target-blank': jsxNoTargetBlank,
  'jsx-no-script-url': jsxNoScriptUrl,
  'jsx-no-duplicate-props': jsxNoDuplicateProps,
  'no-danger-with-children': noDangerWithChildren,
  'no-deprecated': noDeprecated,
  'jsx-no-comment-textnodes': jsxNoCommentTextnodes,
  'jsx-no-undef': jsxNoUndef,
  'jsx-uses-react': jsxUsesReact,
  'jsx-uses-vars': jsxUsesVars,
  
  // Deprecated API rules
  'no-find-dom-node': noFindDomNode,
  'no-unsafe': noUnsafe,
  'void-dom-elements-no-children': voidDomElementsNoChildren,
  
  'react-class-to-hooks': reactClassToHooks,
  'no-unnecessary-rerenders': noUnnecessaryRerenders,
  'react-render-optimization': reactRenderOptimization,
  'react-no-inline-functions': reactNoInlineFunctions,

  // Component-API (flat)
  'no-default-test-id': noDefaultTestId,
  'require-data-slot': requireDataSlot,
  'no-is-prefix-prop': noIsPrefixProp,
  'no-inline-style': noInlineStyle,
  'no-raw-color-literal': noRawColorLiteral,
  'no-arbitrary-token-class': noArbitraryTokenClass,
  'no-kind-prop-discriminator': noKindPropDiscriminator,
  'no-wrapper-sub-component': noWrapperSubComponent,

  // Categorized names
  'react/required-attributes': requiredAttributes,
  'react/jsx-key': jsxKey,
  'react/no-direct-mutation-state': noDirectMutationState,
  'react/require-optimization': requireOptimization,
  'react/no-set-state': noSetState,
  'react/no-this-in-sfc': noThisInSfc,
  'react/no-access-state-in-setstate': noAccessStateInSetState,
  'react/no-children-prop': noChildrenProp,
  'react/no-danger': noDanger,
  'react/no-string-refs': noStringRefs,
  'react/no-unknown-property': noUnknownProperty,
  'react/checked-requires-onchange-or-readonly': checkedRequiresOnchangeOrReadonly,
  'react/default-props-match-prop-types': defaultPropsMatchPropTypes,
  'react/display-name': displayName,
  'react/jsx-handler-names': jsxHandlerNames,
  'react/jsx-max-depth': jsxMaxDepth,
  'react/jsx-no-bind': jsxNoBind,
  'react/jsx-no-literals': jsxNoLiterals,
  'react/no-adjacent-inline-elements': noAdjacentInlineElements,
  'react/no-arrow-function-lifecycle': noArrowFunctionLifecycle,
  'react/no-did-mount-set-state': noDidMountSetState,
  'react/no-did-update-set-state': noDidUpdateSetState,
  'react/no-invalid-html-attribute': noInvalidHtmlAttribute,
  'react/no-is-mounted': noIsMounted,
  'react/no-multi-comp': noMultiComp,
  'react/no-namespace': noNamespace,
  'react/no-object-type-as-default-prop': noObjectTypeAsDefaultProp,
  'react/no-redundant-should-component-update': noRedundantShouldComponentUpdate,
  'react/no-render-return-value': noRenderReturnValue,
  'react/no-typos': noTypos,
  'react/no-unescaped-entities': noUnescapedEntities,
  'react/prefer-es6-class': preferEs6Class,
  'react/prefer-stateless-function': preferStatelessFunction,
  'react/prop-types': propTypes,
  'react/react-in-jsx-scope': reactInJsxScope,
  'react/require-default-props': requireDefaultProps,
  'react/require-render-return': requireRenderReturn,
  'react/sort-comp': sortComp,
  'react/state-in-constructor': stateInConstructor,
  'react/static-property-placement': staticPropertyPlacement,
  'react/hooks-exhaustive-deps': hooksExhaustiveDeps,

  // Security and bug prevention (categorized)
  'react/jsx-no-target-blank': jsxNoTargetBlank,
  'react/jsx-no-script-url': jsxNoScriptUrl,
  'react/jsx-no-duplicate-props': jsxNoDuplicateProps,
  'react/no-danger-with-children': noDangerWithChildren,
  'react/no-deprecated': noDeprecated,
  'react/jsx-no-comment-textnodes': jsxNoCommentTextnodes,
  'react/jsx-no-undef': jsxNoUndef,
  'react/jsx-uses-react': jsxUsesReact,
  'react/jsx-uses-vars': jsxUsesVars,

  // Deprecated API rules (categorized)
  'react/no-find-dom-node': noFindDomNode,
  'react/no-unsafe': noUnsafe,
  'react/void-dom-elements-no-children': voidDomElementsNoChildren,

  'migration/react-class-to-hooks': reactClassToHooks,
  'performance/no-unnecessary-rerenders': noUnnecessaryRerenders,
  'performance/react-render-optimization': reactRenderOptimization,
  'performance/react-no-inline-functions': reactNoInlineFunctions,

  // Component-API (categorized) — interlace-component skill R5/R6/R8/R11/R12/R18/R19
  'component-api/no-default-test-id': noDefaultTestId,
  'component-api/require-data-slot': requireDataSlot,
  'component-api/no-is-prefix-prop': noIsPrefixProp,
  'component-api/no-inline-style': noInlineStyle,
  'component-api/no-raw-color-literal': noRawColorLiteral,
  'component-api/no-arbitrary-token-class': noArbitraryTokenClass,
  'component-api/no-kind-prop-discriminator': noKindPropDiscriminator,
  'component-api/no-wrapper-sub-component': noWrapperSubComponent,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-react-features', rules);


export const plugin = {
  meta: {
    name: 'eslint-plugin-react-features',
    version: '2.2.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

const nativeConfigs = {
  /**
   * Flagship preset — the rule from this plugin in the ecosystem-wide
   * flagship list (`.agent/flagship-rules.md`). Head-to-head with
   * `react-hooks/exhaustive-deps` — same scope, more permissive context
   * detection (catches non-array deps, TS `as const` cast deps).
   */
  flagship: {
    plugins: {
      'react-features': plugin,
    },
    rules: {
      'react-features/hooks-exhaustive-deps': 'error',
    },
  },

  recommended: {
    plugins: {
      'react-features': plugin,
    },
    rules: {
      'react-features/jsx-key': 'error',
      'react-features/no-children-prop': 'warn',
      'react-features/no-danger': 'warn',
      'react-features/no-string-refs': 'error',
      'react-features/no-unknown-property': 'error',
      'react-features/hooks-exhaustive-deps': 'warn',
      // Security rules
      'react-features/jsx-no-target-blank': 'error',
      'react-features/jsx-no-script-url': 'error',
      'react-features/jsx-no-duplicate-props': 'error',
      'react-features/no-danger-with-children': 'error',
      'react-features/no-deprecated': 'warn',
      // Performance rules are opt-in: they flag inline objects/arrays/functions which
      // are very common patterns in React codebases. They belong in the performance
      // preset, not recommended — the FP rate in general codebases is too high.
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Component-API preset — enforces the mechanical rules from the
   * `interlace-component` skill (R5/R6/R8/R11/R12/R18/R19). Apply this to any
   * package that ships shared React components (registry, design-system,
   * @interlace/ui).
   */
  componentApi: {
    plugins: {
      'react-features': plugin,
    },
    rules: {
      'react-features/component-api/no-default-test-id': 'error',
      'react-features/component-api/require-data-slot': 'warn',
      'react-features/component-api/no-is-prefix-prop': 'warn',
      'react-features/component-api/no-inline-style': 'warn',
      'react-features/component-api/no-raw-color-literal': 'warn',
      'react-features/component-api/no-arbitrary-token-class': 'warn',
      'react-features/component-api/no-kind-prop-discriminator': 'warn',
      'react-features/component-api/no-wrapper-sub-component': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

/**
 * Presets for using this package as an npm alias for eslint-plugin-react
 * (`"eslint-plugin-react": "npm:eslint-plugin-react-features@x"`).
 *
 * Shape and rule ids copied from eslint-plugin-react 7.37.5 `index.js`: rule ids
 * are `react/<rule>`, `all` and `jsx-runtime` are legacy-shaped (`plugins` is a
 * name list) so a spread of `.rules` works, and `flat.*` register the plugin as
 * `react`. Only rules this package exports are listed; none of upstream's other
 * rules are claimed.
 */
const ERROR = 2 as const;
const OFF = 0 as const;

/** Non-deprecated rule names of eslint-plugin-react 7.37.5 (lib/rules). */
const UPSTREAM_ACTIVE_RULES = new Set([
  'boolean-prop-naming', 'button-has-type', 'checked-requires-onchange-or-readonly',
  'default-props-match-prop-types', 'destructuring-assignment', 'display-name',
  'forbid-component-props', 'forbid-dom-props', 'forbid-elements',
  'forbid-foreign-prop-types', 'forbid-prop-types', 'forward-ref-uses-ref',
  'function-component-definition', 'hook-use-state', 'iframe-missing-sandbox',
  'jsx-boolean-value', 'jsx-child-element-spacing', 'jsx-closing-bracket-location',
  'jsx-closing-tag-location', 'jsx-curly-brace-presence', 'jsx-curly-newline',
  'jsx-curly-spacing', 'jsx-equals-spacing', 'jsx-filename-extension',
  'jsx-first-prop-new-line', 'jsx-fragments', 'jsx-handler-names', 'jsx-indent-props',
  'jsx-indent', 'jsx-key', 'jsx-max-depth', 'jsx-max-props-per-line', 'jsx-newline',
  'jsx-no-bind', 'jsx-no-comment-textnodes', 'jsx-no-constructed-context-values',
  'jsx-no-duplicate-props', 'jsx-no-leaked-render', 'jsx-no-literals',
  'jsx-no-script-url', 'jsx-no-target-blank', 'jsx-no-undef', 'jsx-no-useless-fragment',
  'jsx-one-expression-per-line', 'jsx-pascal-case', 'jsx-props-no-multi-spaces',
  'jsx-props-no-spread-multi', 'jsx-props-no-spreading', 'jsx-sort-props',
  'jsx-tag-spacing', 'jsx-uses-react', 'jsx-uses-vars', 'jsx-wrap-multilines',
  'no-access-state-in-setstate', 'no-adjacent-inline-elements', 'no-array-index-key',
  'no-arrow-function-lifecycle', 'no-children-prop', 'no-danger-with-children',
  'no-danger', 'no-deprecated', 'no-did-mount-set-state', 'no-did-update-set-state',
  'no-direct-mutation-state', 'no-find-dom-node', 'no-invalid-html-attribute',
  'no-is-mounted', 'no-multi-comp', 'no-namespace', 'no-object-type-as-default-prop',
  'no-redundant-should-component-update', 'no-render-return-value', 'no-set-state',
  'no-string-refs', 'no-this-in-sfc', 'no-typos', 'no-unescaped-entities',
  'no-unknown-property', 'no-unsafe', 'no-unstable-nested-components',
  'no-unused-class-component-methods', 'no-unused-prop-types', 'no-unused-state',
  'no-will-update-set-state', 'prefer-es6-class', 'prefer-exact-props',
  'prefer-read-only-props', 'prefer-stateless-function', 'prop-types',
  'react-in-jsx-scope', 'require-default-props', 'require-optimization',
  'require-render-return', 'self-closing-comp', 'sort-comp', 'sort-default-props',
  'sort-prop-types', 'state-in-constructor', 'static-property-placement',
  'style-prop-object', 'void-dom-elements-no-children',
]);

const jsxParserOptions = { ecmaFeatures: { jsx: true } };

const aliasAll: Record<string, 0 | 2> = {};
for (const name of Object.keys(rules)) {
  if (UPSTREAM_ACTIVE_RULES.has(name)) aliasAll[`react/${name}`] = ERROR;
}

const aliasRecommendedRules: Record<string, 0 | 2> = {
  'react/display-name': ERROR,
  'react/jsx-key': ERROR,
  'react/jsx-no-comment-textnodes': ERROR,
  'react/jsx-no-duplicate-props': ERROR,
  'react/jsx-no-target-blank': ERROR,
  'react/jsx-no-undef': ERROR,
  'react/jsx-uses-react': ERROR,
  'react/jsx-uses-vars': ERROR,
  'react/no-children-prop': ERROR,
  'react/no-danger-with-children': ERROR,
  'react/no-deprecated': ERROR,
  'react/no-direct-mutation-state': ERROR,
  'react/no-find-dom-node': ERROR,
  'react/no-is-mounted': ERROR,
  'react/no-render-return-value': ERROR,
  'react/no-string-refs': ERROR,
  'react/no-unescaped-entities': ERROR,
  'react/no-unknown-property': ERROR,
  'react/no-unsafe': OFF,
  'react/prop-types': ERROR,
  'react/react-in-jsx-scope': ERROR,
  'react/require-render-return': ERROR,
};

const aliasJsxRuntimeRules: Record<string, 0 | 2> = {
  'react/react-in-jsx-scope': OFF,
  'react/jsx-uses-react': OFF,
};

const aliasPlugins = ['react'];

/** Legacy-shaped, as in eslint-plugin-react: `.rules` is what callers spread. */
const aliasLegacy = {
  all: {
    plugins: aliasPlugins,
    parserOptions: jsxParserOptions,
    rules: aliasAll,
  },
  'jsx-runtime': {
    plugins: aliasPlugins,
    parserOptions: { ...jsxParserOptions, jsxPragma: null },
    rules: aliasJsxRuntimeRules,
  },
};

const aliasFlat = {
  recommended: {
    plugins: { react: plugin },
    rules: aliasRecommendedRules,
    languageOptions: { parserOptions: jsxParserOptions },
  },
  all: {
    plugins: { react: plugin },
    rules: aliasLegacy.all.rules,
    languageOptions: { parserOptions: aliasLegacy.all.parserOptions },
  },
  'jsx-runtime': {
    plugins: { react: plugin },
    rules: aliasLegacy['jsx-runtime'].rules,
    languageOptions: { parserOptions: aliasLegacy['jsx-runtime'].parserOptions },
  },
};

const enumerableConfigs = { ...nativeConfigs };

/**
 * `all`, `jsx-runtime` and `flat` are non-enumerable on purpose: they carry
 * eslint-plugin-react's shapes (legacy `plugins: ['react']` blocks and a
 * dictionary of flat presets), which is what a consumer reads by key, but they are
 * not flat config blocks, so anything that iterates `Object.keys(configs)` as
 * blocks (the ecosystem-integrity preset lock, preset tables) must not see them.
 * The alias test loads each of them through ESLint instead.
 */
export const configs = Object.defineProperties(enumerableConfigs, {
  all: { value: aliasLegacy.all },
  'jsx-runtime': { value: aliasLegacy['jsx-runtime'] },
  flat: { value: aliasFlat },
}) as typeof enumerableConfigs & typeof aliasLegacy & { flat: typeof aliasFlat };

// eslint-plugin-react exposes its presets on the plugin object (`react.configs.flat.recommended`).
// Not part of the declared type: `configs.flat` is a dictionary, which ESLint's
// `Plugin['configs']` does not accept. Typed access is the named `configs` export.
Object.assign(plugin, { configs });

export default plugin;
