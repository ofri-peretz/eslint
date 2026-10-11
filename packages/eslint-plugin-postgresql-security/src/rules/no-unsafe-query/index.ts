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
  staticString,
  propertyName,
  objectKeyName,
  resolveModuleBinding,
  unwrapTypeSyntax,
} from '@interlace/eslint-devkit';
import { NoUnsafeQueryOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Methods that hand a raw SQL string to the server.
 *
 * `query` alone was the whole sink list, and `pool.execute(...)` — the spelling
 * every `mysql2`-shaped codebase carries over to `pg`, and the one node-postgres
 * itself accepts on a prepared statement — walked straight past the rule.
 *
 * pg-promise (`db.any/one/none/…`) and postgres.js (`sql.unsafe`) are in the
 * module gate's package list, yet their query methods were never sinks: the
 * gate opened and the rule then looked only at `.query`. Every name here is an
 * exact member of one of those closed API surfaces, and a call is reported
 * only when its first argument is ALSO a SQL statement built from a raw value,
 * so `list.any((x) => …)` stays out.
 */
const SQL_SINK_METHODS: ReadonlySet<string> = new Set([
  'query',
  'execute',
  // pg-promise
  'none',
  'one',
  'oneOrNone',
  'many',
  'manyOrNone',
  'any',
  'result',
  'multi',
  'multiResult',
  // postgres.js — the documented raw-SQL escape hatch
  'unsafe',
]);

/**
 * SQL statements, recognised by a verb **and** its companion keyword.
 *
 * Being called `query` is not evidence of being SQL. The rule reported
 * `analytics.query(`event:${req.query.name}`)` — an analytics client, no
 * database anywhere near it — because the method happened to share a name with
 * the pg sink. What makes a string a statement is that it reads like one, so
 * the static half of the expression has to match `SELECT … FROM`,
 * `UPDATE … SET` and the rest. A lone verb is not enough: `'update ' + name` is
 * a status message far more often than it is SQL.
 */
const SQL_STATEMENTS: readonly RegExp[] = [
  // Verb AND companion keyword. `INSERT`, `UPDATE`, `DELETE` and the DDL verbs
  // are never valid without theirs, so requiring it costs no recall.
  /^\s*select\b[\s\S]*\bfrom\b/i,
  /^\s*insert\s+into\b/i,
  /^\s*update\b[\s\S]*\bset\b/i,
  /^\s*delete\s+from\b/i,
  /^\s*replace\s+into\b/i,
  /^\s*merge\s+into\b/i,
  /^\s*with\b[\s\S]*\bas\s*\(/i,
  // `COPY … TO '<path>'` writes a server-side file; requiring FROM let the
  // write direction through every rule in the plugin.
  /^\s*copy\b[\s\S]*\b(?:from|to)\b/i,
  /^\s*grant\b[\s\S]*\bon\b/i,
  /^\s*(create|drop|alter|truncate)\s+(table|index|view|schema|database|sequence|materialized|type|function|trigger|role|user|extension)\b/i,
  // A bare projection has no FROM clause at all — `SELECT 1`,
  // `SELECT nextval('s')`, `SELECT pg_sleep(1)` — and pg codebases are full of
  // them. Anchored, with required whitespace after the verb, so `event:` and
  // `'selected: ' + n` still stay out.
  /^\s*select\s/i,
  // Statements whose operand is the whole statement: `CALL proc(…)`,
  // `LISTEN ch`, `NOTIFY ch, 'payload'`. Each is anchored to the statement's
  // exact grammar so an English sentence starting with the same word is not one.
  /^\s*call\s+[\w".]+\s*\(/i,
  /^\s*(?:un)?listen\s+[\w"*]*\s*(?:;|$)/i,
  /^\s*notify\s+[\w"]*\s*(?:,|;|$)/i,
];

/** Methods on the pg API (Client, the module itself) that quote what they are given. */
const PG_ESCAPER_METHODS: ReadonlySet<string> = new Set(['escapeIdentifier', 'escapeLiteral']);

/** Global conversions whose result is a number — digits, never SQL. */
const NUMBER_CONVERSIONS: ReadonlySet<string> = new Set(['Number', 'parseInt', 'parseFloat']);

/** Global namespaces every member of which returns a number. */
const NUMBER_NAMESPACES: ReadonlySet<string> = new Set(['Math', 'Number']);

/** Array methods whose callback produces each element of the result. */
const MAPPING_METHODS: ReadonlySet<string> = new Set(['map', 'flatMap', 'from']);

/** The literal text of a string expression, ignoring every interpolated value. */
function staticText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((q) => q.value.raw).join('');
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return `${staticText(node.left as TSESTree.Node)}${staticText(node.right)}`;
  }
  return staticString(node) ?? '';
}

/**
 * The static text a string expression ENDS with — what sits immediately in
 * front of whatever is appended next. `'$' + i` ends with nothing static, so
 * `'$' + i + id` does not put `$` in front of `id`.
 */
function trailingText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return (node.quasis.at(-1) as TSESTree.TemplateElement).value.raw;
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return trailingText(node.right);
  }
  return staticString(node) ?? '';
}

/** Whether the static half of an expression reads as a SQL statement. */
function looksLikeSqlStatement(text: string): boolean {
  return SQL_STATEMENTS.some((pattern) => pattern.test(text));
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

/** Is `name` the JavaScript global, not a binding this file declared? */
function isGlobal(name: string, scope: TSESLint.Scope.Scope): boolean {
  const variable = resolveVariable(name, scope);
  return variable === null || variable.defs.length === 0;
}

/** The initialiser of a `const`-like binding — declared once, never reassigned. */
function singleInit(
  variable: TSESLint.Scope.Variable | null,
): TSESTree.Expression | null {
  if (variable === null) return null;
  if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return null;
  const def = variable.defs.find((d) => d.type === 'Variable');
  if (def === undefined) return null;
  return (def.node as TSESTree.VariableDeclarator).init ?? null;
}

/**
 * Is this the static text right before an interpolation a bind-parameter
 * prefix — a single `$`, not the `$$` that opens a dollar-quoted body?
 */
function endsWithPlaceholderPrefix(text: string): boolean {
  return text.endsWith('$') && !text.endsWith('$$');
}

/**
 * Could this expression be a bind-parameter INDEX?
 *
 * `` `AND name = $${params.length}` `` and `` `$${i + 1}` `` are how every
 * dynamic-filter builder numbers its placeholders: the values go in the bound
 * array, and only the `N` of `$N` is interpolated. The shapes accepted are the
 * ones that number things — a counter, `.length`, `.push(…)` (which returns
 * the new length), and arithmetic over those — not request data, a string, or
 * a member such as `req.query.n`.
 */
function isIndexShaped(node: TSESTree.Node): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return typeof node.value === 'number';
    case AST_NODE_TYPES.Identifier:
    case AST_NODE_TYPES.UpdateExpression:
      return true;
    case AST_NODE_TYPES.MemberExpression:
      return propertyName(node) === 'length';
    case AST_NODE_TYPES.CallExpression:
      return (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(node.callee) === 'push'
      );
    case AST_NODE_TYPES.BinaryExpression:
      return (
        (node.operator === '+' || node.operator === '-' || node.operator === '*') &&
        isIndexShaped(node.left as TSESTree.Node) &&
        isIndexShaped(node.right)
      );
    default:
      return false;
  }
}

