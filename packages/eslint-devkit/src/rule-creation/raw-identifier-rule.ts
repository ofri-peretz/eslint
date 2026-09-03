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
import { driverBindings } from './unscoped-mutation-rule';

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
  const tags = new Set(config.tags);

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
      let bindings = new Set<string>();

      return {
        Program(program: TSESTree.Program) {
          bindings = driverBindings(program, config.modules);
        },

        TaggedTemplateExpression(node: TSESTree.TaggedTemplateExpression) {
          const name = tagName(node.tag);
          if (name === undefined || !tags.has(name)) return;
          // The gate follows the tag name, not the AST shape it appears in —
          // see RawIdentifierRuleConfig#requireImport for why that distinction
          // is the whole point. A gated name must be a bare tag bound to a
          // driver import; `q.sql` is somebody else's builder.
          if (config.requireImport) {
            if (node.tag.type !== AST_NODE_TYPES.Identifier) return;
            if (!bindings.has(name)) return;
          }

          const { quasis, expressions } = node.quasi;
          expressions.forEach((expr, index) => {
            if (isExemptExpression(expr, config.identifierHelpers, config.tags))
              return;
            // Everything statically known to the left of this hole. Joining
            // the quasis is what makes clause detection work across earlier
            // interpolations: in `WHERE a = ${a} ORDER BY ${c}` the second
            // hole still sees its `ORDER BY`.
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
