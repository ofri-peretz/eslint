/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Provenance helpers — "can an attacker steer this value?"
 *
 * Several rules in this package used to ask the *shape* question ("is this
 * argument a literal?") and report whenever they could not prove constancy.
 * `detect-non-literal-fs-filename` was inverted first and measured the trade:
 * 122 corpus findings became 9 by asking the *meaning* question instead —
 * report on reachable taint, not on unproven constancy.
 *
 * This module is that inversion, factored out so the rules that need it
 * (`no-unsafe-dynamic-require`, `detect-child-process`, `no-ssrf`,
 * `no-timing-unsafe-compare`) share one model rather than four drifting copies.
 *
 * Bindings are resolved through ESLint's scope analyser, not through a
 * file-wide name map. A name map cannot tell `const buf = …` in one function
 * from an unrelated `buf` in another, which is exactly the defect that made
 * `no-buffer-overread` report on identifiers it had never seen declared.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

type SourceCode = TSESLint.SourceCode;

/**
 * The variable this identifier resolves to, honouring shadowing.
 *
 * Walks the scope chain outward from the identifier's own scope, so an inner
 * `const url = 'https://…'` wins over an outer `url` parameter — the whole
 * point of using scopes instead of a flat map keyed by name.
 */
export function findVariable(
  sourceCode: SourceCode,
  node: TSESTree.Identifier,
): TSESLint.Scope.Variable | null {
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
  while (scope) {
    // `set` is optional-chained for the mock `SourceCode` objects the coverage
    // suites build by hand: a rule must not throw because a harness handed it a
    // scope stub, and an unresolvable name is exactly the `null` answer below.
    const found = scope.set?.get(node.name);
    if (found) return found;
    scope = scope.upper;
  }
  return null;
}

/**
 * The initializer this identifier was bound to, when there is exactly one.
 *
 * One definition only: a name written in two places has no single provenance,
 * and picking the first would make the answer depend on statement order.
 * Parameters and imports deliberately return `undefined` — their value is
 * decided by a caller or another module, which is *unresolved*, not *safe*.
 *
 * Destructuring is followed to the object being destructured, so
 * `const { token } = req.body` reports `req.body`. That hop is what lets the
 * taint reader see through the single most common way a request field is read.
 */
export function bindingInit(
  sourceCode: SourceCode,
  node: TSESTree.Identifier,
): TSESTree.Node | undefined {
  const variable = findVariable(sourceCode, node);
  if (!variable || variable.defs.length !== 1) return undefined;
  const def = variable.defs[0];
  if (def.type !== 'Variable') return undefined;
  return def.node.init ?? undefined;
}

/**
 * The literal value this identifier is a `const` alias for, if any.
 *
 * `const SESSION_TRANSFER_TOKEN_IDENTIFIER = 'urn:…:session_transfer'` is a
 * string that happens to be spelled with a name. Reading it back is what lets
 * a rule treat `x !== SESSION_TRANSFER_TOKEN_IDENTIFIER` exactly like
 * `x !== 'urn:…'` without guessing from the SCREAMING_SNAKE convention — a
 * guess that would also swallow `const API_KEY = process.env.API_KEY`.
 *
 * `const` only, and only when the declarator binds a plain identifier: a `let`
 * can be reassigned after the point we read it, so its initializer proves
 * nothing about the value at the use site.
 */
export function constLiteralOf(
  sourceCode: SourceCode,
  node: TSESTree.Identifier,
): TSESTree.Node | undefined {
  const variable = findVariable(sourceCode, node);
  if (!variable || variable.defs.length !== 1) return undefined;
  const def = variable.defs[0];
  if (def.type !== 'Variable') return undefined;
  if (def.parent.kind !== 'const') return undefined;
  if (def.node.id.type !== AST_NODE_TYPES.Identifier) return undefined;
  const init = def.node.init;
  if (!init) return undefined;
  if (init.type === AST_NODE_TYPES.Literal) return init;
  if (init.type === AST_NODE_TYPES.TemplateLiteral && init.expressions.length === 0) {
    return init;
  }
  return undefined;
}

/** Property names that carry request data whatever the receiver is called. */
const REQUEST_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  'headers', 'query', 'body', 'params', 'cookies', 'searchparams', 'rawbody',
  'querystringparameters', 'pathparameters', 'formdata',
]);

/**
 * Build a "does this expression read something an attacker can steer?" test.
 *
 * `roots` is per-rule on purpose. `no-timing-unsafe-compare` wants request
 * roots ONLY: in `req.headers['x-sig'] === process.env.SIGNING_KEY` the env
 * read is the *secret being protected*, not the attacker's lever, and counting
 * it as taint would make both sides tainted and hide the finding.
 * `detect-child-process` wants `process` too, because `process.argv` really is
 * the input that steers a command.
 *
 * The traversal is deliberately shallow — six hops — and follows only
 * single-definition bindings. It answers "is there visible evidence of flow",
 * never "is this provably clean".
 */
export function makeReadsTaintSource(
  sourceCode: SourceCode,
  roots: ReadonlySet<string>,
): (node: TSESTree.Node) => boolean {
  const reads = (node: TSESTree.Node, depth: number): boolean => {
    if (depth > 6) return false;
    switch (node.type) {
      case AST_NODE_TYPES.Identifier: {
        if (roots.has(node.name.toLowerCase())) return true;
        const init = bindingInit(sourceCode, node);
        return init !== undefined && reads(init, depth + 1);
      }
      case AST_NODE_TYPES.MemberExpression: {
        if (
          !node.computed &&
          node.property.type === AST_NODE_TYPES.Identifier &&
          REQUEST_PROPERTY_NAMES.has(node.property.name.toLowerCase())
        ) {
          return true;
        }
        return reads(node.object, depth + 1);
      }
      case AST_NODE_TYPES.TemplateLiteral:
        return node.expressions.some((expression) => reads(expression, depth + 1));
      case AST_NODE_TYPES.BinaryExpression:
        return (
          reads(node.left as TSESTree.Node, depth + 1) || reads(node.right, depth + 1)
        );
      case AST_NODE_TYPES.AwaitExpression:
        return reads(node.argument, depth + 1);
      // `spawn('git', ['clone', req.body.url])` — the argv vector is where the
      // attacker's value normally sits, so an array that is not walked makes
      // the whole reader blind to the shape it exists for.
      case AST_NODE_TYPES.ArrayExpression:
        return node.elements.some(
          (element) => element !== null && reads(element, depth + 1),
        );
      case AST_NODE_TYPES.SpreadElement:
        return reads(node.argument, depth + 1);
      case AST_NODE_TYPES.CallExpression:
      case AST_NODE_TYPES.NewExpression:
        // `path.join(base, req.query.f)`, `String(req.body.x)`, `new URL(u)` —
        // a wrapper does not launder its arguments.
        return node.arguments.some((argument) => reads(argument, depth + 1));
      default:
        return false;
    }
  };
  return (node: TSESTree.Node) => reads(node, 0);
}