/** Is `expression` a placeholder index, given the static text in front of it? */
function isPlaceholderIndex(textBefore: string, expression: TSESTree.Node): boolean {
  return endsWithPlaceholderPrefix(textBefore) && isIndexShaped(expression);
}

/**
 * Does this string expression produce ONLY placeholders and fixed text?
 *
 * The callback of `ids.map((_, i) => `$${i + 1}`)` or
 * `rows.map((r, i) => `($${2 * i + 1}, $${2 * i + 2})`)` — the IN-list and
 * multi-row VALUES idioms.
 */
function isPlaceholderOnly(node: TSESTree.Node): boolean {
  if (staticString(node) !== null) return true;
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.every((expression, i) =>
      isPlaceholderIndex(node.quasis[i].value.raw, expression),
    );
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    const left = node.left as TSESTree.Node;
    return (
      isPlaceholderOnly(left) &&
      (isPlaceholderOnly(node.right) || isPlaceholderIndex(trailingText(left), node.right))
    );
  }
  return false;
}

/** The expression a callback returns, from a concise body or a trailing `return`. */
function callbackResult(fn: TSESTree.Node): TSESTree.Node | null {
  if (
    fn.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    fn.type !== AST_NODE_TYPES.FunctionExpression
  ) {
    return null;
  }
  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return fn.body;
  const last = fn.body.body.at(-1);
  return last?.type === AST_NODE_TYPES.ReturnStatement ? last.argument : null;
}

