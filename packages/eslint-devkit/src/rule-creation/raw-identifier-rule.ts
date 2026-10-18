/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared identifier-interpolation detector (CWE-89).
 *
 * ## The gap this fills
 *
 * Every driver's raw-string API is already covered by `no-unsafe-query`: any
 * interpolation into `$queryRawUnsafe`, `sql.raw()`, `knex.raw()` is a
 * finding. This rule covers the opposite case — the *tagged template* that
 * genuinely parameterizes, and which developers therefore trust completely:
 *
 *     await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`   // safe
 *     await prisma.$queryRaw`SELECT * FROM ${table}`                 // injectable
 *
 * Both lines look identical to a reviewer and both use the API the docs call
 * safe. The first is safe; the second is not, because **a bind parameter can
 * only ever be a value**. `$1` is a placeholder in the value slot of the parse
 * tree — no database will accept it where a table, column, or sort direction
 * belongs, so the driver has no choice but to splice the string in verbatim.
 *
 * This is the shape behind Drizzle's GHSA-gpj5-g38j-94v9, and it is invisible
 * to every SQL-injection linter that keys on "is this a raw API".
 *
 * ## Why the remediation cannot be "use a parameter"
 *
 * That advice is what the developer already believes they are doing. Telling
 * them again produces the exact loop the vulnerability came from. The only
 * real fixes are an allowlist (map user input through a fixed set of column
 * names) or the driver's identifier escaper, so those are what the messages
 * say.
 *
 * ## Scope
 *
 * Only drivers with a value-parameterizing tagged template can carry this
 * rule — Prisma (`$queryRaw`/`$executeRaw`) and Drizzle (`sql`). The other
 * five ORM plugins have no such API: their raw entry points take plain
 * strings, where `no-unsafe-query` already reports every interpolation. Adding
 * this rule there would report the same line twice from one plugin, which the
 * taxonomy contract forbids.
 */

// AST_NODE_TYPES must come from the local shim, not upstream — it is an enum,
// so a *runtime value*, and `@typescript-eslint/utils` is an optional peer npm
// does not install. See sql-injection-rule.ts for the full note.
import { AST_NODE_TYPES } from '../ast-node-types';
import { propertyName } from '../ast/spellings';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import { isTestFilePath } from './rule-creator';
import { createOriginClassifier, sourceMatches } from './driver-origin';
import { createSqlSafety } from './sql-safety';
import {
  type Env,
  envOf,
  follow,
  importSpecifierOf,
  lookup,
  singleWrite,
  valueAt,
} from './value-follow';

/**
 * Two ids because the remediations are genuinely different.
 *
 * A table or column name is fixed by an allowlist or the driver's identifier
 * escaper. A sort direction has exactly two legal values, so the fix is a
 * ternary — reaching for an escaper there is overkill and reads as noise.
 */
export type RawIdentifierMessageIds =
  'identifierInterpolation' | 'sortDirectionInterpolation';

export interface RawIdentifierRuleConfig {
  /**
   * The rule's own `meta.type` + `meta.docs`, spelled out by the caller.
   *
   * Deliberately not derived in here: `scripts/audit-rule-meta-completeness.ts`
   * reads rule metadata by statically parsing the rule's source file, so
   * metadata hidden inside a factory is invisible to it.
   */
  readonly meta: {
    readonly type: 'problem';
    readonly docs: {
      readonly description: string;
      readonly url: string;
      readonly cwe: string;
      readonly cweJustification?: string;
      readonly cvss: number;
      readonly confidence: 'high' | 'medium' | 'low';
    };
  };
  /**
   * Tag names of the parameterizing template APIs, e.g. `['sql']` or
   * `['$queryRaw', '$executeRaw']`. Matched against a bare tag (`` sql`…` ``)
   * or the property of a member tag (`` prisma.$queryRaw`…` ``).
   */
  readonly tags: readonly string[];
  /** Modules the tag must be imported from, when `requireImport` is set. */
  readonly modules: readonly string[];
  /**
   * Does a matched tag have to resolve to a `modules` import?
   *
   * This is a property of the *tag name*, not of the AST shape it appears in,
   * and an earlier version got that wrong: it applied the gate only when the
   * tag was a bare `Identifier`. A generic name reached through a member
   * expression then skipped the gate entirely, so
   *
   *     import { createQueryBuilder } from 'some-internal-lib';
   *     await q.sql`SELECT * FROM ${table}`;
   *
   * reported under `drizzle-security` in a file with no Drizzle anywhere —
   * precisely the false positive the gate exists to prevent.
   *
   *   - `true` for a generic name like `sql`, which any project may define.
   *     Only a bare tag bound to a driver import qualifies.
   *   - `false` for a name specific enough to stand alone, like Prisma's
   *     `$queryRaw`. The client is routinely re-exported from a local module
   *     (`import { prisma } from '@/lib/db'`), so demanding an import here
   *     would miss the shape most codebases actually have.
   */
  readonly requireImport: boolean;
  /**
   * Tag names that count only when the tag provably belongs to the driver —
   * a bare tag imported from `modules` under that name (renamed or not), or a
   * member tag whose object is the driver's (`Prisma.sql`). For a generic
   * name in a plugin whose other tags stand alone. `requireImport: true`
   * applies this to every tag.
   */
  readonly driverTags?: readonly string[];
  /**
   * Callee texts that safely escape an identifier, e.g. `['sql.identifier']`.
   *
   * These are the *fix*. Reporting the remediation the message recommends is
   * the fastest way to get a security rule switched off, so they are exempt.
   */
  readonly identifierHelpers: readonly string[];
  /** Remediation line for the identifier finding. */
  readonly fix: string;
  /** Remediation line for the sort-direction finding. */
  readonly sortDirectionFix: string;
  readonly documentationLink: string;
}

/**
 * Keywords whose next token is necessarily an identifier.
 *
 * The optional quote/bracket tail covers the pre-quoted form, `FROM "${table}"`
 * — which is *more* dangerous than the bare one, not less, because the quotes
 * make it look deliberate and escaped when nothing has been escaped.
 */
const IDENTIFIER_KEYWORDS =
  /\b(?:from|join|into|update|table|order\s+by|group\s+by|select|distinct\s+on)$/i;

/** One character of the gap between a keyword and the hole after it. */
const GAP_CHAR = /[\s"'`[]/;

