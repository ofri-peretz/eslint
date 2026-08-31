/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import {
  TSESLint,
  AST_NODE_TYPES,
  TSESTree,
  formatLLMMessage,
  MessageIcons,
  isStaticExpression,
} from '@interlace/eslint-devkit';
import { NoUnsafeSearchPathOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Methods that hand a raw SQL string to the server.
 *
 * `query` alone was the whole sink list, so `pool.execute(...)` — the spelling
 * node-postgres accepts on a prepared statement, and the one every codebase
 * migrating off `mysql2` keeps writing — walked straight past the rule.
 * Exact membership against a closed API surface, never a substring.
 */
const SQL_SINK_METHODS: ReadonlySet<string> = new Set(['query', 'execute']);

/**
 * A statement that changes how unqualified names resolve.
 *
 * Anchored at the START of a statement, and matched per `;`-separated segment,
 * because the previous check was `text.toLowerCase().includes('set search_path')`
 * and that has both failure directions:
 *
 *   FALSE POSITIVE  `INSERT INTO audit_log (message)
 *                     VALUES ('set search_path changed by ${actor}')`
 *                   — the phrase is DATA inside a quoted string, and the rule
 *                     reported an audit write as schema hijacking.
 *   FALSE NEGATIVE  `set   local   search_path  to ${s}` — two spaces, or the
 *                   `LOCAL` / `SESSION` qualifier, and the substring is gone
 *                   while the server behaves identically.
 *
 * `\s+` spans newlines, so the multi-line spelling every migration file uses
 * is covered by the same pattern.
 */
const SEARCH_PATH_STATEMENT = /^\s*set\s+(?:local\s+|session\s+)?search_path\b/i;

/** SQL comments, stripped before a statement's verb is read. */
const SQL_COMMENTS = /--[^\n]*|\/\*[\s\S]*?\*\//g;

/** How many bindings deep to follow a value before giving up. */
const MAX_RESOLUTION_DEPTH = 4;

/** The literal text of a string expression, ignoring every interpolated value. */
function staticText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    // `cooked` FIRST, not `raw`: a template written with `\n` escapes has a
    // backslash in its raw text, and reading that made the statement's verb
    // unreadable on SQL the server sees as perfectly ordinary.
    //
    // But `cooked` is nullable, and the last sentence here used to deny it —
    // @typescript-eslint 8.68.0 both types it `string | null` and EMITS null
    // for an escape it cannot cook, where 8.54.0 handed back the raw text. A
    // bare template with a bad escape is a parse error, so null here means the
    // `String.raw` unwrap, whose raw text IS what the server sees. Locked.
    return node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('');
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return `${staticText(node.left as TSESTree.Node)}${staticText(node.right)}`;
  }
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return node.value;
  }
  return '';
}

/** Whether any statement in this text sets the search path. */
function setsSearchPath(text: string): boolean {
  return text
    .replace(SQL_COMMENTS, '')
    .split(';')
    .some((statement) => SEARCH_PATH_STATEMENT.test(statement));
}

/** The variable a name resolves to, walking outward from `scope`. */
function resolveVariable(
  name: string,
  scope: TSESLint.Scope.Scope | null,
): TSESLint.Scope.Variable | null {
  for (let current = scope; current !== null; current = current.upper) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable;
  }
  return null;
}

/**
 * The function a callee name resolves to, when it is written in THIS file.
 *
 * A plain `function buildSearchPath(s) { … }` is a `FunctionName` definition
 * with no initialiser, so resolving only through `VariableDeclarator.init`
 * missed the most ordinary builder spelling of all.
 *
 * An import binding deliberately resolves to nothing: `format(…)` from
 * `pg-format` is a library call, and the call arm below judges it on its
 * arguments rather than on a body this file cannot see.
 */
function functionImplementation(
  variable: TSESLint.Scope.Variable,
):
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression
  | null {
  const def = variable.defs.find((d) => d.type === 'FunctionName' || d.type === 'Variable');
  if (def === undefined) return null;
  if (def.type === 'FunctionName') {
    return def.node as TSESTree.FunctionDeclaration;
  }
  if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return null;
  const init = (def.node as TSESTree.VariableDeclarator).init;
  if (
    init === null ||
    init === undefined ||
    (init.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
      init.type !== AST_NODE_TYPES.FunctionExpression)
  ) {
    return null;
  }
  return init;
}

/**
 * The string a function body evaluates to.
 *
 * A concise arrow is the rarer spelling. `function build(s) { return '…' + s; }`
 * has a BlockStatement body, and reading only the concise form left the most
 * common builder in the corpus completely unanalysed.
 *
 * A block with more than one statement is not read: the string could be
 * reassigned in between, and guessing is how a precise rule becomes a noisy one.
 */
