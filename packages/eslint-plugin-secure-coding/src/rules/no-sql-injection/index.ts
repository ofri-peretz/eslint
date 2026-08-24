/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sql-injection
 * CWE-89: SQL injection built from attacker-attributable input, in files that
 * import no SQL driver.
 *
 * @see https://cwe.mitre.org/data/definitions/89.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  unwrapTypeSyntax,
  isStaticExpression,
} from '@interlace/eslint-devkit';

/**
 * A builder parameter, bound to the expression the CALLER passed for it.
 *
 * `node === null` means the call supplied no argument for that parameter, so
 * the value is `undefined` — a static value, and never a finding.
 */
interface Substitution {
  node: TSESTree.Node | null;
  scope: TSESLint.Scope.Scope;
}

/** Parameter bindings carried across a resolved local builder call. */
type Substitutions = ReadonlyMap<TSESLint.Scope.Variable, Substitution>;

const NO_SUBSTITUTIONS: Substitutions = new Map();

/**
 * The caller-supplied expression a binding stands for, when the binding is a
 * parameter of a local builder we substituted through.
 */
function substitutionFor(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  substitutions: Substitutions,
): Substitution | undefined {
  if (node.type !== AST_NODE_TYPES.Identifier) return undefined;
  const variable = resolveVariable(node.name, scope);
  return variable === null ? undefined : substitutions.get(variable);
}

/**
 * Is some interpolated part a RAW value — not static, and not the result of a
 * call?
 *
 * The call exclusion is load-bearing, and the rule's own suite is what proved
 * it: `db.query('... ORDER BY ' + escapeIdentifier(req.query.sort))` is the
 * DOCUMENTED FIX for this weakness, and a blanket "report anything
 * non-static" reported it. A corpus of vulnerable and safe files did not catch
 * that, because the remediation is a configuration promise rather than a
 * vulnerability shape — the suite tests what the corpus cannot.
 */
function hasRawUnattributedPart(
  node: TSESTree.TemplateLiteral | TSESTree.BinaryExpression,
  scope: TSESLint.Scope.Scope,
  substitutions: Substitutions,
): boolean {
  // Only ever entered with a template literal or a `+` concatenation — those
  // are the two shapes that make a query "built" rather than written, and the
  // caller has already established one of them. A third fallback arm was
  // unreachable, and istanbul was right to say so.
  const parts: TSESTree.Node[] =
    node.type === AST_NODE_TYPES.TemplateLiteral
      ? [...node.expressions]
      : [node.left as TSESTree.Node, node.right];
  return parts.some((part) => {
    if (part.type === AST_NODE_TYPES.CallExpression) return false;
    if (
      part.type === AST_NODE_TYPES.BinaryExpression ||
      part.type === AST_NODE_TYPES.TemplateLiteral
    ) {
      return hasRawUnattributedPart(part, scope, substitutions);
    }
    // Inside a substituted builder body the parameter is a placeholder; what
    // decides staticness is the argument the caller actually passed.
    const bound = substitutionFor(part, scope, substitutions);
    if (bound !== undefined) {
      return (
        bound.node !== null &&
        !isStaticExpression({ node: bound.node, scope: bound.scope })
      );
    }
    return !isStaticExpression({ node: part, scope });
  });
}

export interface Options {
  /**
   * Report SQL built by interpolation even when the value cannot be traced to a
   * request IN THIS FILE. Default: `false`.
   *
   * `this.x`, a property of a non-request object, or a helper's return value
   * has provenance the rule cannot see — but the fix for CWE-89 is to
   * parameterise regardless, so the concatenation itself is the finding.
   */
  reportUnattributedInterpolation?: boolean;
  /**
   * Treat a function parameter spliced into statement text as an untrusted
   * inlet. Default: `true`.
   *
   * Nothing in this file constrains what a caller passes, so
   * `export function search(term) { db.query("… LIKE '%" + term + "%'") }` is
   * a SQL injection whose taint root simply lives in another file. Set `false`
   * to report only values traceable to a request within the file being linted.
   */
  treatParametersAsUntrusted?: boolean;
  /**
   * Identifier roots that denote an inbound request. Default:
   * `['req', 'request', 'ctx', 'event']` — Express/Fastify, Koa and Lambda.
   *
   * Matched by exact identity, never by substring, so a `requestId` local is
   * not a request.
   */
  requestRoots?: readonly string[];
  /**
   * Properties of a request that carry caller-supplied data. Default:
   * `['query', 'params', 'body', 'headers', 'cookies', 'url', 'path']`.
   *
   * `req.locals` is deliberately absent: middleware sets it, a caller does not.
   */
  requestProperties?: readonly string[];
  /**
   * Method names that execute a raw SQL string. Default: `['query', 'execute']`.
   *
   * Widen it for a house wrapper (`db.raw`, `db.exec`). Every name is matched
   * exactly against the called member, never as a substring.
   */
  sinkMethods?: readonly string[];
  /**
   * Ambient global calls that hand their argument through unchanged, so taint
   * survives them. Default: `['String']`.
   *
   * A name counts only when nothing in the file declares it, so a local
   * `function String(v) { … }` is not mistaken for the global.
   */
  transparentCalls?: readonly string[];
  /**
   * Properties of a driver query-config object that hold the statement text.
   * Default: `['text', 'sql']` — `db.query({ text, values })`.
   */
  queryTextProperties?: readonly string[];
}

type MessageIds = 'sqlInjection';

