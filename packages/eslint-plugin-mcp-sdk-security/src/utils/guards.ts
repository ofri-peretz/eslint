/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Was this value checked before it reached the sink?
 *
 * A path or URL taken from a tool argument is safe to use once the handler has
 * confined it — and that is written in a handful of shapes:
 *
 *     const target = path.resolve(ROOT, p);
 *     if (!target.startsWith(ROOT + path.sep)) throw new Error('outside');
 *     await readFile(target);                         // guarded: exit-if above
 *
 *     if (ALLOWED_HOSTS.has(url.hostname)) return fetch(url);  // guarded: inside
 *
 *     await readFile(await insideWorkspace(p));       // a same-file helper that
 *                                                     // checks before returning
 *
 * What is recognised is structural: an `if` whose test CHECKS a value the sink
 * argument is derived from, and which either exits (`throw` / `return`) before
 * the sink or wraps it. What counts as a check is the rule's call — a path
 * rule accepts `startsWith` / `path.relative`, an SSRF rule a comparison of
 * `url.hostname` — so this module supplies the walk and the rule the verdict.
 *
 * "Derived from" is answered through the scope manager: the variables an
 * expression reads, followed through same-file `const`/`let` initialisers and
 * assignments ({@link lineage}). A check on `rel` where
 * `const rel = path.relative(root, target)` is a check on `target`. Names are
 * never compared.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  isFunctionNode,
  lookupVariable,
  type FunctionNode,
} from './tool-registration';

type Variable = TSESLint.Scope.Variable;

/** How many initialiser hops a test may follow into the names it reads. */
export const MAX_GUARD_DEPTH = 6;

/**
 * Is this node — a call or comparison inside an `if` test — a check on the
 * value? `involves(n)` says whether `n` is derived from the sink's value.
 */
export type CheckPredicate = (
  node: TSESTree.Node,
  involves: (n: TSESTree.Node) => boolean,
) => boolean;

/** Global conversions whose result is their argument, retyped. */
const CONVERSIONS: ReadonlySet<string> = new Set([
  'String',
  'Number',
  'Boolean',
]);

/** Is this `String(x)` / `Number(x)` / `Boolean(x)` — the global, unshadowed? */
export function isConversion(
  node: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
): boolean {
  const { callee } = node;
  return (
    callee.type === 'Identifier' &&
    CONVERSIONS.has(callee.name) &&
    !lookupVariable(callee.name, scope)?.defs.length
  );
}

/** Does reaching this statement always leave the function? */
export function exits(node: TSESTree.Statement): boolean {
  if (node.type === 'ThrowStatement' || node.type === 'ReturnStatement')
    return true;
  return (
    node.type === 'BlockStatement' &&
    node.body.some(
      (s) => s.type === 'ThrowStatement' || s.type === 'ReturnStatement',
    )
  );
}

/** Child nodes, skipping `parent` back-links. */
function children(node: TSESTree.Node): TSESTree.Node[] {
  const out: TSESTree.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (
        child !== null &&
        typeof child === 'object' &&
        typeof (child as TSESTree.Node).type === 'string'
      )
        out.push(child as TSESTree.Node);
    }
  }
  return out;
}

/** Is this identifier a reference, rather than a property name or key? */
function isReference(node: TSESTree.Identifier): boolean {
  const parent = node.parent;
  if (parent?.type === 'MemberExpression')
    return parent.object === node || parent.computed;
  if (parent?.type === 'Property' && parent.key === node)
    return parent.computed || parent.shorthand;
  return true;
}

export interface Guards {
  /** The variables `node` reads, through same-file initialisers. */
  lineage(node: TSESTree.Node): Set<Variable>;
  /** Is `arg`, used at `sink`, checked by an enclosing or preceding `if`? */
  guarded(sink: TSESTree.Node, arg: TSESTree.Node): boolean;
  /** Does this same-file helper check one of its parameters before returning? */
  sanitizes(fn: FunctionNode): boolean;
}

