/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @eslint/eslint-plugin-react-features
 */

import type { TSESLint } from '@interlace/eslint-devkit';

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
  
  // Deprecated API rules
  'no-find-dom-node': noFindDomNode,
  'no-unsafe': noUnsafe,
  'void-dom-elements-no-children': voidDomElementsNoChildren,
  
  'react-class-to-hooks': reactClassToHooks,
  'no-unnecessary-rerenders': noUnnecessaryRerenders,
  'react-render-optimization': reactRenderOptimization,
  'react-no-inline-functions': reactNoInlineFunctions,

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

  // Deprecated API rules (categorized)
  'react/no-find-dom-node': noFindDomNode,
  'react/no-unsafe': noUnsafe,
  'react/void-dom-elements-no-children': voidDomElementsNoChildren,

  'migration/react-class-to-hooks': reactClassToHooks,
  'performance/no-unnecessary-rerenders': noUnnecessaryRerenders,
  'performance/react-render-optimization': reactRenderOptimization,
  'performance/react-no-inline-functions': reactNoInlineFunctions,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin = {
  meta: {
    name: '@eslint/eslint-plugin-react-features',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      '@eslint/react-features': plugin,
    },
    rules: {
      '@eslint/react-features/react/jsx-key': 'error',
      '@eslint/react-features/react/no-children-prop': 'warn',
      '@eslint/react-features/react/no-danger': 'warn',
      '@eslint/react-features/react/no-string-refs': 'error',
      '@eslint/react-features/react/no-unknown-property': 'error',
      '@eslint/react-features/react/hooks-exhaustive-deps': 'warn',
      // Security rules
      '@eslint/react-features/react/jsx-no-target-blank': 'error',
      '@eslint/react-features/react/jsx-no-script-url': 'error',
      '@eslint/react-features/react/jsx-no-duplicate-props': 'error',
      '@eslint/react-features/react/no-danger-with-children': 'error',
      '@eslint/react-features/react/no-deprecated': 'warn',
      // Performance
      '@eslint/react-features/performance/no-unnecessary-rerenders': 'warn',
      '@eslint/react-features/performance/react-render-optimization': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
