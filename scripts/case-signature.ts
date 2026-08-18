/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * case-signature.ts — the identity of a CASE, so "did we already decide this?"
 * has an answer that does not depend on who is reading.
 *
 * ## The problem
 *
 * A rule run over 20 repositories produced 173 findings. 107 of them were the
 * same decision — `new Set(x)` inside a loop — spread across 14 repositories at
 * 107 different line numbers. Hand-labelling produced the right answer, but
 * nothing in the output said those 107 were ONE case, and nothing would have
 * said, on the next run, that finding #108 was that same case again.
 *
 * So a finding needs an identity that is stable across the things that change
 * between runs and between repositories:
 *
 *   - the file and the line number         (change constantly)
 *   - the identifiers                      (`scc`, `sourceTypes`, `bd`, `dbNames`)
 *   - the literal values                   (`'/tmp/a'` vs `'/tmp/b'`)
 *
 * and that DISTINGUISHES the things that make it a different decision:
 *
 *   - the messageId                        (a different claim entirely)
 *   - the AST shape at the report site
 *   - the API surface it touches           (`.length` is not `.body`)
 *   - the syntactic context                (in a loop is not the same as not)
 *
 * ## The normalisation, and why each rule is what it is
 *
 * **Identifier names are dropped.** This is the plugin's own doctrine applied
 * to its measurement: a name is not evidence. `queryParams` and `dataDir` were
 * false positives precisely because a name was read as a type, and a signature
 * that kept names would file every rename as a brand new case.
 *
 * **Non-computed property names are KEPT.** `req.body` and `chunk.length` are
 * API surface, not a user's choice of word — the object is named by the
 * developer, the property is named by the framework. This is the same line the
 * rules themselves draw between a root and a request surface.
 *
 * **Literal values are dropped, their type kept.** `Buffer.alloc(1024)` and
 * `Buffer.alloc(4096)` are one decision. `Buffer.alloc('x')` is not.
 *
 * **Depth is bounded at 4.** Deeper than that and the signature starts encoding
 * the shape of unrelated arguments, so trivially different code files as new
 * cases and the ledger fills with duplicates.
 *
 * **The nearest enclosing loop/statement is appended.** `new Set(x)` in a loop
 * and `new Set(x)` at the top level are different decisions for this ecosystem;
 * that was the whole substance of the CWE-770 fix.
 *
 * ## What it is not
 *
 * A signature collision files two different shapes as one case. That is a real
 * risk and the ledger mitigates it rather than pretending it away: every case
 * stores up to three real examples with repo, path, line and source text, so a
 * reviewer can see whether a "known" match is genuinely the same decision. A
 * signature is a filing system, not a proof.
 */
import type { TSESTree } from '@typescript-eslint/types';
import crypto from 'node:crypto';

const MAX_DEPTH = 4;

/**
 * Statement contexts that change what a finding MEANS — loops, and nothing else.
 *
 * Calibrated 2026-08-18, narrower than it started. The first version also
 * counted `IfStatement`, `TryStatement`, `SwitchCase` and `CatchClause`, and it
 * filed the three surviving CWE-770 findings as three separate cases:
 *
 *   zlib.createUnzip()   in IfStatement<IfStatement   directus
 *   zlib.createUnzip()   in SwitchCase                nodemailer
 *   zlib.createGunzip()  in IfStatement               strapi
 *
 * The first two are ONE decision — a decompression stream with no output bound
 * — and whether the author reached it through an `if` or a `switch` has nothing
 * to do with it. A signature that splits on branch flavour makes every cosmetic
 * refactor look like a case nobody has reviewed, which trains a reader to skim
 * the NEW bucket. That is the failure this whole apparatus exists to prevent.
 *
 * Loops stay, because for this ecosystem they demonstrably change the decision:
 * `new Set(x)` in a loop versus at the top level was the entire substance of the
 * CWE-770 fix, 107 findings' worth.
 *
 * @protocol-constant The set is the language's iteration forms, closed by the
 * grammar rather than curated. Widening it re-partitions every existing ledger
 * — a case that was one becomes several — so it is a deliberate migration, not
 * a setting.
 */
const CONTEXT_TYPES = new Set([
  'ForStatement',
  'ForOfStatement',
  'ForInStatement',
  'WhileStatement',
  'DoWhileStatement',
]);

