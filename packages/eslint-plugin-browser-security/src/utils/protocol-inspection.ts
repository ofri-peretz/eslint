/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';

/**
 * Shared by `no-unencrypted-transmission` and `no-http-urls` so the two cannot disagree
 * about what counts as inspecting a protocol string rather than using one.
 *
 * `url.startsWith('http://')` and `name.indexOf('http://') !== -1` are GUARDS — the literal
 * is the thing being looked for, not an endpoint being called. Reporting them flags the
 * security check as the vulnerability, which is exactly backwards. Measured: pm2's
 * `canonic_module_name.indexOf('http://') !== -1` was reported by `no-http-urls`, inside the
 * branch that handles remote module installs.
 */
/** Of the inspection methods, these write their second argument. */
const WRITES_SECOND_ARGUMENT = new Set(['replace', 'replaceAll']);

const COMPARISON_OPERATORS = new Set([
  '===',
  '!==',
  '==',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
]);

const INSPECTION_METHODS = new Set([
  'startsWith',
  'endsWith',
  'includes',
  'indexOf',
  'lastIndexOf',
  'search',
  'match',
  'matchAll',
  'test',
  'split',
  'replace',
  'replaceAll',
]);

/**
 * Is this literal being examined rather than used as a destination?
 *
 * Two shapes count: an argument to one of the inspection methods above, and an
 * operand of an equality/comparison expression (`protocol === 'http://'`). Both
 * mean the code is reasoning *about* the protocol string.
 */
export function isProtocolInspection(
  node: TSESTree.Node,
  parent: TSESTree.Node,
): boolean {
  if (
    parent.type === AST_NODE_TYPES.CallExpression &&
    parent.callee.type === AST_NODE_TYPES.MemberExpression &&
    namesOneOf(propertyName(parent.callee), INSPECTION_METHODS)
  ) {
    // `replace`/`replaceAll` take a *replacement* as their second argument, and
    // that one is content being written — `url.replace(p, 'http://evil.test')`
    // is a genuine insecure destination. Only the search operand is inspection.
    //
    // Compared by identity against argument 0 rather than scanned for with
    // indexOf: the only question is whether this literal is the first argument,
    // and scanning made a call with many literal arguments O(n²) over the pass.
    if (namesOneOf(propertyName(parent.callee), WRITES_SECOND_ARGUMENT)) {
      return parent.arguments[0] === node;
    }
    return true;
  }

  return (
    parent.type === AST_NODE_TYPES.BinaryExpression &&
    COMPARISON_OPERATORS.has(parent.operator)
  );
}
