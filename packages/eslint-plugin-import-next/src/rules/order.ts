/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: order
 *
 * eslint-plugin-import's `import/order`, with its options and its defaults:
 * groups `builtin, external, parent, sibling, index`, no alphabetizing,
 * `newlines-between: ignore`, one report per import that is out of place.
 * Every configuration runs the port of eslint-plugin-import's engine
 * (`../utils/order-upstream`), so a config carried over from
 * eslint-plugin-import means what it meant there, options or none.
 *
 * import-next's own, opinionated reading (alphabetized, a blank line between
 * groups, `internalPatterns`, one report for the whole block) is the
 * `enforce-import-order` rule. Until 4.0 `order` was an alias of it.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

import { enforceImportOrder } from './enforce-import-order';
import {
  createUpstreamOrder,
  UPSTREAM_TYPES,
  upstreamOrderMessages,
} from '../utils/order-upstream';
import type {
  UpstreamMessageIds,
  UpstreamOrderOptions,
} from '../utils/order-upstream';

type RuleOptions = [UpstreamOrderOptions?];

/** One JSON schema node, as ESLint's rule metadata types it. */
type JSONSchema4 = Exclude<
  NonNullable<TSESLint.RuleMetaData<string, unknown[]>['schema']>,
  readonly unknown[]
>;

/**
 * enforce-import-order's schema without the two keys only import-next's own
 * reading has (`internalPatterns`, `newlinesBetween`): written here, they
 * would be silently ignored, so the config is refused instead and the
 * message names the key. `groups` names eslint-plugin-import's types only.
 */
function upstreamSchema(): JSONSchema4[] {
  const [own] = enforceImportOrder.meta.schema as unknown as [
    { type: 'object'; properties: Record<string, JSONSchema4> },
  ];
  const {
    internalPatterns: _internalPatterns,
    newlinesBetween: _newlinesBetween,
    ...properties
  } = own.properties;
  const group: JSONSchema4 = { type: 'string', enum: [...UPSTREAM_TYPES] };
  const groups: JSONSchema4 = {
    type: 'array',
    items: { oneOf: [group, { type: 'array', items: group }] },
  };
  return [{ ...own, properties: { ...properties, groups } }];
}

export const order = createRule<RuleOptions, UpstreamMessageIds>({
  name: 'order',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/order.md',
      description:
        "Enforce a convention in module import order, with eslint-plugin-import's options and defaults",
    },
    fixable: 'code',
    messages: upstreamOrderMessages,
    schema: upstreamSchema(),
  },
  defaultOptions: [],

  createOnce(context: TSESLint.RuleContext<UpstreamMessageIds, RuleOptions>) {
    const engine = createUpstreamOrder(context as never);
    return {
      before() {
        engine.before();
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        engine.ImportDeclaration(node);
      },
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        engine.TSImportEqualsDeclaration(node);
      },
      CallExpression(node: TSESTree.CallExpression) {
        engine.CallExpression(node);
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        engine.VariableDeclarator(node);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        engine.ExportNamedDeclaration(node);
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        engine.AssignmentExpression(node);
      },
      'Program:exit'() {
        engine.exit();
      },
    };
  },
});