/**
 * Packages that put a SQL client in a file — the union of every `modules` list
 * the driver-specific plugins declare.
 *
 * This set is the **complement** of the driver rules' gate, not a copy of it.
 * `createSqlInjectionRule` (devkit) and `pg/no-unsafe-query` report only in a
 * file that imports their own driver; this rule reports only in a file that
 * imports none of them. The two tests are complements, so exactly one rule
 * owns any given `db.query(...)` site and `recommended` never bills the same
 * line twice — the duplicate-finding class #478 was opened to close.
 *
 * Keep in sync with: postgresql-security `PG_MODULES`, mysql-security,
 * sqlite-security, typeorm-security, sequelize-security, knex-security,
 * drizzle-security and prisma-security `modules`.
 *
 * The complement only holds because both sides recognise the *same* set of
 * load forms. It once did not: `createSqlInjectionRule` decided `ownsFile`
 * from `Program.body` `ImportDeclaration`s alone, so a CommonJS
 * `const mysql = require('mysql2')` was invisible to the mysql/typeorm/knex/
 * drizzle/sqlite/prisma/sequelize rules while this rule abstained there too —
 * because the `require` arm below always saw it. Nobody reported that file.
 * The factory now runs the shared `createModuleEvidence` probe, the same one
 * behind `postgresql-security`'s `fileUsesPostgres`, so `require`, dynamic
 * `import()` and `import =` open both gates or neither.
 *
 * Widening *this* rule was the wrong fix and stays wrong: it would make every
 * CommonJS `require('pg')` file report twice, since the pg gate already
 * handles `require`. Any future load form belongs in the shared probe, where
 * both sides pick it up at once.
 *
 * @protocol-constant These are npm package specifiers, and the set is one half
 * of a PARTITION with the driver plugins (postgresql-security, mysql-security,
 * sqlite-security, typeorm-security, sequelize-security, knex-security,
 * drizzle-security, prisma-security): this rule owns a `db.query(...)` site if
 * and only if none of those plugins does. That is an ownership contract between
 * packages, not a vocabulary of words about a domain. A consumer who could edit
 * it would break the partition in one of two silent ways — removing a specifier
 * makes both this rule and the driver rule claim the same line, re-opening the
 * duplicate-finding class #478 was filed to close, and adding one makes NEITHER
 * rule own the file, so a genuine CWE-89 concatenation goes unreported with no
 * diagnostic anywhere. The supported knobs for this rule's own reach are
 * `sinkMethods`, `transparentCalls`, `queryTextProperties`, `requestRoots` and
 * `requestProperties`; the driver split is not one of them.
 */
const SQL_DRIVER_MODULES: ReadonlySet<string> = new Set([
  // PostgreSQL — postgresql-security/PG_MODULES
  'pg',
  'pg-pool',
  'pg-native',
  'pg-cursor',
  'pg-promise',
  'pg-copy-streams',
  'postgres',
  'slonik',
  '@vercel/postgres',
  '@neondatabase/serverless',
  '@electric-sql/pglite',
  // MySQL
  'mysql',
  'mysql2',
  '@planetscale/database',
  // SQLite
  'sqlite3',
  'better-sqlite3',
  'node:sqlite',
  'bun:sqlite',
  '@libsql/client',
  // ORMs and query builders that own their own rules
  'typeorm',
  '@nestjs/typeorm',
  'sequelize',
  'sequelize-typescript',
  '@nestjs/sequelize',
  'knex',
  'objection',
  'drizzle-orm',
  '@prisma/client',
  'prisma',
  // Raw clients with no plugin of their own yet — still excluded, because a
  // file holding one of these is a driver file and adding its plugin later
  // must not turn this rule into a duplicate.
  'kysely',
  'mssql',
  'oracledb',
]);

/**
 * Whether a module specifier names a SQL driver.
 *
 * Compared on the package root so `mysql2/promise` and `@prisma/client/edge`
 * count. A relative or absolute specifier is never a package and is rejected
 * outright — otherwise `'./pg'` would silence this rule in a repo that has no
 * `pg`, which is a false negative rather than a partition.
 */
function isSqlDriverSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  return SQL_DRIVER_MODULES.has(root);
}

/** The string value of a node, when it is a plain string literal. */
function stringLiteralValue(node: TSESTree.Node | undefined): string | null {
  if (
    node !== undefined &&
    node.type === AST_NODE_TYPES.Literal &&
    typeof node.value === 'string'
  ) {
    return node.value;
  }
  return null;
}

/** Method names that execute a raw SQL string. Overridable via `sinkMethods`. */
const SQL_SINK_METHODS: readonly string[] = ['query', 'execute'];

/**
 * Global conversions that hand their argument through unchanged. Overridable
 * via `transparentCalls`.
 */
const TRANSPARENT_CALLS: readonly string[] = ['String'];

/**
 * Properties of a driver query-config object that hold the statement text.
 * Overridable via `queryTextProperties`.
 */
const QUERY_TEXT_PROPERTIES: readonly string[] = ['text', 'sql'];

/**
 * The method name a member callee actually invokes — including when it is
 * written computed.
 *
 * `db['query'](…)` and `const M = 'query'; db[M](…)` execute exactly what
 * `db.query(…)` executes. Requiring a non-computed `Identifier` property meant
 * the sink test could be defeated by moving the name one line up, which is the
 * cheapest evasion there is. Resolved through the binding, so the answer comes
 * from the value and not from how it was spelled; `db[pickMethod()](…)` still
 * yields `null` and is left alone.
 */
function invokedMethodName(
  callee: TSESTree.MemberExpression,
  scope: TSESLint.Scope.Scope,
): string | null {
  if (!callee.computed) {
    return callee.property.type === AST_NODE_TYPES.Identifier
      ? callee.property.name
      : null;
  }
  const direct = stringLiteralValue(callee.property);
  if (direct !== null) return direct;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return null;
  const variable = resolveVariable(callee.property.name, scope);
  if (variable === null) return null;
  const init = singleAssignedInit(variable);
  return init === null ? null : stringLiteralValue(init);
}

/**
 * SQL statements, recognised by a verb **and** its companion keyword.
 *
 * A single verb is not evidence. `'update ' + name` is a status message far
 * more often than it is a statement, and `no-graphql-injection`'s demotion to
 * `warn` is what a keyword-soup matcher costs. Requiring `SELECT … FROM`,
 * `UPDATE … SET` and the rest means the static text has to be shaped like a
 * statement, not merely contain a word that also appears in one.
 */
const SQL_STATEMENTS: readonly RegExp[] = [
  /^\s*select\b[\s\S]*\bfrom\b/i,
  /^\s*insert\s+into\b/i,
  /^\s*update\b[\s\S]*\bset\b/i,
  /^\s*delete\s+from\b/i,
  /^\s*replace\s+into\b/i,
  /^\s*merge\s+into\b/i,
];

/** Literal text of a string expression, ignoring interpolated values. */
function staticText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((q) => q.value.raw).join('');
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return `${staticText(node.left as TSESTree.Node)}${staticText(node.right)}`;
  }
  const literal = stringLiteralValue(node);
  return literal === null ? '' : literal;
}