export function createGuards(
  sourceCode: Readonly<TSESLint.SourceCode>,
  isTainted: (variable: Variable) => boolean,
  isCheck: CheckPredicate,
): Guards {
  function lineage(node: TSESTree.Node): Set<Variable> {
    const seen = new Set<Variable>();
    // Bounded by `seen`: each variable is expanded once.
    const visit = (current: TSESTree.Node): void => {
      if (isFunctionNode(current)) return;
      if (current.type === 'Identifier') {
        if (!isReference(current)) return;
        const variable = lookupVariable(
          current.name,
          sourceCode.getScope(current),
        );
        if (variable === undefined || seen.has(variable)) return;
        seen.add(variable);
        for (const def of variable.defs) {
          if (def.type === 'Variable' && def.node.init) visit(def.node.init);
        }
        for (const ref of variable.references) {
          const parent = ref.identifier.parent;
          if (
            ref.isWrite() &&
            parent?.type === 'AssignmentExpression' &&
            parent.left === ref.identifier
          )
            visit(parent.right);
        }
        return;
      }
      for (const child of children(current)) visit(child);
    };
    visit(node);
    return seen;
  }

  /** Does `test` contain a check on any of `targets`? */
  function checks(
    test: TSESTree.Node,
    targets: ReadonlySet<Variable>,
  ): boolean {
    const involves = (n: TSESTree.Node): boolean => {
      for (const variable of lineage(n)) if (targets.has(variable)) return true;
      return false;
    };
    const visited = new Set<Variable>();
    const visit = (current: TSESTree.Node, depth: number): boolean => {
      // A callback inside the test — `ALLOWED.some((h) => url.hostname === h)`
      // — runs as part of it; any other function does not.
      if (isFunctionNode(current) && current.parent?.type !== 'CallExpression')
        return false;
      if (isCheck(current, involves)) return true;
      // A call that is not a check computes a value from its operands that
      // nothing tests (`String(p).endsWith('.md')`, `existsSync(pick(p))`):
      // a call inside it is an operand, not a check. Only a callback it is
      // given runs as part of the test (`ALLOWED.some((h) => u.host === h)`),
      // and a type conversion is transparent (`Boolean(p.startsWith(root))`).
      if (
        current.type === 'CallExpression' &&
        !isConversion(current, sourceCode.getScope(current))
      )
        return current.arguments.some(
          (arg) => isFunctionNode(arg) && visit(arg, depth),
        );
      // `const escapes = rel.startsWith('..'); if (escapes) throw …` — the
      // check lives in the initialiser of the name the test reads.
      if (current.type === 'Identifier') {
        const variable = lookupVariable(
          current.name,
          sourceCode.getScope(current),
        );
        if (
          variable === undefined ||
          visited.has(variable) ||
          depth >= MAX_GUARD_DEPTH
        )
          return false;
        visited.add(variable);
        return variable.defs.some(
          (def) =>
            def.type === 'Variable' &&
            def.node.init !== null &&
            visit(def.node.init, depth + 1),
        );
      }
      return children(current).some((child) => visit(child, depth));
    };
    return visit(test, 0);
  }

  function guarded(sink: TSESTree.Node, arg: TSESTree.Node): boolean {
    const targets = new Set([...lineage(arg)].filter(isTainted));
    let child: TSESTree.Node = sink;
    for (let parent = sink.parent; parent; parent = parent.parent) {
      if (
        parent.type === 'IfStatement' &&
        parent.consequent === child &&
        checks(parent.test, targets)
      )
        return true;
      if (parent.type === 'BlockStatement' || parent.type === 'Program') {
        for (const statement of parent.body) {
          if (statement === child) break;
          if (
            statement.type === 'IfStatement' &&
            exits(statement.consequent) &&
            checks(statement.test, targets)
          )
            return true;
        }
      }
      child = parent;
    }
    return false;
  }

  function sanitizes(fn: FunctionNode): boolean {
    const params = new Set(
      sourceCode
        .getDeclaredVariables(fn)
        .filter((v) => v.defs.some((d) => d.type === 'Parameter')),
    );
    if (params.size === 0 || fn.body.type !== 'BlockStatement') return false;
    // Only a check every return passes through counts: one at the top level
    // of the body, or of a `try` block there. A check nested in another `if`
    // (`if (ALLOWED.length > 0) { if (!ok) throw … }`) or a loop is skipped
    // on some runs, and the value is returned unchecked.
    const visit = (statements: readonly TSESTree.Statement[]): boolean =>
      statements.some(
        (node) =>
          (node.type === 'IfStatement' &&
            exits(node.consequent) &&
            checks(node.test, params)) ||
          (node.type === 'TryStatement' && visit(node.block.body)) ||
          (node.type === 'BlockStatement' && visit(node.body)),
      );
    return visit(fn.body.body);
  }

  return { lineage, guarded, sanitizes };
}
