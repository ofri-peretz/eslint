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
import { AST_NODE_TYPES, unwrapTypeSyntax } from '@interlace/eslint-devkit';

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
  // `const u = req.query.url as string` must hand back the member expression,
  // not the cast wrapper, or every caller has to know about type syntax.
  return def.node.init ? unwrapTypeSyntax(def.node.init) : undefined;
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
  if (
    init.type === AST_NODE_TYPES.TemplateLiteral &&
    init.expressions.length === 0
  ) {
    return init;
  }
  return undefined;
}

/** Property names that carry request data whatever the receiver is called. */
const REQUEST_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  'headers',
  'query',
  'body',
  'params',
  'cookies',
  'searchparams',
  'rawbody',
  'querystringparameters',
  'pathparameters',
  'formdata',
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

    // `req.query.url as string` reads exactly what `req.query.url` reads — the
    // cast is erased at compile time. Without this, the switch below falls
    // through to `default: return false`.
    //
    // The cast is not stylistic. Express types `req.query.url` as
    // `string | string[] | ParsedQs | undefined`, so a TypeScript handler MUST
    // write it to compile. The omission silenced no-ssrf and
    // no-timing-unsafe-compare on every TypeScript Express codebase, while
    // their suites stayed green — neither suite contained a single `as string`.
    const bare = unwrapTypeSyntax(node);
    if (bare !== node) return reads(bare, depth + 1);

    switch (node.type) {
      case AST_NODE_TYPES.Identifier: {
        if (roots.has(node.name.toLowerCase())) return true;
        const init = bindingInit(sourceCode, node);
        if (init !== undefined && reads(init, depth + 1)) return true;

        // A binding is not only what it was declared as. `let c = 'ls'; c =
        // req.query.c; exec(c)` reaches the sink carrying the request, and
        // reading the declarator alone answers `'ls'` — a false negative that
        // looks exactly like a safe literal.
        //
        // Judge the LAST write before the use, not any write. Taking "any"
        // inverts the other direction: `var mod = req.body.a; var mod = "fs";
        // require(mod)` loads `fs`, and reporting it is a false positive whose
        // fix is already applied. Straight-line last-write-wins is what both
        // shapes have in common.
        //
        // `c = c + x` recurses back into this branch; the shared `depth` guard
        // is what terminates it.
        const variable = findVariable(sourceCode, node);
        const priorWrites = (variable?.references ?? [])
          .map((ref) => ref.writeExpr)
          .filter((write): write is TSESTree.Node => write != null)
          .filter((write) => write.range[1] <= node.range[0])
          // `.sort`, not `.toSorted`: this package ships `engines.node: >=18.0.0`
          // and `Array.prototype.toSorted` first shipped in Node 20, so a Node 18
          // consumer would get a TypeError at lint time. Sorting in place is safe
          // — `.filter` above already returned a fresh array.
          .sort((a, b) => a.range[1] - b.range[1]);
        const lastWrite = priorWrites.at(-1);
        return lastWrite !== undefined && reads(lastWrite, depth + 1);
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
        return node.expressions.some((expression) =>
          reads(expression, depth + 1),
        );
      case AST_NODE_TYPES.BinaryExpression:
        return (
          reads(node.left as TSESTree.Node, depth + 1) ||
          reads(node.right, depth + 1)
        );
      // `req.headers['x-api-key'] || ''` — the defensive default every Express
      // handler writes. The value at the use site is the header on the request
      // that carries one, and the literal only on the request that does not, so
      // the tainted operand is the one that decides whether the sink is
      // reachable. Omitting this case sent the commonest shape in Node request
      // handling to `default: return false`, and a fixture written to isolate
      // exactly that hop (`no-timing-unsafe-compare`
      // `vulnerable/16-header-default-idiom.js`) sat in the corpus as a miss.
      //
      // All three operators, for the same reason: `??` is `||` with a narrower
      // falsy test, and `&&` returns its right operand — `req.query.q && q` is
      // the request either way.
      case AST_NODE_TYPES.LogicalExpression:
        return reads(node.left, depth + 1) || reads(node.right, depth + 1);
      // `cond ? req.query.a : 'default'` is the ternary spelling of the same
      // idiom, and had the same hole.
      //
      // The TEST is deliberately NOT walked. `req.query.debug ? 'verbose' :
      // 'quiet'` lets an attacker choose between two values the program author
      // wrote; that is control dependence, not data flow, and counting it would
      // taint every value in every request-conditional branch — including
      // `req.query.mode === 'a' ? './handlers/a' : './handlers/b'`, whose
      // require target is a closed set of the author's own strings. Only the
      // branches carry the value.
      case AST_NODE_TYPES.ConditionalExpression:
        return (
          reads(node.consequent, depth + 1) || reads(node.alternate, depth + 1)
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
        //
        // Nor does it launder its RECEIVER: `req.body.options.split(' ')` is
        // the request, split. Only the receiver is followed, never the method
        // name — running the property test over a callee would read `db.query(sql)`
        // as a request because the method happens to be spelled `query`.
        //
        // `process` is excluded as a receiver. It is a taint ROOT because of
        // its data properties (`process.argv`, `process.env`), but none of its
        // METHODS return external input: `process.cwd()` is the directory the
        // build was launched from, `process.uptime()` a number. Following the
        // receiver there made `execSync(\`… --packageName ${process.cwd()}\`)`
        // read as attacker-steerable — okta-signin-widget
        // `packages/@okta/pseudo-loc/pseudo-loc.js:12`, a build script.
        // `req.get('host')` is the opposite case and must keep flowing, so this
        // is specific to `process` rather than to receivers in general.
        return (
          node.arguments.some((argument) => reads(argument, depth + 1)) ||
          (node.callee.type === AST_NODE_TYPES.MemberExpression &&
            !(
              node.callee.object.type === AST_NODE_TYPES.Identifier &&
              node.callee.object.name === 'process'
            ) &&
            reads(node.callee.object, depth + 1))
        );
      default:
        return false;
    }
  };
  return (node: TSESTree.Node) => reads(node, 0);
}
