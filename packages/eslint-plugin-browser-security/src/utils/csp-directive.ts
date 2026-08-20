/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Content-Security-Policy vocabulary, read as a GRAMMAR rather than as text.
 *
 * WHY THIS EXISTS
 *
 * A policy is data. The rules in this package used to look for the printed
 * token `'unsafe-eval'` anywhere in any string, which is wrong in both
 * directions and was measured to be wrong in both directions:
 *
 * - FALSE NEGATIVE. Every CSP builder in the wild — `csp-header`,
 *   `next-secure-headers`, and most hand-rolled ones — authors sources as BARE
 *   keywords and adds the apostrophes on serialisation. `['self',
 *   'unsafe-eval']` ships `script-src 'self' 'unsafe-eval'` while containing
 *   the printed token nowhere.
 * - FALSE POSITIVE. The strongest anti-eval code in a repo is the build guard
 *   that refuses to ship the directive, and it necessarily names it:
 *   `throw new Error("Refusing a policy containing 'unsafe-eval'")`. So does a
 *   docs page. Neither reaches a header.
 *
 * So the unit of analysis here is a directive and its source list, not a
 * substring. Every set below is EXACT membership against a closed,
 * specification-defined vocabulary — never a substring or a word test.
 *
 * @see https://www.w3.org/TR/CSP3/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/**
 * Every directive name CSP3 defines, plus the ones still widely deployed.
 *
 * Closed set, straight from the specification's directive registry. Helmet
 * accepts the same names in camelCase, so both spellings are recognised — the
 * camelCase forms are derived below rather than listed by hand so the two
 * spellings can never drift apart.
 */
const CSP_DIRECTIVE_NAMES_KEBAB: readonly string[] = [
  // Fetch directives
  'child-src',
  'connect-src',
  'default-src',
  'fenced-frame-src',
  'font-src',
  'frame-src',
  'img-src',
  'manifest-src',
  'media-src',
  'object-src',
  'prefetch-src',
  'script-src',
  'script-src-elem',
  'script-src-attr',
  'style-src',
  'style-src-elem',
  'style-src-attr',
  'worker-src',
  // Document directives
  'base-uri',
  'sandbox',
  // Navigation directives
  'form-action',
  'frame-ancestors',
  'navigate-to',
  // Reporting directives
  'report-uri',
  'report-to',
  // Other
  'require-trusted-types-for',
  'trusted-types',
  'upgrade-insecure-requests',
  'block-all-mixed-content',
  'require-sri-for',
];

/** `script-src` -> `scriptSrc`, the spelling Helmet's directives object uses. */
function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

const CSP_DIRECTIVE_NAMES: ReadonlySet<string> = new Set([
  ...CSP_DIRECTIVE_NAMES_KEBAB,
  ...CSP_DIRECTIVE_NAMES_KEBAB.map(toCamelCase),
]);

/**
 * Is this the name of a CSP directive?
 *
 * Exact membership against the closed specification set, in either spelling.
 * Directive names are case-insensitive per CSP3 §2.2.
 */
export function isCspDirectiveName(name: string): boolean {
  return (
    CSP_DIRECTIVE_NAMES.has(name.toLowerCase()) || CSP_DIRECTIVE_NAMES.has(name)
  );
}

/**
 * Source-expression keywords, which are the only sources written in
 * apostrophes. Closed set from CSP3 §2.3.
 */
const CSP_KEYWORDS: ReadonlySet<string> = new Set([
  'self',
  'none',
  'unsafe-eval',
  'wasm-unsafe-eval',
  'unsafe-inline',
  'unsafe-hashes',
  'strict-dynamic',
  'report-sample',
  'inline-speculation-rules',
  'unsafe-allow-redirects',
]);

/**
 * The keyword a source expression names, or `null` if it is not a keyword.
 *
 * Accepts both spellings a source list can be authored in: quoted, as it is
 * serialised (`'unsafe-eval'`), and bare, as every builder takes it
 * (`unsafe-eval`). Compared whole — `'wasm-unsafe-eval'` is its OWN keyword and
 * the recommended narrow remediation, so anything matching it loosely turns
 * the fix into a finding.
 */
export function cspSourceKeyword(source: string): string | null {
  const trimmed = source.trim().toLowerCase();
  const unquoted =
    trimmed.length > 1 && trimmed.startsWith("'") && trimmed.endsWith("'")
      ? trimmed.slice(1, -1)
      : trimmed;
  return CSP_KEYWORDS.has(unquoted) ? unquoted : null;
}

/** One `directive-name source source …` segment of a serialised policy. */
export interface CspDirective {
  readonly name: string;
  readonly sources: readonly string[];
}