/** Is this `<arr>.map(cb)` / `Array.from(x, cb)` with a placeholder-only callback? */
function isPlaceholderList(node: TSESTree.Node, scope: TSESLint.Scope.Scope): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) {
    // `const tuples = rows.map(…); tuples.join(', ')`
    const init = singleInit(resolveVariable(node.name, scope));
    return init !== null && init.type === AST_NODE_TYPES.CallExpression && isPlaceholderList(init, scope);
  }
  if (
    node.type !== AST_NODE_TYPES.CallExpression ||
    node.callee.type !== AST_NODE_TYPES.MemberExpression
  ) {
    return false;
  }
  const method = propertyName(node.callee);
  if (method === null || !MAPPING_METHODS.has(method)) return false;
  const mapper = node.arguments.at(-1);
  const result = mapper === undefined ? null : callbackResult(mapper);
  return result !== null && isPlaceholderOnly(result);
}

/**
 * Is this call one that can only produce safe text?
 *
 * Every call used to be exempt, so `${req.body.ids.join(',')}`,
 * `${email.trim()}` and `${String(name)}` — real injections — were silent.
 * Only a CLOSED list now qualifies, each item recognised by where it comes
 * from rather than by what a variable is called:
 *
 *   - pg's own quoting API: `client.escapeIdentifier(x)`, `escapeLiteral`, or
 *     either imported by name from a module;
 *   - anything exported by `pg-format` (`format`, `format.ident`, …);
 *   - pg-promise's formatting namespace, `<pgp>.as.<fn>(x)`;
 *   - the global number conversions and `Math.*` / `Number.*`;
 *   - a placeholder list, `<arr>.map(cb).join(sep)`, whose callback returns
 *     only `$N` placeholders and fixed text;
 *   - a call the devkit already proves static (`path.join` over constants).
 */
function isSafeCall(call: TSESTree.CallExpression, scope: TSESLint.Scope.Scope): boolean {
  const { callee } = call;

  if (callee.type === AST_NODE_TYPES.Identifier) {
    if (NUMBER_CONVERSIONS.has(callee.name) && isGlobal(callee.name, scope)) return true;
  } else if (callee.type === AST_NODE_TYPES.MemberExpression) {
    const method = propertyName(callee);
    if (method !== null && PG_ESCAPER_METHODS.has(method)) return true;
    if (
      callee.object.type === AST_NODE_TYPES.Identifier &&
      NUMBER_NAMESPACES.has(callee.object.name) &&
      isGlobal(callee.object.name, scope)
    ) {
      return true;
    }
    if (
      callee.object.type === AST_NODE_TYPES.MemberExpression &&
      propertyName(callee.object) === 'as'
    ) {
      return true;
    }
    if (method === 'join' && isPlaceholderList(callee.object, scope)) return true;
  }

  const binding = resolveModuleBinding(callee, scope);
  if (binding !== undefined) {
    if (binding.module === 'pg-format') return true;
    const exported = binding.path.at(-1);
    if (exported !== undefined && PG_ESCAPER_METHODS.has(exported)) return true;
  }

  return isStaticExpression({ node: call, scope });
}

/**
 * Does `obj.prop` read a constant?
 *
 * `const TABLES = { users: 'app_users' } as const` and `enum Schema { Public =
 * 'public' }` are how codebases avoid magic table names, and both were
 * reported as injections because a member access was never folded.
 */
function isConstantMember(node: TSESTree.MemberExpression, scope: TSESLint.Scope.Scope): boolean {
  const key = propertyName(node);
  if (key === null || node.object.type !== AST_NODE_TYPES.Identifier) return false;
  const variable = resolveVariable(node.object.name, scope);
  if (variable === null) return false;

  const enumDef = variable.defs.find((d) => d.type === 'TSEnumName');
  if (enumDef !== undefined) {
    const declaration = enumDef.node as TSESTree.TSEnumDeclaration;
    const member = declaration.body.members.find(
      (m) => m.id.type === AST_NODE_TYPES.Identifier && m.id.name === key,
    );
    return (
      member !== undefined &&
      (member.initializer === undefined || member.initializer.type === AST_NODE_TYPES.Literal)
    );
  }

  const init = unwrapTypeSyntax(singleInit(variable));
  if (init === null || init.type !== AST_NODE_TYPES.ObjectExpression) return false;
  const property = init.properties.find(
    (p): p is TSESTree.Property =>
      p.type === AST_NODE_TYPES.Property && objectKeyName(p) === key,
  );
  return property !== undefined && isStaticExpression({ node: property.value, scope });
}