/**
 * Drop trailing whitespace and opening quotes, by scanning — not by regex.
 *
 * This is a security property rather than a style choice. The keyword pattern
 * used to end `\s*["'`[]?\s*$`: two quantifiers with an optional token between
 * them, so a run of tabs gave the engine O(n) ways to split them, at O(n)
 * start positions. CodeQL flagged it as `js/polynomial-redos`, correctly —
 * this rule reads whatever source it is pointed at, so a template literal
 * padded with whitespace is genuinely attacker-supplied.
 *
 * Splitting it into a separate *regex* does not help: `[\s"'`[]+$` backtracks
 * the same way, because every position inside the run is a candidate start
 * that only fails once it reaches the anchor. Measured on
 * `` `SELECT * FROM` + '\t'.repeat(40_000) + 'x' ``, both spellings take
 * ~800ms. A reverse scan touches each trailing character once and returns in
 * microseconds, which is the only version of this that is actually linear.
 */
export function stripIdentifierGap(text: string): string {
  let end = text.length;
  while (end > 0 && GAP_CHAR.test(text[end - 1]!)) end--;
  return text.slice(0, end);
}

/**
 * Clause keywords, used to answer "which clause does this interpolation sit
 * in". Only the last one before the hole matters.
 */
const CLAUSE_KEYWORDS =
  /\b(select|from|where|group\s+by|having|order\s+by|limit|offset|union|returning|values|set)\b/gi;