/**
 * Parse a serialised policy into its directives.
 *
 * Returns an empty array when the text is not a policy at all — which is the
 * question that separates a shipped header from a sentence that happens to
 * mention a directive. A policy has at least one segment whose FIRST token is a
 * directive name; prose does not.
 */
export function parsePolicy(text: string): CspDirective[] {
  const directives: CspDirective[] = [];
  for (const segment of text.split(';')) {
    const tokens = segment.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    if (!isCspDirectiveName(tokens[0])) continue;
    directives.push({ name: tokens[0].toLowerCase(), sources: tokens.slice(1) });
  }
  return directives;
}

/**
 * Does a serialised policy grant this source keyword anywhere?
 *
 * Token-wise, never by substring: `'wasm-unsafe-eval'` must not answer yes to
 * `'unsafe-eval'`.
 */
export function policyGrantsKeyword(text: string, keyword: string): boolean {
  return parsePolicy(text).some((directive) =>
    directive.sources.some((source) => cspSourceKeyword(source) === keyword),
  );
}

/**
 * Is this node an element of a CSP directive's SOURCE LIST?
 *
 * A bare `'unsafe-eval'` string is only a policy decision when it sits where a
 * source belongs. Two structural proofs, both read off the AST:
 *
 * 1. The array is the value of a property whose key is a directive name —
 *    `scriptSrc: ['self', 'unsafe-eval']`, Helmet's shape and every
 *    config-object builder's shape.
 * 2. The array is bound to a name that is spliced into a template literal
 *    immediately after a directive name — the `${SOURCES.join(' ')}` shape.
 *
 * Deliberately NOT proof: that a sibling element happens to be a CSP keyword.
 * That would make the rule report the VOCABULARY table a serialiser is built
 * from (`new Set(['self', 'none', 'unsafe-eval', …])`), which grants nothing.
 */
export function isCspSourceListElement(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // `parent` is `null` at the top of the tree and `undefined` before the
  // traverser sets it, and a strict check for only one of those is how this
  // crashed the whole lint run on a file with a top-level array.
  const array = node.parent;
  if (array == null || array.type !== 'ArrayExpression') return false;
  // An ArrayExpression always has a parent — only `Program` has none, and this
  // is not one — so `owner` needs no null check of its own.
  const owner = array.parent;

  if (owner.type === 'Property' && !owner.computed && owner.value === array) {
    const key = owner.key;
    if (key.type === 'Identifier') return isCspDirectiveName(key.name);
    if (key.type === 'Literal' && typeof key.value === 'string') {
      return isCspDirectiveName(key.value);
    }
    return false;
  }

  if (owner.type === 'VariableDeclarator' && owner.id.type === 'Identifier') {
    return isSplicedAfterDirectiveName(owner, sourceCode);
  }

  return false;
}

/**
 * Is this binding read inside a template literal, straight after a directive
 * name?
 *
 * `` `default-src 'self'; script-src ${SOURCES.join(' ')}` `` — the quasi
 * before the interpolation ends with `script-src`, so whatever the expression
 * produces lands in that directive's source list. Read from the scope
 * manager's references, so an unrelated variable of the same name in another
 * block cannot answer for this one.
 */
function isSplicedAfterDirectiveName(
  declarator: TSESTree.VariableDeclarator,
  sourceCode: TSESLint.SourceCode,
): boolean {
  for (const variable of sourceCode.getDeclaredVariables(declarator)) {
    for (const reference of variable.references) {
      if (reference.identifier.range[0] < declarator.range[1]) continue;
      if (precedingQuasiEndsWithDirective(reference.identifier)) return true;
    }
  }
  return false;
}

/** Walk out to the enclosing `${…}` slot and inspect the quasi before it. */
function precedingQuasiEndsWithDirective(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null | undefined = node;
  // Bounded: an interpolation is a handful of nodes deep (`X`, `X.join`,
  // `X.join(' ')`). Anything further away is not "spliced right here".
  for (let depth = 0; current != null && depth < 6; depth++) {
    const parent: TSESTree.Node | null | undefined = current.parent;
    if (parent != null && parent.type === 'TemplateLiteral') {
      // We arrived here from below, so `current` is one of the template's
      // expressions; and a template always has one more quasi than it has
      // expressions, so the preceding quasi always exists.
      const slot = parent.expressions.indexOf(current as TSESTree.Expression);
      const before = parent.quasis[slot].value.raw;
      const tokens = before.trim().split(/[\s;]+/).filter(Boolean);
      const last = tokens[tokens.length - 1];
      return last !== undefined && isCspDirectiveName(last);
    }
    current = parent;
  }
  return false;
}