/**
 * Whether the static half of a statement reads as SQL.
 *
 * Judged on the WHOLE text, joined across every write that reaches the sink —
 * `'SELECT … WHERE 1=1'` and `' AND name = '` are only a statement together.
 */
function looksLikeSqlStatement(nodes: readonly TSESTree.Node[]): boolean {
  const text = nodes.map(staticText).join('');
  return SQL_STATEMENTS.some((pattern) => pattern.test(text));
}

/** Whether an expression builds a string out of parts. */
function isBuiltString(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.length > 0;
  }
  return node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+';
}

/** Identifier roots that denote an inbound request. Overridable via `requestRoots`. */
const REQUEST_ROOTS: readonly string[] = ['req', 'request', 'ctx', 'event'];

/**
 * Properties of a request that carry caller-supplied data. Overridable via
 * `requestProperties`.
 */
const REQUEST_PROPERTIES: readonly string[] = [
  'query',
  'params',
  'body',
  'headers',
  'cookies',
  'url',
  'path',
];

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
 * The initialiser of a variable that is written exactly once.
 *
 * More than one write and the value at the sink is not knowable from the
 * declaration, so this abstains. That deliberately gives up the `let sql =
 * '…'; sql += ' AND x = ' + x` builder shape: the driver-scoped rules track
 * `+=` because they already know the file is a database file, and guessing at
 * it here — in a rule that runs on *every* file with no driver evidence at
 * all — is how a precise rule becomes a noisy one.
 */
function singleAssignedInit(
  variable: TSESLint.Scope.Variable,
): TSESTree.Node | null {
  const writes = variable.references.filter((ref) => ref.isWrite());
  if (writes.length !== 1) return null;
  // Only a `var`/`let`/`const` declaration carries an initialiser to follow.
  // A parameter assigned once inside its body, a class name and an import
  // binding are all written-once too, and none of them has one.
  const def = variable.defs.find((d) => d.type === 'Variable');
  if (def === undefined) return null;
  return (def.node as TSESTree.VariableDeclarator).init ?? null;
}

/**
 * Is this binding a function parameter — a value supplied by a caller this file
 * cannot see?
 *
 * Decided from the SCOPE DEFINITION KIND, never from the spelling. `Parameter`
 * is the escope definition every function, method, arrow and setter parameter
 * carries; a `catch` binding is `CatchClause` and a loop counter is `Variable`,
 * so neither is mistaken for an inlet.
 */
function isParameterBinding(variable: TSESLint.Scope.Variable): boolean {
  return variable.defs.some((def) => def.type === 'Parameter' && !bindsADeclaredContract(def));
}

/**
 * Is this parameter a field destructured out of a NAMED type?
 *
 * `treatParametersAsUntrusted` closed a real gap — `export function search(term)`
 * reaching `db.query` was silent, and that is the commonest real shape there is.
 * But measured against 17,775 files of real source it also produced **128 false
 * positives in n8n alone**, every one of them this:
 *
 *   async up({ queryRunner, tablePrefix }: MigrationContext) {
 *     await queryRunner.query(`INSERT INTO ${tablePrefix}role …`);
 *   }
 *
 * A TypeORM migration. The "caller" is the framework's own migration runner, the
 * value comes from deployment config, and no attacker is anywhere in that path.
 * Reporting CVSS 9.8 on it is how a maintainer switches the plugin off.
 *
 * The evidence that separates them is the annotation. A bare `term`, or a `term:
 * string`, constrains the caller to nothing. A field pulled out of a named type
 * is bound by a contract this codebase declares — the caller cannot pass whatever
 * it likes, it has to satisfy the interface.
 *
 * This costs no recall: `export function handler({ body }: Request)` — a real
 * injection through a typed request destructure — was ALREADY invisible here,
 * verified by probe before the narrowing. Request-shaped provenance is the
 * `requestRoots`/`requestProperties` path's job, and that it does not yet cover
 * this shape is a separate, pre-existing gap recorded in RULE-QUALITY-PROGRAM.md.
 */
function bindsADeclaredContract(def: TSESLint.Scope.Definition): boolean {
  // `def.name` is always present on a scope Definition — the `=== undefined`
  // guard that used to sit here was unreachable, and it showed up as the one
  // branch this package could not cover. Deleted rather than given a fabricated
  // test: a fixture written only to reach a line certifies whatever the code
  // already does.
  for (
    let node: TSESTree.Node | undefined = def.name as TSESTree.Node;
    node !== undefined;
    node = node.parent ?? undefined
  ) {
    // The annotation can sit on the pattern (`{ tablePrefix }: MigrationContext`)
    // or on the parameter itself, with the destructuring a line later —
    // `up(context: MigrationContext)` then `const { tablePrefix } = context`.
    // Both are the same contract, and n8n writes it both ways in the same
    // directory; matching only the first left 20 of the 128 standing.
    if (
      node.type !== AST_NODE_TYPES.ObjectPattern &&
      node.type !== AST_NODE_TYPES.ArrayPattern &&
      node.type !== AST_NODE_TYPES.Identifier
    ) {
      continue;
    }
    const annotation = node.typeAnnotation?.typeAnnotation;
    // Only a NAMED type. `term: string` constrains the caller to nothing, and
    // `{ a }: { a: string }` is what an author writes when there IS no interface
    // — both stay inlets.
    if (annotation?.type === AST_NODE_TYPES.TSTypeReference) return true;
  }
  return false;
}

/**
 * A binding whose every write in this file is a static value cannot carry taint
 * to the sink, whatever its declaration kind.
 *
 *   function fmt(v) { v = 'id'; return db.query('SELECT * FROM t ORDER BY ' + v); }
 *
 * `v` is a parameter, so the inlet test below would call it caller-supplied —
 * but the only value that can reach the statement is the literal written over
 * it. Returns `false` when there is no write at all, which is the ordinary
 * parameter: nothing was overwritten, so nothing was made safe.
 */
function allWritesStatic(
  variable: TSESLint.Scope.Variable,
  scope: TSESLint.Scope.Scope,
): boolean {
  const writes = writeExpressions(variable);
  if (writes.length === 0) return false;
  return writes.every((node) => isStaticExpression({ node, scope }));
}

