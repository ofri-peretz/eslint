/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import type { TSESLint, TSESTree } from '../types/estree/utils/index';
import { AST_NODE_TYPES } from '../ast-node-types';
import { isModuleBinding } from './module-binding';
import { propertyName, staticString } from './spellings';

/**
 * Is this `startsWith` argument anchored to a path separator?
 *
 * Accepted, because each provably ends the prefix at a boundary:
 *   `base + path.sep`      a concatenation ending in the separator
 *   `base + '/'`           the literal form of the same thing
 *   `'/safe/'`             a literal already ending in a separator
 *   `` `${base}/` ``       the template form
 *
 * Rejected: a bare `base`, which is the prefix bug — `/safebad` passes it.
 * When the argument cannot be read at all, reject: an unproven guard must not
 * silence a finding.
 *
 * Shared by every rule, in every plugin, that trusts a `startsWith`
 * containment guard (node-security's file-access rules and mcp-sdk-security's
 * no-path-traversal-in-tool), so the same guard never gets opposite verdicts
 * from two rules. It lived as a copy in each plugin until both copies had to be
 * changed together; one copy here removes that step.
 */
export function isSeparatorAnchored(
  arg: TSESTree.Node | undefined,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  if (arg === undefined) return false;
  const endsWithSep = (n: TSESTree.Node): boolean => {
    // `path.sep`
    if (
      n.type === AST_NODE_TYPES.MemberExpression &&
      n.object.type === AST_NODE_TYPES.Identifier &&
      n.object.name === 'path' &&
      propertyName(n) === 'sep'
    ) {
      return true;
    }
    // `import { sep } from 'node:path'`
    if (isModuleBinding(n, sourceCode.getScope(n), 'path', ['sep']))
      return true;
    const staticText = staticString(n);
    if (staticText !== null) {
      return staticText.endsWith('/') || staticText.endsWith('\\');
    }
    return false;
  };
  if (endsWithSep(arg)) return true;
  // `base + path.sep` / `base + '/'` — the separator must be the LAST part.
  if (arg.type === AST_NODE_TYPES.BinaryExpression && arg.operator === '+') {
    return endsWithSep(arg.right);
  }
  // `` `${base}/` `` — the trailing quasi carries the separator.
  if (arg.type === AST_NODE_TYPES.TemplateLiteral) {
    // `quasis` is never empty for a TemplateLiteral — a template with n
    // expressions has n+1 quasis — and `cooked` is null only for an invalid
    // escape in a TAGGED template, which a `startsWith` argument is not. The
    // `?? ''` fallback that used to sit here was unreachable, and it showed
    // up as the one branch this package could not cover.
    // The `!` carries that same argument: `arg` is the ARGUMENT node, so a
    // tagged template arrives as `TaggedTemplateExpression` and never gets
    // here. @typescript-eslint 8.68.0 made `cooked` nullable in the types;
    // it did not make this position reachable.
    const last = arg.quasis[arg.quasis.length - 1].value.cooked!;
    if (last.endsWith('/') || last.endsWith('\\')) return true;
    // `` `${base}${path.sep}` `` ends with an EXPRESSION, so its trailing
    // quasi is empty — the separator is the last interpolation instead.
    // Reading only the quasi rejected a guard that does hold, which a
    // suppression must never do; found by writing the test for it.
    if (last === '') {
      const tail = arg.expressions[arg.expressions.length - 1];
      return tail !== undefined && endsWithSep(tail);
    }
    return false;
  }
  return false;
}