/** The clause an interpolation falls in, normalized (`order by`), or `''`. */
export function lastClause(text: string): string {
  const matches = [...text.matchAll(CLAUSE_KEYWORDS)];
  const last = matches.at(-1);
  return last ? last[1]!.toLowerCase().replace(/\s+/g, ' ') : '';
}

/**
 * Classify one interpolation hole by the static SQL that precedes it.
 *
 * `false` is the answer for every value position — `WHERE id = ${id}`,
 * `LIMIT ${n}`, `VALUES (${a})` — because those are exactly what the tagged
 * template parameterizes correctly. Reporting them would make the rule fire on
 * the API's intended use, which is the failure mode that gets a plugin
 * uninstalled.
 */
export function identifierPosition(
  precedingText: string,
): 'identifier' | 'sortDirection' | false {
  // Scan the gap off first, then anchor the keyword at the end. Neither step
  // has adjacent quantifiers, so neither can backtrack. See stripIdentifierGap.
  if (IDENTIFIER_KEYWORDS.test(stripIdentifierGap(precedingText)))
    return 'identifier';
  // `ORDER BY created_at ${dir}` — not immediately after the keyword, but
  // still inside the clause, so still an identifier-grade splice. A later
  // clause keyword (`LIMIT`, `OFFSET`) means the hole has left ORDER BY.
  if (lastClause(precedingText) === 'order by') return 'sortDirection';
  return false;
}

/** Dotted source text of a callee, e.g. `sql.identifier`. */
export function calleeText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name;
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    // `sql['identifier']` names the same callee `sql.identifier` names. A key
    // chosen at runtime names nothing, and returning '' keeps the pre-existing
    // "no match" behaviour for that shape.
    const object = calleeText(node.object);
    const property = propertyName(node);
    return object && property ? `${object}.${property}` : '';
  }
  return '';
}

/**
 * Is this interpolated expression exempt?
 *
 * Three shapes are, and each would otherwise be a false positive on correct
 * code:
 *
 *   - **A literal.** `` sql`SELECT * FROM ${'users'}` `` is a constant the
 *     developer typed. There is no untrusted input anywhere in it.
 *   - **The driver's identifier escaper.** This is the fix the message asks
 *     for; flagging it would punish the correction.
 *   - **A nested template with the same tag.** Composition is the intended
 *     primitive in both Drizzle and Prisma, and the nested template is visited
 *     on its own — so its holes are still checked, just not twice.
 */
export function isExemptExpression(
  expr: TSESTree.Expression,
  identifierHelpers: readonly string[],
  tags: readonly string[],
): boolean {
  if (expr.type === AST_NODE_TYPES.Literal) return true;
  if (expr.type === AST_NODE_TYPES.CallExpression) {
    if (identifierHelpers.includes(calleeText(expr.callee))) return true;
  }
  if (expr.type === AST_NODE_TYPES.TaggedTemplateExpression) {
    const nested = tagName(expr.tag);
    return nested !== undefined && tags.includes(nested);
  }
  return false;
}

/** The matched name of a template tag: `sql` or `$queryRaw`. */
export function tagName(tag: TSESTree.Node): string | undefined {
  if (tag.type === AST_NODE_TYPES.Identifier) return tag.name;
  if (tag.type === AST_NODE_TYPES.MemberExpression) {
    // `prisma['$queryRaw']` tags the same template `prisma.$queryRaw` tags,
    // and a bundler emits the first. `propertyName` returns null for a key
    // chosen at runtime, which names no tag.
    return propertyName(tag) ?? undefined;
  }
  return undefined;
}