type Node = TSESTree.Node & { parent?: TSESTree.Node };

/**
 * The normalised skeleton of a node: types and API surface, no names, no values.
 */
export function skeleton(node: Node | null | undefined, depth = 0): string {
  if (node == null || typeof node.type !== 'string') return '_';
  if (depth > MAX_DEPTH) return '…';

  const next = (child: unknown): string => skeleton(child as Node, depth + 1);

  switch (node.type) {
    case 'Identifier':
      // A name is not evidence — see the header.
      return 'Id';
    case 'PrivateIdentifier':
      return 'PrivId';
    case 'Literal': {
      const value = (node as TSESTree.Literal).value;
      const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      return `Lit:${kind}`;
    }
    case 'TemplateLiteral':
      return `Tpl(${(node as TSESTree.TemplateLiteral).expressions.map(next).join(',')})`;
    case 'MemberExpression': {
      const member = node as TSESTree.MemberExpression;
      // Property names survive: they are the framework's vocabulary, not the
      // developer's. `.length` is not `.body`.
      const property = member.computed
        ? `[${next(member.property)}]`
        : member.property.type === 'Identifier'
          ? `.${member.property.name}`
          : '.?';
      return `Mem(${next(member.object)}${property})`;
    }
    case 'CallExpression':
    case 'NewExpression': {
      const call = node as TSESTree.CallExpression | TSESTree.NewExpression;
      const tag = node.type === 'NewExpression' ? 'New' : 'Call';
      return `${tag}(${next(call.callee)};${call.arguments.map(next).join(',')})`;
    }
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const binary = node as TSESTree.BinaryExpression | TSESTree.LogicalExpression;
      return `${binary.operator}(${next(binary.left)},${next(binary.right)})`;
    }
    case 'UnaryExpression': {
      const unary = node as TSESTree.UnaryExpression;
      return `${unary.operator}(${next(unary.argument)})`;
    }
    case 'AssignmentExpression': {
      const assignment = node as TSESTree.AssignmentExpression;
      return `Assign${assignment.operator}(${next(assignment.left)},${next(assignment.right)})`;
    }
    case 'ConditionalExpression': {
      const conditional = node as TSESTree.ConditionalExpression;
      return `Cond(${next(conditional.test)},${next(conditional.consequent)},${next(conditional.alternate)})`;
    }
    case 'ObjectExpression': {
      // Key names are API surface; values are not part of the decision.
      const keys = (node as TSESTree.ObjectExpression).properties
        .map((property) =>
          property.type === 'Property' && !property.computed && property.key.type === 'Identifier'
            ? property.key.name
            : '?',
        )
        .sort();
      return `Obj{${keys.join(',')}}`;
    }
    case 'ArrayExpression':
      return `Arr[${(node as TSESTree.ArrayExpression).elements.length ? '…' : ''}]`;
    case 'AwaitExpression':
      return `Await(${next((node as TSESTree.AwaitExpression).argument)})`;
    case 'SpreadElement':
      return `Spread(${next((node as TSESTree.SpreadElement).argument)})`;
    case 'TSAsExpression':
    case 'TSNonNullExpression':
      // Type syntax erases at runtime, so it cannot change the decision.
      return next((node as { expression: unknown }).expression);
    default:
      return node.type;
  }
}

/** The chain of enclosing statements that changes what a finding means. */
export function context(node: Node): string {
  const out: string[] = [];
  let current: Node | undefined = node.parent as Node | undefined;
  while (current != null && out.length < 3) {
    if (CONTEXT_TYPES.has(current.type)) out.push(current.type);
    current = current.parent as Node | undefined;
  }
  return out.join('<');
}

export type CaseSignature = { key: string; skeleton: string; context: string };

/**
 * The full identity of a finding: what was claimed, about what shape, where.
 *
 * `key` is a short hash for filing; the two readable halves travel with it so a
 * ledger entry can be understood without re-running anything.
 */
export function signatureOf(node: Node, messageId: string): CaseSignature {
  const shape = skeleton(node);
  const where = context(node);
  const key = crypto
    .createHash('sha256')
    .update(`${messageId}|${shape}|${where}`)
    .digest('hex')
    .slice(0, 12);
  return { key, skeleton: shape, context: where };
}