function returnedExpression(body: TSESTree.Node): TSESTree.Node | null {
  if (body.type === AST_NODE_TYPES.BlockStatement) {
    const [only] = body.body;
    if (body.body.length !== 1 || only.type !== AST_NODE_TYPES.ReturnStatement) {
      return null;
    }
    return only.argument === null ? null : returnedExpression(only.argument);
  }
  return body.type === AST_NODE_TYPES.TemplateLiteral ||
    body.type === AST_NODE_TYPES.BinaryExpression ||
    (body.type === AST_NODE_TYPES.Literal && typeof body.value === 'string')
    ? body
    : null;
}

/**
 * `String.raw` — the one tag that hands the template through unchanged.
 *
 * Tagged templates are unwrapped for this tag ONLY, and that restriction is
 * the whole point. `sql`…`` from postgres.js or slonik binds every
 * interpolation as a parameter, so unwrapping those would report the safest
 * client in the ecosystem; every other tag therefore stays unanalysed.
 * `String.raw` transforms nothing, so the string the server sees is the string
 * written in the source — and the adversarial wave found all three rules in
 * this package silent on it.
 */
function isStringRawTag(node: TSESTree.TaggedTemplateExpression): boolean {
  const { tag } = node;
  return (
    tag.type === AST_NODE_TYPES.MemberExpression &&
    !tag.computed &&
    tag.object.type === AST_NODE_TYPES.Identifier &&
    tag.object.name === 'String' &&
    tag.property.type === AST_NODE_TYPES.Identifier &&
    tag.property.name === 'raw'
  );
}

/** The initialiser of a binding written exactly once. */
function singleAssignedInit(variable: TSESLint.Scope.Variable): TSESTree.Node | null {
  if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return null;
  const def = variable.defs.find((d) => d.type === 'Variable');
  if (def === undefined) return null;
  const init = (def.node as TSESTree.VariableDeclarator).init;
  return init ?? null;
}

/**
 * The expression a sink argument really holds.
 *
 * Two hops, both of which the rule used to walk straight past:
 *
 *   const sql = `SET search_path TO ${schema}`;   // the statement in a binding
 *   await pool.query(sql);                        // ← was completely silent
 *
 *   const searchPathFor = (s) => `SET search_path TO ${s}`;
 *   await pool.query(searchPathFor(tenant));      // ← was completely silent
 *
 * The sink saw an `Identifier` and a `CallExpression`, neither of which is a
 * template or a concatenation, so the whole hijack disappeared. Substituting
 * what the binding or the local builder holds makes the real statement visible
 * to every gate below.
 */
function effectiveExpression(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope | null,
  depth = 0,
): TSESTree.Node {
  if (depth >= MAX_RESOLUTION_DEPTH) return node;

  if (node.type === AST_NODE_TYPES.TaggedTemplateExpression) {
    return isStringRawTag(node) ? node.quasi : node;
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(node.name, scope);
    const init = variable === null ? null : singleAssignedInit(variable);
    return init === null ? node : effectiveExpression(init, scope, depth + 1);
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (node.callee.type !== AST_NODE_TYPES.Identifier) return node;
    const fn = resolveVariable(node.callee.name, scope);
    const impl = fn === null ? null : functionImplementation(fn);
    if (impl === null) return node;
    const returned = returnedExpression(impl.body);
    return returned === null ? node : effectiveExpression(returned, scope, depth + 1);
  }

  return node;
}

/** Does this subtree contain a statement that leaves the function? */
function exitsUnconditionally(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.ThrowStatement ||
    node.type === AST_NODE_TYPES.ReturnStatement
  ) {
    return true;
  }
  if (node.type === AST_NODE_TYPES.BlockStatement) {
    return node.body.some(exitsUnconditionally);
  }
  // Everything else — a bare `console.warn(…)`, a loop, a nested `if` — leaves
  // the value able to reach the sink, so it is not a guard.
  return false;
}

/**
 * Is this binding checked against an allowlist before the sink runs?
 *
 * The remediation for CWE-426 is not escaping — it is refusing the value. Both
 * spellings are in the wild and both are real:
 *
 *   if (!TENANT_SCHEMAS.has(schema)) throw new Error(…);
 *   if (!ALLOWED.includes(schema)) { res.status(400).json(…); return; }
 *
 * Proven structurally: a reference to the SAME variable (resolved through
 * scope, never matched by name) appears in the test of an `if` whose consequent
 * leaves the function, and that `if` closes before the sink opens. A rule that
 * reported these would be telling a developer who did the right thing that they
 * did the wrong thing, which is how a security rule gets switched off.
 */