/** Build a CWE-89 identifier-interpolation rule for one driver's template API. */
export function createRawIdentifierRule(
  config: RawIdentifierRuleConfig,
): TSESLint.RuleModule<RawIdentifierMessageIds, []> {
  const tags = new Set([...config.tags, ...(config.driverTags ?? [])]);
  const driverTags = new Set(config.driverTags ?? []);

  return {
    meta: {
      type: config.meta.type,
      docs: { ...config.meta.docs },
      messages: {
        identifierInterpolation: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'SQL Injection Risk',
          description:
            'A table or column name is interpolated into a parameterized query. Bind parameters only ever substitute values, so this identifier is spliced into the SQL as text.',
          severity: 'CRITICAL',
          // Same source as meta.docs.cwe so the emitted CVSS can never drift
          // from the documented one (security-cvss-docs-consistency.lock).
          cwe: config.meta.docs.cwe,
          owasp: 'A03:2021',
          compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
          effort: 'medium',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
        sortDirectionInterpolation: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'SQL Injection Risk',
          description:
            'A value is interpolated inside an ORDER BY clause, where a bind parameter cannot reach.',
          severity: 'HIGH',
          cwe: config.meta.docs.cwe,
          owasp: 'A03:2021',
          compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
          effort: 'low',
          fix: config.sortDirectionFix,
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      // BENCHMARK-CRITERIA §B1: test files are not the shipped surface.
      if (isTestFilePath(context.filename)) return {};
      const env = envOf(context);
      const originOf = createOriginClassifier(config.modules);
      const safety = createSqlSafety({
        origin: originOf,
        escapers: new Set<string>(),
        fragmentFactories: new Set<string>(),
        modules: config.modules,
      });

      /**
       * The name a tag is matched by: a bare tag imported from the driver is
       * matched by the name it is EXPORTED under, so `import { sql as q }`
       * still checks `` q`…` ``.
       */
      const tagKey = (
        tag: TSESTree.Node,
      ): { name: string; driver: boolean } | undefined => {
        if (tag.type === AST_NODE_TYPES.Identifier) {
          const variable = lookup(tag.name, env.scopeOf(tag));
          const specifier =
            variable === null ? null : importSpecifierOf(variable);
          if (
            specifier !== null &&
            sourceMatches(specifier.source, config.modules)
          )
            return { name: specifier.name, driver: true };
          return { name: tag.name, driver: false };
        }
        const name = tagName(tag);
        if (name === undefined) return undefined;
        const object = (tag as TSESTree.MemberExpression).object;
        return { name, driver: originOf(valueAt(object, env)) === 'ours' };
      };

      /**
       * A value the driver itself built — a table, a column of one, a nested
       * fragment, a subquery's `.as()`, an escaped identifier — rendered by
       * the driver, never spliced in as text. A query RESULT is not one.
       */
      const isDriverObject = (node: TSESTree.Node, depth = 0): boolean => {
        if (depth > 8) return false;
        const value = unwrapTypeSyntax(node);
        switch (value.type) {
          case AST_NODE_TYPES.Identifier: {
            const variable = lookup(value.name, env.scopeOf(value));
            if (variable === null) return false;
            const specifier = importSpecifierOf(variable);
            if (specifier !== null) {
              if (sourceMatches(specifier.source, config.modules)) return true;
              // `import { users } from './schema'` — judged where it is written.
              const followed = follow(valueAt(value, env));
              return (
                followed.node !== value &&
                followed.env !== env &&
                isExportedDriverObject(followed.node, followed.env)
              );
            }
            // A destructured binding is a query RESULT (`const [row] = await
            // db.select()…`), never a table.
            const def = variable.defs[0];
            if (
              def?.type !== 'Variable' ||
              def.node.id.type !== AST_NODE_TYPES.Identifier
            ) {
              return false;
            }
            const written = singleWrite(variable);
            return written !== null && isDriverObject(written, depth + 1);
          }
          case AST_NODE_TYPES.MemberExpression:
            return isDriverObject(value.object, depth + 1);
          case AST_NODE_TYPES.ConditionalExpression:
            return (
              isDriverObject(value.consequent, depth + 1) &&
              isDriverObject(value.alternate, depth + 1)
            );
          case AST_NODE_TYPES.TaggedTemplateExpression:
            return isDriverObject(value.tag, depth + 1);
          case AST_NODE_TYPES.NewExpression:
            return isDriverObject(value.callee, depth + 1);
          case AST_NODE_TYPES.CallExpression: {
            const callee = value.callee;
            // `sql.raw(x)` / `Prisma.raw(x)` splice text: the escape hatch is
            // exactly what this rule is about, never a safe object.
            if (
              callee.type === AST_NODE_TYPES.MemberExpression &&
              propertyName(callee) === 'raw'
            ) {
              // …unless what it splices is provably fixed: `Prisma.raw(dir)`
              // with `dir: 'asc' | 'desc'`.
              const [text] = value.arguments;
              return text !== undefined && safety.isSafe(valueAt(text, env));
            }
            // `db.select().from(t).as('sq')` — a named subquery.
            if (
              callee.type === AST_NODE_TYPES.MemberExpression &&
              propertyName(callee) === 'as'
            ) {
              return originOf(valueAt(callee.object, env)) === 'ours';
            }
            return isDriverObject(callee, depth + 1);
          }
          default:
            return false;
        }
      };

      /**
       * A table exported from another module: `export const users =
       * pgTable(…)` — a call whose callee that module imports from the driver.
       */
      const isExportedDriverObject = (
        node: TSESTree.Node,
        moduleEnv: Env,
      ): boolean => {
        const value = unwrapTypeSyntax(node);
        if (value.type !== AST_NODE_TYPES.CallExpression) return false;
        let root: TSESTree.Node = value.callee;
        while (root.type === AST_NODE_TYPES.MemberExpression)
          root = root.object;
        if (root.type !== AST_NODE_TYPES.Identifier) return false;
        const variable = lookup(root.name, moduleEnv.scopeOf(root));
        const specifier =
          variable === null ? null : importSpecifierOf(variable);
        return (
          specifier !== null && sourceMatches(specifier.source, config.modules)
        );
      };

      /**
       * Is this binding used as an object with fields — `${table}` beside
       * `${table.id}`? A string has no columns, so it is a table the driver
       * renders, however the program reached it (`this.tables[name]`).
       */
      const isUsedAsObject = (node: TSESTree.Node): boolean => {
        const value = unwrapTypeSyntax(node);
        if (value.type !== AST_NODE_TYPES.Identifier) return false;
        const variable = lookup(value.name, env.scopeOf(value));
        return (
          variable !== null &&
          variable.references.some((reference) => {
            const use = reference.identifier.parent;
            return (
              use?.type === AST_NODE_TYPES.MemberExpression &&
              use.object === reference.identifier &&
              !use.computed &&
              use.property.type === AST_NODE_TYPES.Identifier &&
              !(use.property.name in String.prototype)
            );
          })
        );
      };

      return {
        TaggedTemplateExpression(node: TSESTree.TaggedTemplateExpression) {
          const key = tagKey(node.tag);
          if (key === undefined || !tags.has(key.name)) return;
          if (
            (config.requireImport || driverTags.has(key.name)) &&
            !key.driver
          ) {
            return;
          }
          // A member tag whose object is provably another library's.
          if (
            node.tag.type === AST_NODE_TYPES.MemberExpression &&
            originOf(valueAt(node.tag.object, env)) === 'foreign'
          ) {
            return;
          }

          const { quasis, expressions } = node.quasi;
          expressions.forEach((expr, index) => {
            if (isExemptExpression(expr, config.identifierHelpers, config.tags))
              return;
            if (isDriverObject(expr) || isUsedAsObject(expr)) return;
            // Fixed text or a number cannot change the statement — at worst
            // the driver binds it as a value and the query fails.
            if (safety.isSafe(valueAt(expr, env))) return;
            // The text immediately before this hole, across every earlier
            // quasi, decides what the hole is.
            const preceding = quasis
              .slice(0, index + 1)
              .map((q) => q.value.raw)
              .join(' ');
            const position = identifierPosition(preceding);
            if (position === false) return;
            context.report({
              node: expr,
              messageId:
                position === 'identifier'
                  ? 'identifierInterpolation'
                  : 'sortDirectionInterpolation',
            });
          });
        },
      };
    },
  };
}