/**
 * Is this interpolated value one the file cannot prove safe?
 *
 * @param self the binding being assembled, when the value is `q` in
 *   `q = q + …` — its earlier text is judged from its own recorded fragments.
 */
function isRawValue(
  value: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  self: TSESLint.Scope.Variable | null,
): boolean {
  const part = unwrapTypeSyntax(value);
  if (
    part.type === AST_NODE_TYPES.BinaryExpression ||
    part.type === AST_NODE_TYPES.TemplateLiteral
  ) {
    return hasRawPart(part, scope, self);
  }
  if (isStaticExpression({ node: part, scope })) return false;
  if (part.type === AST_NODE_TYPES.CallExpression) return !isSafeCall(part, scope);
  if (part.type === AST_NODE_TYPES.MemberExpression) return !isConstantMember(part, scope);
  if (part.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(part.name, scope);
    if (variable !== null && variable === self) return false;
    // A `const` bound to a call is judged exactly as the call written inline:
    // `const placeholders = ids.map(…).join(', ')` and
    // `const col = escapeIdentifier(sort)` used to be reported only because
    // the safe expression was extracted into a variable first.
    const init = unwrapTypeSyntax(singleInit(variable));
    return init === null || init.type !== AST_NODE_TYPES.CallExpression || !isSafeCall(init, scope);
  }
  return true;
}

/**
 * Is some interpolated part a value this file cannot prove safe?
 *
 * `const TABLE = 'users'; db.query(`SELECT * FROM ${TABLE}`)` was reported as an
 * injection. Nothing there can change: the interpolation folds to a literal
 * written three lines up. `isStaticExpression` resolves the binding rather than
 * assuming that interpolation means danger.
 *
 * An interpolation right after a lone `$` that is shaped like an index is a
 * bind-parameter NUMBER (`$${params.length}`), not data.
 */
function hasRawPart(
  node: TSESTree.TemplateLiteral | TSESTree.BinaryExpression,
  scope: TSESLint.Scope.Scope,
  self: TSESLint.Scope.Variable | null,
): boolean {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.some(
      (expression, i) =>
        !isPlaceholderIndex(node.quasis[i].value.raw, expression) &&
        isRawValue(expression, scope, self),
    );
  }
  const left = node.left as TSESTree.Node;
  if (isPlaceholderIndex(trailingText(left), node.right)) {
    return isRawValue(left, scope, self);
  }
  return isRawValue(left, scope, self) || isRawValue(node.right, scope, self);
}

/**
 * The expression a sink argument really holds.
 *
 * A LOCAL query builder resolves to the string it returns:
 *
 *   const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`;
 *   db.query(build(req.query.tag));            // was completely silent
 *
 * Only when the callee resolves HERE and its body is visibly an interpolated
 * string, or ends by returning a binding (whose recorded fragments are then
 * judged). An IMPORTED call — `format('SELECT * FROM %I', table)` — does not
 * resolve, so the documented fixes stay quiet.
 */
function effectiveExpression(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope | null,
): TSESTree.Node {
  // node-postgres also takes a config object: `db.query({ text, values })`.
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    const text = node.properties.find(
      (prop): prop is TSESTree.Property =>
        prop.type === AST_NODE_TYPES.Property &&
        ((prop.key.type === AST_NODE_TYPES.Identifier &&
          !prop.computed &&
          prop.key.name === 'text') ||
          (prop.key.type === AST_NODE_TYPES.Literal && prop.key.value === 'text')),
    );
    return text === undefined ? node : effectiveExpression(text.value, scope);
  }

  // `client.query(new Cursor(text))` / `new QueryStream(text)` — the statement
  // is the constructor's first argument.
  if (node.type === AST_NODE_TYPES.NewExpression) {
    const [first] = node.arguments;
    return first === undefined ? node : effectiveExpression(first, scope);
  }

  // `const config = { text: … }; db.query(config)` — the config object one
  // binding above the sink. A STRING binding is handled by the `fragments`
  // map instead, which also accumulates the `+=` builder shape.
  if (node.type === AST_NODE_TYPES.Identifier) {
    const init = singleInit(resolveVariable(node.name, scope));
    return init !== null && init.type === AST_NODE_TYPES.ObjectExpression
      ? effectiveExpression(init, scope)
      : node;
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (node.callee.type !== AST_NODE_TYPES.Identifier) return node;
    const fn = resolveVariable(node.callee.name, scope);
    const impl = fn === null ? null : functionImplementation(fn);
    if (impl === null) return node;
    const returned = returnedExpression(impl.body);
    return returned === null ? node : returned;
  }
  return node;
}