function isAllowlistGuarded(
  variable: TSESLint.Scope.Variable,
  sink: TSESTree.Node,
): boolean {
  return variable.references.some((ref) => {
    // `Program.parent` is `null`, not `undefined` — an `!== undefined` guard
    // walks one step past the root and dereferences it.
    for (
      let current: TSESTree.Node | null | undefined = ref.identifier as TSESTree.Node;
      current !== undefined && current !== null;
      current = current.parent
    ) {
      // Annotated explicitly: `current` is itself `Node | null | undefined`, so
      // inferring `parent` from `current.parent` is circular and tsc widens it
      // to `any` (TS7022) — which vitest never sees, because it does not
      // typecheck. Green tests are not a typecheck.
      const parent: TSESTree.Node | null | undefined = current.parent;
      if (
        parent !== undefined &&
        parent !== null &&
        parent.type === AST_NODE_TYPES.IfStatement &&
        parent.test === current
      ) {
        return parent.range[1] <= sink.range[0] && exitsUnconditionally(parent.consequent);
      }
    }
    return false;
  });
}

/**
 * Is this interpolated part a value the file cannot prove constant and safe?
 *
 * A CALL is raw here, and that is the deliberate difference from
 * `no-unsafe-query`. There, `escapeIdentifier(x)` IS the documented fix and
 * reporting it hands a developer their own remediation. Here it is not:
 * `SET search_path TO ${escapeIdentifier(tenant)}` is perfectly quoted and
 * still lets the attacker choose which schema shadows every function the rest
 * of the session calls. CWE-426 is about WHICH schema, not about how it is
 * spelled — quoting fixes injection, an allowlist fixes hijacking.
 */
function isRawPart(
  part: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  sink: TSESTree.Node,
): boolean {
  if (
    part.type === AST_NODE_TYPES.BinaryExpression ||
    part.type === AST_NODE_TYPES.TemplateLiteral
  ) {
    return hasRawPart(part, scope, sink);
  }
  if (isStaticExpression({ node: part, scope })) return false;
  if (part.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(part.name, scope);
    if (variable !== null && isAllowlistGuarded(variable, sink)) return false;
  }
  return true;
}

/** Whether any interpolated value in this expression is raw. */
function hasRawPart(
  node: TSESTree.TemplateLiteral | TSESTree.BinaryExpression,
  scope: TSESLint.Scope.Scope,
  sink: TSESTree.Node,
): boolean {
  const parts: TSESTree.Node[] =
    node.type === AST_NODE_TYPES.TemplateLiteral
      ? [...node.expressions]
      : [node.left as TSESTree.Node, node.right];
  return parts.some((part) => isRawPart(part, scope, sink));
}

export const noUnsafeSearchPath: TSESLint.RuleModule<
  'noUnsafeSearchPath',
  NoUnsafeSearchPathOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent unsafe SET search_path usage with dynamic values, which can lead to schema hijacking.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-unsafe-search-path.md',
      cwe: 'CWE-426',
      cvss: 7.5,
    },
    messages: {
      noUnsafeSearchPath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Schema Hijacking Risk',
        description: 'Unsafe "SET search_path" detected.',
        severity: 'CRITICAL',
        cwe: 'CWE-426',
        owasp: 'A05:2021',
        compliance: ['SOC2', 'PCI-DSS'],
        effort: 'low',
        fix: 'Do not use dynamic values for search_path. Use static strings or strict validation.',
        documentationLink:
          'https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Every rule here is PostgreSQL-specific, and none of them knew it: over
    // 108,838 files, 94% of this plugin's findings were in files with no
    // PostgreSQL client at all. Registering no visitors is both the gate and
    // the cheap path — a file with no database in it does no work.
    if (!fileUsesPostgres(context.sourceCode.ast)) return {};

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          !SQL_SINK_METHODS.has(node.callee.property.name)
        ) {
          return;
        }

        const [queryArg] = node.arguments;
        if (queryArg === undefined || queryArg.type === AST_NODE_TYPES.SpreadElement) {
          return;
        }

        const scope = context.sourceCode.getScope(node);
        const expression = effectiveExpression(queryArg, scope);

        // A library formatter — `format('SET search_path TO %I', schema)`.
        // `%I` quotes the identifier, which stops injection and does nothing
        // whatsoever about hijacking, so a non-constant argument is still the
        // finding. All-constant arguments are the safe form and stay quiet.
        if (expression.type === AST_NODE_TYPES.CallExpression) {
          const statement = expression.arguments.find(
            (arg) => arg.type !== AST_NODE_TYPES.SpreadElement && setsSearchPath(staticText(arg)),
          );
          if (statement === undefined) return;
          const dynamic = expression.arguments.some(
            (arg) =>
              arg.type === AST_NODE_TYPES.SpreadElement ||
              !isStaticExpression({ node: arg, scope }),
          );
          if (dynamic) {
            context.report({ node: queryArg, messageId: 'noUnsafeSearchPath' });
          }
          return;
        }

        if (
          expression.type !== AST_NODE_TYPES.TemplateLiteral &&
          !(
            expression.type === AST_NODE_TYPES.BinaryExpression &&
            expression.operator === '+'
          )
        ) {
          return;
        }

        if (!setsSearchPath(staticText(expression))) return;
        if (!hasRawPart(expression, scope, node)) return;

        context.report({ node: queryArg, messageId: 'noUnsafeSearchPath' });
      },
    };
  },
};