/**
 * Every expression written into a binding, in source order.
 *
 * The declaration initialiser is one of these — escope records `const x = init`
 * as a write whose `writeExpr` is `init` — and so is the right-hand side of a
 * `for (const x of xs)`, which is why the loop shape needs no arm of its own.
 */
function writeExpressions(variable: TSESLint.Scope.Variable): TSESTree.Node[] {
  const written: TSESTree.Node[] = [];
  for (const reference of variable.references) {
    const { writeExpr } = reference;
    if (reference.isWrite() && writeExpr !== undefined && writeExpr !== null) {
      written.push(writeExpr);
    }
  }
  return written;
}

/**
 * Was this binding BUILT in the file being linted?
 *
 * The request test above is a membership check on a root identifier, and a
 * membership check on a name is only as good as the guarantee that the name
 * still denotes the thing. It did not:
 *
 *   const req = { params: { table: 'users' } };
 *   db.query('SELECT * FROM ' + req.params.table);   // reported. Nothing enters here.
 *
 * A real inbound request arrives as a handler parameter or an ambient global —
 * never as an object literal the file wrote a line earlier. So a root whose
 * value this file constructs is disqualified, which is the evidence the name
 * was standing in for. A binding initialised from something opaque
 * (`const req = ctx.request`) is NOT disqualified: unknown is not safe.
 */
function isLocallyConstructed(
  variable: TSESLint.Scope.Variable | null,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (variable === null) return false;
  const init = singleAssignedInit(variable);
  if (init === null) return false;
  return (
    init.type === AST_NODE_TYPES.ObjectExpression ||
    init.type === AST_NODE_TYPES.ArrayExpression ||
    isStaticExpression({ node: init, scope })
  );
}

/**
 * Is this name the environment's, rather than something this file declared?
 *
 * A binding with no definition is one the scope analyser knows only as a global
 * — which is what `String` is until a file writes `function String() {}` over
 * it. The same test `@interlace/eslint-devkit` applies to `__dirname`.
 */
function isAmbientGlobal(name: string, scope: TSESLint.Scope.Scope): boolean {
  const variable = resolveVariable(name, scope);
  return variable === null || variable.defs.length === 0;
}

/**
 * Attribution through a call — the one place where "a call breaks the chain"
 * had to stop being absolute.
 *
 * Two calls do not break it, and the adversarial corpus wave is what proved it:
 *
 *   db.query('… owner = ' + String(req.query.owner));      // a cast, not an escape
 *   const escape = (v) => `'${v}'`;                        // a local helper
 *   db.query('… name = ' + escape(req.query.name));        //   wearing a trusted name
 *
 * `String` is transparent by identity: it is the ambient global, matched
 * exactly, and it returns its argument's text unchanged. The local helper is
 * transparent by RESOLUTION: its body is visible in this file, so the value can
 * be followed into the string it builds instead of guessed at from the callee's
 * spelling — which is exactly how `escape` fools a reader.
 *
 * An UNRESOLVABLE call still breaks the chain, and that is what keeps the
 * documented fix quiet: `escapeIdentifier` and `client.escapeLiteral` come from
 * a package, so their bodies are not here to inline. A local escaper that
 * really neutralises the quote (`String(v).split("'").join("''")`) also stays
 * quiet — inlining it lands on a member call that resolves to nothing.
 */