/**
 * The function a callee name resolves to, when it is written in THIS file.
 *
 * An `ImportBinding` deliberately resolves to nothing. That is what keeps
 * `format(…)` and `escapeIdentifier(…)` — the documented remediations — quiet:
 * escapers come from libraries, builders are written in the file.
 */
function functionImplementation(
  variable: TSESLint.Scope.Variable,
): TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | null {
  const def = variable.defs.find((d) => d.type === 'FunctionName' || d.type === 'Variable');
  if (def === undefined) return null;
  if (def.type === 'FunctionName') {
    return def.node as TSESTree.FunctionDeclaration;
  }
  // A binding written more than once has no knowable implementation at the
  // sink — the call could reach either one.
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
 * A single `return <string>` is read directly. A body of any length that ENDS
 * in `return <binding>` — the ordinary builder,
 *
 *   function build(f) { let q = 'SELECT …'; if (f.a) q += ` AND a = '${f.a}'`; return q; }
 *
 * — returns the binding, whose fragments were recorded statement by statement
 * as the body was walked. A template returned after other statements is still
 * not read: its interpolations could be reassigned in between.
 */
function returnedExpression(body: TSESTree.Node): TSESTree.Node | null {
  if (body.type === AST_NODE_TYPES.BlockStatement) {
    const last = body.body.at(-1);
    if (last?.type !== AST_NODE_TYPES.ReturnStatement || last.argument === null) return null;
    if (last.argument.type === AST_NODE_TYPES.Identifier) return last.argument;
    return body.body.length === 1 ? returnedExpression(last.argument) : null;
  }
  return body.type === AST_NODE_TYPES.TemplateLiteral ||
    body.type === AST_NODE_TYPES.BinaryExpression ||
    body.type === AST_NODE_TYPES.Identifier
    ? body
    : null;
}

/** The leftmost operand of a `+` chain — `q` in `q + a + b`. */
function leftmostOperand(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (current.type === AST_NODE_TYPES.BinaryExpression && current.operator === '+') {
    current = current.left as TSESTree.Node;
  }
  return current;
}

type FragmentKey = TSESLint.Scope.Variable | string;

export const noUnsafeQuery: TSESLint.RuleModule<
  'noUnsafeQuery' | 'unsafeTemplateLiteral',
  NoUnsafeQueryOptions
> = {
  meta: {
    type: 'problem',
    // CWE / CVSS lifted to meta.docs (Interlace extension) so
    // @interlace/eslint-formatter renders them inline. Previously these
    // values lived only inside the `messages` factory below, where the
    // whole-run formatter cannot see them. See docs/META_HYGIENE.md for
    // the fleet-wide audit and tracker P1 #5 for the rollout plan.
    docs: {
      description: 'Prevent SQL injection by disallowing string concatenation or unsafe template literals in queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-unsafe-query.md',
      // CWE / CVSS surfaces in the formatter (devkit augments RuleMetaDataDocs).
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
    messages: {
      noUnsafeQuery: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection Risk',
        description: 'Unsafe SQL query detected. Variable interpolation found.',
        severity: 'CRITICAL',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
        effort: 'high',
        fix: 'Use parameterized queries ($1, $2) instead of string concatenation.',
        documentationLink: 'https://node-postgres.com/features/queries#parameterized-queries',
      }),
      unsafeTemplateLiteral: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection Risk',
        description: 'Unsafe SQL query construction detected (template literal).',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries ($1, $2) instead of interpolating values.',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;

    // Every rule here is PostgreSQL-specific, and none of them knew it: over
    // 108,838 files, 94% of this plugin's findings were in files with no
    // PostgreSQL client at all. Registering no visitors is both the gate and
    // the cheap path — a file with no database in it does no work. A file that
    // reaches PostgreSQL only through a local `./db` wrapper is deliberately
    // left to `secure-coding`: the SDK-evidence gate is a contract shared with
    // the sibling SQL plugins (benchmarks/__tests__/sdk-gate-coverage.lock).
    if (!fileUsesPostgres(sourceCode.ast)) return {};

    /**
     * Every string-valued fragment written into a local binding, in source
     * order, keyed by the BINDING (not its name — `sql` declared in one
     * function used to taint a `sql` parameter in the next).
     *
     *   let q = "SELECT * FROM products WHERE 1=1";
     *   q += ` AND name = '${name}'`;      // ← alone, not a SQL statement
     *   db.query(q);                       // ← together, plainly one
     */
    const fragments = new Map<FragmentKey, TSESTree.Node[]>();

    /** The binding an identifier names, or its bare name when it names none. */
    const keyFor = (id: TSESTree.Identifier): FragmentKey =>
      resolveVariable(id.name, sourceCode.getScope(id)) ?? `global:${id.name}`;

    /** Is this expression a string being BUILT out of parts, rather than written? */
    const isBuilt = (node: TSESTree.Node): boolean =>
      (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length > 0) ||
      (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+');

    /** Does this expression contribute text to a SQL string? */
    const isStringish = (node: TSESTree.Node): boolean =>
      isBuilt(node) ||
      node.type === AST_NODE_TYPES.TemplateLiteral ||
      (staticString(node) !== null);

    /**
     * Report when the fragments together form a SQL statement built out of at
     * least one value this file cannot prove safe.
     *
     * All three conditions are required, and each one is a false positive the
     * rule used to ship:
     *   built     — `db.query('SELECT 1')` is not assembled from anything
     *   SQL       — `analytics.query(`event:${name}`)` is not a statement
     *   raw part  — `` `SELECT * FROM ${TABLE}` `` folds to a literal
     */
    const reportIfUnsafe = (
      reportNode: TSESTree.Node,
      parts: readonly TSESTree.Node[],
      self: FragmentKey | null,
    ): void => {
      const selfVariable = typeof self === 'string' ? null : self;
      let kind: 'concat' | 'template' | null = null;
      let raw = false;
      let text = '';

      for (const part of parts) {
        text += staticText(part);
        const scope = sourceCode.getScope(part);
        if (part.type === AST_NODE_TYPES.BinaryExpression && part.operator === '+') {
          kind = 'concat';
          if (hasRawPart(part, scope, selfVariable)) raw = true;
        } else if (
          part.type === AST_NODE_TYPES.TemplateLiteral &&
          part.expressions.length > 0
        ) {
          kind = 'template';
          if (hasRawPart(part, scope, selfVariable)) raw = true;
        }
      }

      if (kind === null || !raw) return;
      if (!looksLikeSqlStatement(text)) return;

      context.report({
        node: reportNode,
        messageId: kind === 'template' ? 'unsafeTemplateLiteral' : 'noUnsafeQuery',
      });
    };

    return {
      // const query = "SELECT..." + userId;   let query = "SELECT ...";
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init &&
          isStringish(node.init)
        ) {
          fragments.set(keyFor(node.id), [node.init]);
        }
      },

      // query += " AND ..." + var   ·   query = `...${var}`   ·   q = q + "..."
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== AST_NODE_TYPES.Identifier) return;
        const key = keyFor(node.left);

        if (node.operator === '+=') {
          const existing = fragments.get(key);
          if (existing === undefined) fragments.set(key, [node.right]);
          else existing.push(node.right);
          return;
        }
        if (node.operator !== '=') return;

        if (!isStringish(node.right)) {
          // Overwritten with something that is not query text: whatever was
          // recorded before no longer reaches the sink.
          fragments.delete(key);
          return;
        }
        const head = leftmostOperand(node.right);
        const existing = fragments.get(key);
        if (
          existing !== undefined &&
          head.type === AST_NODE_TYPES.Identifier &&
          keyFor(head) === key
        ) {
          existing.push(node.right);
        } else {
          fragments.set(key, [node.right]);
        }
      },

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

        const scope = sourceCode.getScope(node);

        // The query written at the sink, or the one a LOCAL builder returns.
        const expression = effectiveExpression(queryArg, scope);
        if (isBuilt(expression)) {
          reportIfUnsafe(queryArg, [expression], null);
          return;
        }

        // Otherwise the query was assembled into a binding: db.query(sql),
        // db.query({ text }), or a builder's `return q`.
        if (expression.type === AST_NODE_TYPES.Identifier) {
          const key = keyFor(expression);
          const parts = fragments.get(key);
          if (parts !== undefined) reportIfUnsafe(queryArg, parts, key);
        }
      },
    };
  },
};