function attributedThroughCall(
  node: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
  attribution: Attribution,
  depth: number,
): string | null {
  if (
    node.callee.type === AST_NODE_TYPES.Identifier &&
    attribution.transparentCalls.has(node.callee.name) &&
    isAmbientGlobal(node.callee.name, scope)
  ) {
    for (const argument of node.arguments) {
      if (argument.type === AST_NODE_TYPES.SpreadElement) continue;
      const found = attributedSource(argument, scope, attribution, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  const inlined = effectiveExpression(node, scope, attribution);
  if (inlined.nodes.length === 1 && inlined.nodes[0] === node) return null;
  const inner: Attribution = {
    ...attribution,
    substitutions: inlined.substitutions,
  };
  for (const candidate of inlined.nodes) {
    const found = attributedSource(candidate, inlined.scope, inner, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Where the dynamic half of this expression comes from, or `null` when it
 * cannot be attributed.
 *
 * "I cannot prove this is safe" is not a finding. A `db.query('SELECT … ' +
 * id)` whose `id` is a function parameter, a config value or a loop counter is
 * a query builder doing its job; the rule reports only when it can name an
 * attacker-controlled origin. This is the same contract
 * `no-unsafe-regex-construction` adopted when it stopped reporting everything
 * dynamic.
 *
 * Calls are deliberately **not** traversed: `escapeIdentifier(req.query.sort)`
 * and `client.escapeLiteral(req.body.name)` are the documented fixes for the
 * exact defect this rule reports, so treating a wrapped value as tainted would
 * report code that is already correct and offer it its own remedy.
 */
interface Attribution {
  /** Builder parameters bound to the arguments the call site passed. */
  substitutions: Substitutions;
  /** Whether a caller-supplied parameter counts as an untrusted inlet. */
  untrustedParameters: boolean;
  /** Identifier roots that denote an inbound request. */
  requestRoots: ReadonlySet<string>;
  /** Properties of a request that carry caller-supplied data. */
  requestProperties: ReadonlySet<string>;
  /** Global conversions that hand a value straight through. */
  transparentCalls: ReadonlySet<string>;
  /** Properties of a driver query-config object that hold the statement text. */
  queryTextProperties: ReadonlySet<string>;
  /** Needed to scope a local builder's body when one is inlined. */
  sourceCode: TSESLint.SourceCode;
}

function attributedSource(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  attribution: Attribution,
  depth = 0,
): string | null {
  if (depth > 5) return null;

  // `x as string` reads exactly what `x` reads — the cast is erased at compile
  // time. Without this the walker falls through to its null/false default, and
  // Express types `req.query.q` as `string | string[] | ParsedQs | undefined`,
  // so a TypeScript handler MUST write the cast to compile. Every suite here
  // was written without one, which is why the gap survived review.
  const bare = unwrapTypeSyntax(node);
  if (bare !== node)
    return attributedSource(bare, scope, attribution, depth + 1);

  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    for (const expression of node.expressions) {
      const found = attributedSource(expression, scope, attribution, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return (
      attributedSource(
        node.left as TSESTree.Node,
        scope,
        attribution,
        depth + 1,
      ) ?? attributedSource(node.right, scope, attribution, depth + 1)
    );
  }

  if (node.type === AST_NODE_TYPES.MemberExpression) {
    let root: TSESTree.Node = node;
    const properties: string[] = [];
    while (root.type === AST_NODE_TYPES.MemberExpression) {
      if (root.property.type === AST_NODE_TYPES.Identifier) {
        properties.unshift(root.property.name);
      }
      root = root.object;
    }
    if (
      root.type === AST_NODE_TYPES.Identifier &&
      attribution.requestRoots.has(root.name) &&
      properties.some((property) =>
        attribution.requestProperties.has(property),
      ) &&
      !isLocallyConstructed(resolveVariable(root.name, scope), scope)
    ) {
      return `${root.name}.${properties.join('.')}`;
    }
    return null;
  }

  // A ternary is attacker-controlled when EITHER arm is. `req.query.sort ?
  // req.query.sort : 'id'` is the idiomatic "optional sort column", and reading
  // only the value's type made the whole shape invisible.
  if (node.type === AST_NODE_TYPES.ConditionalExpression) {
    return (
      attributedSource(node.consequent, scope, attribution, depth + 1) ??
      attributedSource(node.alternate, scope, attribution, depth + 1)
    );
  }

  // `req.query.sort || 'id'` is the same shape written shorter, and it was the
  // more common of the two.
  if (node.type === AST_NODE_TYPES.LogicalExpression) {
    return (
      attributedSource(node.left, scope, attribution, depth + 1) ??
      attributedSource(node.right, scope, attribution, depth + 1)
    );
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    return attributedThroughCall(node, scope, attribution, depth);
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(node.name, scope);
    if (variable === null) return null;

    // A builder's own parameter carries no provenance; the ARGUMENT does. The
    // bound expression is read back in the caller's scope, which is where it
    // was written.
    const bound = attribution.substitutions.get(variable);
    if (bound !== undefined) {
      return bound.node === null
        ? null
        : attributedSource(
            bound.node,
            bound.scope,
            { ...attribution, substitutions: NO_SUBSTITUTIONS },
            depth + 1,
          );
    }

    // EVERY write, not just a lone initialiser. A `let` seeded with a literal
    // and overwritten from the request under an `if` is the ordinary spelling
    // of an optional filter, and following only single-assignment bindings made
    // it invisible:
    //
    //   let name = 'anonymous';
    //   if (req.query.name) name = req.query.name;
    //   db.query("… WHERE name = '" + name + "'");
    //
    // The for-of / for-in binding lands here too: escope records the iterated
    // expression as that binding's write.
    const writes = writeExpressions(variable);
    for (const write of writes) {
      const found = attributedSource(write, scope, attribution, depth + 1);
      if (found !== null) return found;
    }

    // A PARAMETER is an inlet. Nothing in this file constrains what a caller
    // passes, so a parameter spliced into statement text is attacker-reachable
    // for as long as any caller anywhere can be reached — which is exactly the
    // shape `export function search(term)` has, and the shape the corpus
    // labels vulnerable.
    if (
      attribution.untrustedParameters &&
      isParameterBinding(variable) &&
      !allWritesStatic(variable, scope) &&
      // …unless the file narrows it to a fixed set before use. See
      // `isNarrowedByGuardClause`: an allowlist plus a leaving guard is the
      // correct fix for an identifier no driver can bind, and reporting it
      // flags the defence as the vulnerability.
      !isNarrowedByGuardClause(node.name, node, attribution.sourceCode)
    ) {
      return `${node.name} (a caller-supplied parameter)`;
    }
    return null;
  }

  return null;
}


/**
 * Is this parameter narrowed to a fixed set of literals before it is used?
 *
 * Table and column names cannot be parameterised — no driver binds an
 * identifier — so an allowlist plus a guard clause is the correct fix for that
 * case, and it is what the standard advice tells people to write. Reporting it
 * flags the defence as the vulnerability.
 *
 * bcgov/sso-requests is the reference shape, comment and all:
 *
 *   const ALLOWED_TABLES = new Set(['Requests', 'Users', 'Teams', 'Events']);
 *   if (!ALLOWED_TABLES.has(table)) throw new Error(`Invalid table: ${table}`);
 *   … sequelize.query(`SELECT … FROM ${table} ORDER BY ${orderBy}`)
 *
 * Structural and deliberately narrow. It requires a guard clause that LEAVES —
 * `throw` or `return` — because that is what makes the values after it a subset
 * of the allowlist. A membership test whose failure branch falls through
 * constrains nothing, and is not accepted.
 */
function isNarrowedByGuardClause(
  name: string,
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Find the function body this identifier lives in.
  // Walk to the enclosing function, stopping at Program. No separate
  // `fn === undefined` guard: this only runs for a value that resolved to a
  // parameter, so a function always encloses it, and the branch would be
  // uncoverable. Program falls out through the block-body check below, whose
  // other side an expression-bodied arrow reaches.
  let fn: TSESTree.Node = node;
  while (
    fn.parent !== undefined &&
    fn.type !== AST_NODE_TYPES.FunctionDeclaration &&
    fn.type !== AST_NODE_TYPES.FunctionExpression &&
    fn.type !== AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    fn = fn.parent as TSESTree.Node;
  }
  const body = (fn as { body?: TSESTree.Node }).body;
  if (body === undefined || body.type !== AST_NODE_TYPES.BlockStatement) return false;

  for (const statement of body.body) {
    // Only statements BEFORE the interpolation can constrain it.
    if (statement.range[0] >= node.range[0]) break;
    if (statement.type !== AST_NODE_TYPES.IfStatement) continue;

    // The guard has to leave: `throw`, or `return`.
    const leaves = (consequent: TSESTree.Statement): boolean => {
      if (consequent.type === AST_NODE_TYPES.ThrowStatement) return true;
      if (consequent.type === AST_NODE_TYPES.ReturnStatement) return true;
      if (consequent.type === AST_NODE_TYPES.BlockStatement) {
        return consequent.body.some(
          (inner) =>
            inner.type === AST_NODE_TYPES.ThrowStatement ||
            inner.type === AST_NODE_TYPES.ReturnStatement,
        );
      }
      return false;
    };
    if (!leaves(statement.consequent)) continue;

    // `!ALLOWED.has(name)` / `!ALLOWED.includes(name)`.
    const test = statement.test;
    if (test.type !== AST_NODE_TYPES.UnaryExpression || test.operator !== '!') continue;
    const call = test.argument;
    if (call.type !== AST_NODE_TYPES.CallExpression) continue;
    if (call.callee.type !== AST_NODE_TYPES.MemberExpression) continue;
    const method = call.callee.property;
    if (
      method.type !== AST_NODE_TYPES.Identifier ||
      (method.name !== 'has' && method.name !== 'includes')
    ) {
      continue;
    }
    const [checked] = call.arguments;
    if (checked?.type !== AST_NODE_TYPES.Identifier || checked.name !== name) continue;

    // The set has to be a fixed list of literals, or the "allowlist" is itself
    // caller-supplied and constrains nothing.
    const receiver = call.callee.object;
    if (receiver.type !== AST_NODE_TYPES.Identifier) continue;
    // Resolve up the scope chain rather than through the references of the
    // node's own scope. The allowlist is declared at module level while the
    // query often sits inside a nested block — bcgov/sso-requests puts it
    // inside `if (table == 'Requests')` — and a block scope holds no reference
    // to a name it never mentions.
    let search: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    let declared: TSESLint.Scope.Variable | undefined;
    while (search !== null && declared === undefined) {
      declared = search.variables.find((v) => v.name === receiver.name);
      search = search.upper;
    }
    const source =
      declared?.defs[0]?.node.type === AST_NODE_TYPES.VariableDeclarator
        ? declared.defs[0].node.init
        : undefined;
    if (source === undefined || source === null) continue;
    const listOf = (init: TSESTree.Node): TSESTree.Node[] | undefined => {
      if (init.type === AST_NODE_TYPES.ArrayExpression) return [...init.elements].filter(Boolean) as TSESTree.Node[];
      if (
        init.type === AST_NODE_TYPES.NewExpression &&
        init.callee.type === AST_NODE_TYPES.Identifier &&
        init.callee.name === 'Set' &&
        init.arguments[0]?.type === AST_NODE_TYPES.ArrayExpression
      ) {
        return [...init.arguments[0].elements].filter(Boolean) as TSESTree.Node[];
      }
      return undefined;
    };
    const members = listOf(source);
    if (members === undefined || members.length === 0) continue;
    if (members.every((el) => el.type === AST_NODE_TYPES.Literal)) return true;
  }
  return false;
}

/**
 * What a sink argument resolves to: every expression that can reach the
 * database, the scope those expressions were written in, and — when a local
 * builder was substituted through — what its parameters stand for.
 *
 * `nodes` is a LIST because a statement is not always one expression. A `let`
 * seeded with a base clause and appended to is the standard optional-filter
 * spelling, and reading only the declaration made the appended half invisible:
 *
 *   let sql = 'SELECT * FROM users WHERE 1=1';
 *   sql += ' AND name = ' + req.query.name;      // the whole injection
 *   db.query(sql);
 */
interface Resolution {
  nodes: TSESTree.Node[];
  scope: TSESLint.Scope.Scope;
  substitutions: Substitutions;
}

/**
 * The expression(s) a sink argument really holds — following local bindings,
 * builders, query-config objects and `Array#join` to the text that is executed.
 *
 * `const query = 'SELECT … ' + userId; db.query(query);` is the textbook
 * spelling, and without this hop the sink sees a bare `Identifier` and the
 * rule would have to either report every `db.query(variable)` or miss it.
 */
function effectiveExpression(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  attribution: Attribution,
  depth = 0,
): Resolution {
  const unresolved: Resolution = {
    nodes: [node],
    scope,
    substitutions: NO_SUBSTITUTIONS,
  };
  if (depth > 5) return unresolved;

  // A cast and an `await` both hand back the very value they wrap.
  const bare = unwrapTypeSyntax(node);
  if (bare !== node) {
    return effectiveExpression(bare, scope, attribution, depth + 1);
  }
  if (node.type === AST_NODE_TYPES.AwaitExpression) {
    return effectiveExpression(node.argument, scope, attribution, depth + 1);
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    // `[fragment, value].join(' ')` assembles a statement exactly as `+` does.
    const joined = joinedArrayElements(node, scope);
    if (joined !== null) {
      return { nodes: joined, scope, substitutions: NO_SUBSTITUTIONS };
    }
    return resolveBuilderCall(node, scope, attribution) ?? unresolved;
  }

  // The driver's query-config form: `db.query({ text, values })`. The statement
  // is the `text` property, and the whole point of the form is that `values`
  // are bound — so a built `text` is the finding and a placeholder `text` with
  // a concatenated `values` entry is not.
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    const text = queryTextProperty(node, attribution.queryTextProperties);
    return text === null
      ? unresolved
      : effectiveExpression(text, scope, attribution, depth + 1);
  }

  if (node.type !== AST_NODE_TYPES.Identifier) return unresolved;
  const variable = resolveVariable(node.name, scope);
  if (variable === null) return unresolved;
  const writes = writeExpressions(variable);
  if (writes.length === 0) return unresolved;
  if (writes.length === 1) {
    return effectiveExpression(
      writes[0] as TSESTree.Node,
      scope,
      attribution,
      depth + 1,
    );
  }
  return { nodes: writes, scope, substitutions: NO_SUBSTITUTIONS };
}

/**
 * A LOCAL query builder resolves to the string it returns, WITH its parameters
 * bound to the arguments this call site passed.
 *
 *   const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`;
 *   db.query(build(req.query.tag));            // was completely silent
 *
 * `isBuiltString` rejected the CallExpression before attribution ever ran, so
 * the whole injection disappeared. Substituting the builder's returned template
 * makes both gates see the real query — but substitution ALONE only gets as far
 * as the builder's own parameter `t`, which has no provenance. Binding `t` to
 * `req.query.tag` is what carries the taint across the call, and it is equally
 * what keeps `db.query(build('admin'))` quiet: the argument is a literal, so
 * the interpolated value is static.
 *
 * Only when the callee resolves HERE and its body is visibly an interpolated
 * string. An imported call — `escapeIdentifier(req.query.sort)` — does not
 * resolve, so the documented fix stays quiet. Escapers come from libraries;
 * builders are written in the file.
 */
function resolveBuilderCall(
  node: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
  attribution: Attribution,
): Resolution | null {
  if (node.callee.type !== AST_NODE_TYPES.Identifier) return null;
  const impl = resolveLocalFunction(node.callee.name, scope);
  if (impl === null) return null;
  const returned = returnedExpression(impl);
  if (
    returned === null ||
    (returned.type !== AST_NODE_TYPES.TemplateLiteral &&
      returned.type !== AST_NODE_TYPES.BinaryExpression)
  ) {
    return null;
  }
  const bindings = bindParameters(
    impl,
    node.arguments,
    scope,
    attribution.sourceCode,
  );
  if (bindings === null) return null;
  return {
    nodes: [returned],
    scope: attribution.sourceCode.getScope(returned),
    substitutions: bindings,
  };
}

/** Any function this file declares under `name`, however it was written. */
function resolveLocalFunction(
  name: string,
  scope: TSESLint.Scope.Scope,
):
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression
  | TSESTree.FunctionDeclaration
  | null {
  const variable = resolveVariable(name, scope);
  if (variable === null) return null;
  // `function build(t) { … }` — a hoisted declaration is a `FunctionName`
  // definition with no write reference at all, so the written-once test below
  // never saw it and the most ordinary way to spell a builder was the one shape
  // that escaped resolution.
  const declared = variable.defs.find((def) => def.type === 'FunctionName');
  if (declared !== undefined) {
    return declared.node as TSESTree.FunctionDeclaration;
  }
  const init = singleAssignedInit(variable);
  if (
    init !== null &&
    (init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      init.type === AST_NODE_TYPES.FunctionExpression)
  ) {
    return init;
  }
  return null;
}

/**
 * The single expression a function hands back.
 *
 * A block body qualifies only when it is EXACTLY one `return`. Any other
 * statement could sanitise, branch or reassign, and inlining past it would be a
 * guess rather than a resolution.
 */
function returnedExpression(
  impl:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression
    | TSESTree.FunctionDeclaration,
): TSESTree.Node | null {
  if (impl.body.type !== AST_NODE_TYPES.BlockStatement) return impl.body;
  const [only] = impl.body.body;
  if (
    impl.body.body.length !== 1 ||
    only?.type !== AST_NODE_TYPES.ReturnStatement
  ) {
    return null;
  }
  return only.argument ?? null;
}

/**
 * The elements of `[…].join(…)` — the array spelling of concatenation.
 *
 * Requires the receiver to resolve to an array LITERAL in this file, so
 * `rows.join(',')` on an opaque value stays unresolved rather than guessed at.
 */
function joinedArrayElements(
  node: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
): TSESTree.Node[] | null {
  const { callee } = node;
  if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) {
    return null;
  }
  if (
    callee.property.type !== AST_NODE_TYPES.Identifier ||
    callee.property.name !== 'join'
  ) {
    return null;
  }
  let receiver: TSESTree.Node = callee.object;
  if (receiver.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(receiver.name, scope);
    const init = variable === null ? null : singleAssignedInit(variable);
    if (init === null) return null;
    receiver = init;
  }
  if (receiver.type !== AST_NODE_TYPES.ArrayExpression) return null;
  const elements: TSESTree.Node[] = [];
  for (const element of receiver.elements) {
    if (element === null || element.type === AST_NODE_TYPES.SpreadElement) {
      continue;
    }
    elements.push(element);
  }
  return elements;
}

/** The statement text carried by a driver query-config object, if any. */
function queryTextProperty(
  node: TSESTree.ObjectExpression,
  names: ReadonlySet<string>,
): TSESTree.Node | null {
  for (const property of node.properties) {
    if (property.type !== AST_NODE_TYPES.Property || property.computed)
      continue;
    const key =
      property.key.type === AST_NODE_TYPES.Identifier
        ? property.key.name
        : stringLiteralValue(property.key);
    if (key !== null && names.has(key)) return property.value;
  }
  return null;
}

/**
 * Bind a builder's parameters to the arguments a call site passed.
 *
 * `null` means the binding cannot be established exactly — a destructured or
 * rest parameter, or a spread argument. Then the builder is NOT substituted at
 * all, rather than substituted with parameters standing for nothing: a
 * placeholder with no known argument reads as "cannot attribute", which is the
 * shape that produces guesses.
 */
function bindParameters(
  impl:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression
    | TSESTree.FunctionDeclaration,
  args: readonly TSESTree.CallExpressionArgument[],
  callerScope: TSESLint.Scope.Scope,
  sourceCode: TSESLint.SourceCode,
): Substitutions | null {
  if (args.some((a) => a.type === AST_NODE_TYPES.SpreadElement)) return null;
  if (impl.params.some((p) => p.type !== AST_NODE_TYPES.Identifier))
    return null;

  // Taken from the SCOPE, not by resolving each parameter's name: the scope
  // analyser already lists a function's parameter variables in declaration
  // order, so there is no lookup that can come back empty and no branch that
  // no input can reach.
  const bindings = new Map<TSESLint.Scope.Variable, Substitution>();
  sourceCode
    .getDeclaredVariables(impl)
    .filter((variable) => isParameterBinding(variable))
    .forEach((variable, index) => {
      bindings.set(variable, { node: args[index] ?? null, scope: callerScope });
    });
  return bindings;
}

export const noSqlInjection = createRule<[Options?], MessageIds>({
  name: 'no-sql-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-sql-injection.md',
      description:
        'Prevent SQL injection when a query is built from attacker-controlled input and executed through a driver-agnostic handle',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
    messages: {
      sqlInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection Risk',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'SQL statement built from "{{source}}" and executed. An attacker controls part of the statement text.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
        effort: 'high',
        fix: 'Pass the value as a bound parameter (`$1` / `?`) instead of concatenating it into the statement.',
        documentationLink:
          'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          reportUnattributedInterpolation: {
            type: 'boolean',
            default: false,
            description:
              'Report SQL built by interpolation even when the interpolated ' +
              'value cannot be traced to a request in this file (a property of ' +
              '`this`, a property of a non-request object, a helper return). ' +
              'Parameterise either way. Set false to report only attributable taint.',
          },
          treatParametersAsUntrusted: {
            type: 'boolean',
            default: true,
            description:
              'Treat a function parameter spliced into statement text as an ' +
              'untrusted inlet — nothing in this file constrains what a caller ' +
              'passes. Set false to report only values traceable to a request ' +
              'within the linted file.',
          },
          requestRoots: {
            type: 'array',
            items: { type: 'string' },
            default: [...REQUEST_ROOTS],
            description:
              'Identifier roots that denote an inbound request. Matched exactly.',
          },
          requestProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [...REQUEST_PROPERTIES],
            description:
              'Request properties that carry caller-supplied data. Matched exactly.',
          },
          sinkMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [...SQL_SINK_METHODS],
            description:
              'Method names that execute a raw SQL string. Matched exactly ' +
              'against the called member name.',
          },
          queryTextProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [...QUERY_TEXT_PROPERTIES],
            description:
              'Properties of a driver query-config object that hold the ' +
              'statement text. Matched exactly.',
          },
          transparentCalls: {
            type: 'array',
            items: { type: 'string' },
            default: [...TRANSPARENT_CALLS],
            description:
              'Ambient global calls that pass their argument through ' +
              'unchanged, so taint survives them. Matched exactly, and only ' +
              'when the file declares no binding of that name.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      reportUnattributedInterpolation: false,
      treatParametersAsUntrusted: true,
      requestRoots: REQUEST_ROOTS,
      requestProperties: REQUEST_PROPERTIES,
      sinkMethods: SQL_SINK_METHODS,
      transparentCalls: TRANSPARENT_CALLS,
      queryTextProperties: QUERY_TEXT_PROPERTIES,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, [Options?]>,
    [options = {}],
  ) {
    const {
      reportUnattributedInterpolation = false,
      treatParametersAsUntrusted = true,
      requestRoots = REQUEST_ROOTS,
      requestProperties = REQUEST_PROPERTIES,
      sinkMethods = SQL_SINK_METHODS,
      transparentCalls = TRANSPARENT_CALLS,
      queryTextProperties = QUERY_TEXT_PROPERTIES,
    } = options;
    const attribution: Attribution = {
      substitutions: NO_SUBSTITUTIONS,
      untrustedParameters: treatParametersAsUntrusted,
      requestRoots: new Set(requestRoots),
      requestProperties: new Set(requestProperties),
      transparentCalls: new Set(transparentCalls),
      queryTextProperties: new Set(queryTextProperties),
      sourceCode: context.sourceCode,
    };
    const sinks = new Set(sinkMethods);
    /**
     * Findings are held until `Program:exit` so a `require('pg')` anywhere in
     * the file — including below the sink, or inside a function — still hands
     * the site to the driver-specific rule. Deciding at the call site would
     * make the partition depend on statement order.
     */
    const pending: { node: TSESTree.Node; source: string }[] = [];
    let importsSqlDriver = false;

    const noteSpecifier = (specifier: string | null): void => {
      if (specifier !== null && isSqlDriverSpecifier(specifier)) {
        importsSqlDriver = true;
      }
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        noteSpecifier(node.source.value);
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        noteSpecifier(stringLiteralValue(node.source));
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (
          node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference
        ) {
          noteSpecifier(stringLiteralValue(node.moduleReference.expression));
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // `require('pg')` — the CommonJS half of the partition test.
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require'
        ) {
          noteSpecifier(stringLiteralValue(node.arguments[0]));
          return;
        }

        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
        const callScope = context.sourceCode.getScope(node);
        const method = invokedMethodName(node.callee, callScope);
        if (method === null || !sinks.has(method)) return;

        const [firstArgument] = node.arguments;
        if (
          firstArgument === undefined ||
          firstArgument.type === AST_NODE_TYPES.SpreadElement
        ) {
          return;
        }

        const { nodes, scope, substitutions } = effectiveExpression(
          firstArgument,
          callScope,
          attribution,
        );
        // Assembled from parts: either a single expression that is visibly a
        // template or a `+`, or several writes to one binding of which at least
        // one is not static. A statement written in one piece is not a finding
        // however dynamic its provenance, because nothing was interpolated.
        const built =
          nodes.some(isBuiltString) ||
          (nodes.length > 1 &&
            nodes.some((n) => !isStaticExpression({ node: n, scope })));
        if (!built) return;
        if (!looksLikeSqlStatement(nodes)) return;

        const sinkAttribution: Attribution = { ...attribution, substitutions };
        for (const candidate of nodes) {
          const source = attributedSource(candidate, scope, sinkAttribution);
          if (source !== null) {
            pending.push({ node, source });
            return;
          }
        }

        // Unattributable provenance is still a defect, because the remediation
        // for CWE-89 does not depend on where the value came from: a query
        // built by concatenation should be parameterised either way.
        //
        // OFF by default, and that is a deliberate deference. What the default
        // now reports is an inlet it can NAME — a request read, or a parameter
        // that nothing in this file constrains. What this option adds on top is
        // everything else that is merely not-provably-static: a property of
        // `this`, a property of a non-request object, a value from an opaque
        // call. Those are the findings a maintainer measured away once already,
        // on a rule that ships at `error` in `recommended`.
        //
        // Measured on benchmarks/rule-corpus/secure-coding__no-sql-injection
        // (17 vulnerable / 15 safe, both waves): the default catches 17/17 with
        // 0 false positives, so the option is no longer what recovers recall —
        // it is a strictness dial for teams that want concatenation flagged
        // wherever it appears.
        if (
          reportUnattributedInterpolation &&
          nodes.some(
            (n) =>
              (n.type === AST_NODE_TYPES.TemplateLiteral ||
                n.type === AST_NODE_TYPES.BinaryExpression) &&
              hasRawUnattributedPart(n, scope, substitutions),
          )
        ) {
          pending.push({ node, source: 'a value this file cannot attribute' });
        }
      },

      'Program:exit'() {
        if (importsSqlDriver) return;
        for (const finding of pending) {
          context.report({
            node: finding.node,
            messageId: 'sqlInjection',
            data: { source: finding.source },
          });
        }
      },
    };
  },
});

export default noSqlInjection;
