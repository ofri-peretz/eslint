/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-redos-vulnerable-regex
 * Detects ReDoS-vulnerable regex patterns in literal regex patterns
 * CWE-400: Uncontrolled Resource Consumption
 * 
 * Complements detect-non-literal-regexp by checking literal regex patterns
 * 
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { RegExpParser } from '@eslint-community/regexpp';
import { analyse } from 'scslre';

// Module-level parser; cheap to reuse.
const REGEXPP_PARSER = new RegExpParser();

/**
 * Stand-in for a `${…}` interpolation inside a template-literal pattern.
 *
 * U+E000 is a private-use code point: it cannot occur in real pattern text and
 * carries no regex meaning, so substituting it leaves the STRUCTURE the author
 * wrote — the quantifiers, the groups, the nesting — intact and analysable by
 * the same NFA path every other pattern goes through.
 */
const INTERPOLATION_PLACEHOLDER = '\uE000';

/**
 * scslre's blind spot: a variable bounded range under an unbounded quantifier.
 *
 *   /^([a-zA-Z0-9]+)+$/      -> Self/exponential      (seen)
 *   /^([a-zA-Z0-9]{2,4})+$/  -> CLEAN                 (not seen)
 *
 * Both are exponential — `{2,4}` under `+` means a run of N characters can be
 * cut into parts of 2, 3 or 4 in exponentially many ways, exactly as `+` under
 * `+` can. Measured on V8, `^([a-zA-Z0-9_.\-])+@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$`
 * — the email validator that circulates on Stack Overflow and ships in
 * thousands of sign-up forms — takes 73ms on a 44-character input and doubles
 * every four characters. The analyser cleared it.
 *
 * The fix is to hand the analyser a pattern it CAN see, not to overrule it:
 * rewrite `{m,n}` as `{m,}` and re-run. Two properties make this sound rather
 * than another heuristic:
 *
 *  - It is a REWRITE, not a verdict. scslre still decides.
 *  - It only touches ranges nested inside a quantifier whose max is Infinity.
 *    A flat sequence of bounded ranges (`^\+?[0-9]{1,3}[- ]?[0-9]{3,10}$`) is
 *    left exactly as written, because a finite total bound really does cap the
 *    work — that is why the relaxation is scoped instead of global. `?` and
 *    `{n}` are never touched either: `?` has max 1 (relaxing it to `{0,}`
 *    turns the linear `/^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/` into a
 *    false positive), and `{n}` is already fixed-width.
 */
function relaxBoundedRangesUnderUnboundedQuantifier(
  ast: ReturnType<RegExpParser['parsePattern']>,
  pattern: string
): string {
  const edits: Array<[number, number, string]> = [];

  const walk = (node: unknown, underUnbounded: boolean): void => {
    const n = node as {
      type?: string;
      min?: number;
      max?: number;
      greedy?: boolean;
      element?: { end: number };
      end?: number;
      alternatives?: unknown[];
      elements?: unknown[];
    };
    if (n.type === 'Quantifier') {
      const { min = 0, max = 0 } = n;
      if (underUnbounded && Number.isFinite(max) && max > 1 && min !== max) {
        edits.push([
          n.element!.end,
          n.end!,
          `{${min},}${n.greedy === false ? '?' : ''}`,
        ]);
      }
      walk(n.element, underUnbounded || max === Infinity);
      return;
    }
    for (const child of [...(n.alternatives ?? []), ...(n.elements ?? [])]) {
      walk(child, underUnbounded);
    }
  };

  walk(ast, false);
  if (edits.length === 0) return pattern;

  let out = pattern;
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) {
    out = out.slice(0, start) + text + out.slice(end);
  }
  return out;
}

type MessageIds = 'redosVulnerable';

export interface Options {
  /**
   * @deprecated No longer has any effect, and accepted only so existing configs
   * keep loading. It gated the heuristic layer, which reported patterns the NFA
   * analyser had already cleared; that layer is gone. Removed in the next major.
   */
  allowCommonPatterns?: boolean;
  
  /** Maximum pattern length to analyze. Default: 500 */
  maxPatternLength?: number;
}

type RuleOptions = [Options?];

// Type guard for regex literal nodes
const isRegExpLiteral = (
  node: TSESTree.Node
): node is TSESTree.Literal & { regex: { pattern: string; flags: string } } => {
  return node.type === 'Literal' && Object.prototype.hasOwnProperty.call(node, 'regex');
};

export const noRedosVulnerableRegex = createRule<RuleOptions, MessageIds>({
  name: 'no-redos-vulnerable-regex',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-redos-vulnerable-regex.md',
      description: 'Detects ReDoS-vulnerable regex patterns in literal regex patterns',
      cwe: 'CWE-400',
    },
    messages: {
      redosVulnerable: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ReDoS vulnerable regex',
        cwe: 'CWE-400',
        description: '{{vulnerabilityName}}: {{description}}',
        severity: '{{severity}}',
        fix: '{{fix}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowCommonPatterns: {
            type: 'boolean',
            default: false,
            description:
              'Deprecated and ignored. Gated the removed heuristic layer; kept so existing configs still load.',
          },
          maxPatternLength: {
            type: 'number',
            default: 500,
            minimum: 1,
            description: 'Maximum pattern length to analyze',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowCommonPatterns: false,
      maxPatternLength: 500,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { maxPatternLength = 500 }: Options = options || {};

    /**
     * NFA-based ReDoS detection via scslre — the same library eslint-plugin-regexp
     * uses. It builds the automaton and looks for genuine ambiguity, so it sees
     * what character-level heuristics cannot (cross-quantifier trades, deep
     * nested loops) and, just as importantly, sees what they only think they
     * see.
     *
     * The three outcomes are distinct and the caller must not collapse them:
     *
     * - `reported`     — scslre found real ambiguity and has already reported.
     * - `clean`        — scslre analysed the pattern and it is NOT vulnerable.
     *                    This is a VERDICT, not an absence of one.
     * - `unanalysable` — parsing or analysis threw. Only here do heuristics run.
     *
     * `clean` used to be conflated with `unanalysable` (both returned `false`),
     * so every pattern scslre cleared was handed to the heuristic matcher,
     * which then overruled it. That is how
     * `/^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/` (stripe/stripe-js
     * `src/shared.ts:23`) was reported as "Nested Quantifier Pattern: exponential
     * backtracking | CRITICAL". It is anchored at both ends, has two independent
     * optional groups, no nesting, and is linear. The heuristic
     * `\([^)]*[+*?][^)]*\)[+*?]` matched it only because `(\?.*)?` contains a
     * `?`, a `*`, and a trailing `?` — quantifier characters counted, not
     * quantifier nesting.
     */
    function checkWithScslre(
      node: TSESTree.Node,
      pattern: string,
      flags: string,
      runtimeBuilt = false
    ): void {
      try {
        const parse = (source: string) =>
          REGEXPP_PARSER.parsePattern(
            source,
            0,
            source.length,
            { unicode: flags.includes('u'), unicodeSets: flags.includes('v') }
          );
        const run = (ast: ReturnType<typeof parse>) =>
          analyse(
            { pattern: ast, flags: { ignoreCase: flags.includes('i'), unicode: flags.includes('u'), dotAll: flags.includes('s'), multiline: flags.includes('m') } as never },
            { reportTypes: { Move: false } }
          );

        const ast = parse(pattern);
        let result = run(ast);

        // Second pass, only when the first came back clean: hand the analyser
        // the same pattern with its variable bounded ranges relaxed, so the
        // `{2,4}`-under-`+` family stops being invisible. See
        // relaxBoundedRangesUnderUnboundedQuantifier. Patterns the first pass
        // already reported are left with the FIRST pass's findings, so nothing
        // that reports today changes shape.
        if (result.reports.length === 0) {
          const relaxed = relaxBoundedRangesUnderUnboundedQuantifier(ast, pattern);
          if (relaxed !== pattern) {
            result = run(parse(relaxed));
          }
        }

        // ONE report per regex, not one per ambiguity path.
        //
        // scslre returns a report for every distinct path it finds through the
        // automaton, and each was emitted at the same node — so a single
        // pattern produced up to three identical-looking messages at one
        // column. On the 8-repo corpus that was 16 of this rule's 35 findings:
        // duplicates, not distinct problems.
        //
        // The surviving report is the worst one, because exponential and
        // polynomial backtracking are not the same finding and triaging a
        // pattern by its least-severe path would understate it.
        const worst =
          result.reports.find((r) => r.exponential) ?? result.reports[0];
        for (const report of worst ? [worst] : []) {
          const isExp = report.exponential;
          context.report({
            node,
            messageId: 'redosVulnerable',
            data: {
              vulnerabilityName: `${runtimeBuilt ? 'Runtime-built ' : ''}${report.type === 'Self'
                ? `Self-loop quantifier (${isExp ? 'exponential' : 'polynomial'} backtracking)`
                : `Cross-quantifier trade (${isExp ? 'exponential' : 'polynomial'} backtracking)`}`,
              description: report.type === 'Self'
                ? `A quantifier reaches itself via the parent loop. An attacker can craft input that triggers ${isExp ? 'exponential' : 'polynomial'} backtracking.`
                : `Two quantifiers can exchange characters, enabling ${isExp ? 'exponential' : 'polynomial'} backtracking on crafted input.`,
              severity: isExp ? 'CRITICAL' : 'HIGH',
              fix: 'Atomic group, possessive quantifier, or rewrite to eliminate the ambiguity. The scslre auto-suggested fix may be available.',
            },
          });
        }
      } catch {
        // Two ways to land here, and neither is a ReDoS finding:
        //
        //  - The pattern is not a valid regex. `new RegExp("(a+")` throws at
        //    construction; it can never backtrack because it never compiles.
        //  - scslre failed on a pattern that did parse. Defensive only; no
        //    input is known to reach it, and it must not take the lint run
        //    down if a library bug ever does.
        //
        // Silence is the honest answer to both. The layer that used to run
        // here matched the pattern TEXT against a table of quantifier shapes,
        // which is how `(a+` — invalid syntax — got reported as
        // "CRITICAL ReDoS", and how every pattern the analyser had already
        // cleared got reported anyway.
      }
    }

    /**
     * Check literal regex patterns for ReDoS vulnerabilities
     */
    function checkLiteralRegExp(node: TSESTree.Node) {
      if (!isRegExpLiteral(node)) {
        return;
      }

      const pattern = node.regex.pattern;
      const flags = node.regex.flags || '';

      // Skip if pattern is too long (performance)
      if (pattern.length > maxPatternLength) {
        return;
      }

      checkWithScslre(node, pattern, flags);
    }

    /**
     * The pattern SOURCE an expression evaluates to, resolved structurally.
     *
     * `new RegExp(x)` only ever saw `x` when `x` was written inline as a string
     * literal or a template literal. Three shapes that are ordinary production
     * JavaScript were therefore invisible, each of them one node type away from
     * a shape the rule already handled:
     *
     *   const SRC = '^(\\w+\\s*)+$';  new RegExp(SRC)      // one binding hop
     *   new RegExp(String.raw`^(\w+\s*)+$`)                // TaggedTemplate
     *   new RegExp('^(' + CHARS + '+)+$')                  // BinaryExpression
     *
     * All three carry a fully-determined pattern; only the spelling differs.
     * The resolution below is scope-based, so it answers "what does this
     * binding actually hold" rather than guessing from how it is written.
     *
     * `exact: false` means at least one fragment was a runtime value and was
     * replaced by the inert placeholder, so only the surrounding STRUCTURE is
     * real. That is enough to decide nesting, and it is all the old
     * template-literal text heuristic was ever trying to establish.
     */
    function resolvePatternSource(
      node: TSESTree.Node,
      seen: Set<TSESTree.Node>,
    ): { pattern: string; exact: boolean } | null {
      if (seen.has(node)) return null;
      seen.add(node);

      if (node.type === AST_NODE_TYPES.Literal) {
        return typeof node.value === 'string' ? { pattern: node.value, exact: true } : null;
      }

      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        return joinQuasis(
          node.quasis.map((q) => q.value.cooked ?? q.value.raw),
          node.expressions,
          seen,
        );
      }

      // String.raw`…` — the idiomatic way to write a backslash-heavy pattern.
      // Exact membership on `String.raw`, and only when nothing in scope has
      // redeclared `String`: a local `String` is somebody else's function.
      if (
        node.type === AST_NODE_TYPES.TaggedTemplateExpression &&
        node.tag.type === AST_NODE_TYPES.MemberExpression &&
        !node.tag.computed &&
        node.tag.object.type === AST_NODE_TYPES.Identifier &&
        node.tag.object.name === 'String' &&
        node.tag.property.type === AST_NODE_TYPES.Identifier &&
        node.tag.property.name === 'raw' &&
        !isShadowed('String', node)
      ) {
        return joinQuasis(
          node.quasi.quasis.map((q) => q.value.raw),
          node.quasi.expressions,
          seen,
        );
      }

      if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
        const left = resolveOrPlaceholder(node.left, seen);
        const right = resolveOrPlaceholder(node.right, seen);
        return { pattern: left.pattern + right.pattern, exact: left.exact && right.exact };
      }

      if (node.type === AST_NODE_TYPES.Identifier) {
        const init = resolveBindingInit(node);
        return init ? resolvePatternSource(init, seen) : null;
      }

      return null;
    }

    /**
     * Static parts spliced together, each hole filled by whatever it resolves to.
     *
     * Driven by `staticParts`, not by `expressions`. A template literal always
     * parses with exactly `expressions.length + 1` quasis, so the previous
     * `staticParts[i] ?? ''` guards were unreachable by construction — they
     * cost two permanently-uncovered branches and bought nothing a parser can
     * produce. Interleaving from the static side needs no fallback: part i is
     * always present, and the hole after it exists for every part but the last.
     */
    function joinQuasis(
      staticParts: readonly string[],
      expressions: readonly TSESTree.Expression[],
      seen: Set<TSESTree.Node>,
    ): { pattern: string; exact: boolean } {
      let pattern = '';
      let exact = true;
      for (const [index, part] of staticParts.entries()) {
        pattern += part;
        const expression = expressions[index];
        if (!expression) continue;
        const resolved = resolveOrPlaceholder(expression, seen);
        pattern += resolved.pattern;
        exact &&= resolved.exact;
      }
      return { pattern, exact };
    }

    /**
     * A fragment inside a larger pattern: whatever it resolves to, or the inert
     * placeholder when nothing static is knowable. Only a fragment gets this
     * treatment — a top-level `new RegExp(x)` with an unresolvable `x` stays
     * silent, because there is no author-written structure to analyse.
     */
    function resolveOrPlaceholder(
      node: TSESTree.Node,
      seen: Set<TSESTree.Node>,
    ): { pattern: string; exact: boolean } {
      return (
        resolvePatternSource(node, seen) ?? {
          pattern: INTERPOLATION_PLACEHOLDER,
          exact: false,
        }
      );
    }

    /**
     * The initializer of the variable this identifier resolves to, when the
     * binding is a single-write `const`/`let` declaration.
     *
     * A binding written more than once is not resolved: `let src = SAFE; if (x)
     * src = req.query.p;` holds neither value with certainty, and picking the
     * declaration would be reading the code the author did not run.
     */
    function resolveBindingInit(node: TSESTree.Identifier): TSESTree.Expression | null {
      const scope = context.sourceCode.getScope(node);
      for (let current: typeof scope | null = scope; current; current = current.upper) {
        const variable = current.variables.find((v) => v.name === node.name);
        if (!variable) continue;
        if (variable.defs.length !== 1) return null;
        const [def] = variable.defs;
        if (def.type !== 'Variable' || !def.node.init) return null;
        const writes = variable.references.filter((r) => r.isWrite());
        return writes.length === 1 ? def.node.init : null;
      }
      return null;
    }

    /** Does anything in scope declare this name, rather than it being the global? */
    function isShadowed(name: string, node: TSESTree.Node): boolean {
      const scope = context.sourceCode.getScope(node);
      for (let current: typeof scope | null = scope; current; current = current.upper) {
        const variable = current.variables.find((v) => v.name === name);
        if (variable) return variable.defs.length > 0;
      }
      return false;
    }

    /**
     * Check new RegExp() calls for ReDoS vulnerabilities
     */
    function checkNewRegExp(node: TSESTree.CallExpression | TSESTree.NewExpression) {
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.Identifier || callee.name !== 'RegExp') {
        return;
      }

      const firstArg = node.arguments[0];
      if (!firstArg || firstArg.type === AST_NODE_TYPES.SpreadElement) {
        return;
      }

      const resolved = resolvePatternSource(firstArg, new Set());
      if (!resolved || resolved.pattern.length > maxPatternLength) {
        return;
      }

      // `new RegExp("…")` with a string literal is exactly as analysable as the
      // `/…/` form, and used to go straight to the heuristics — so the Stripe
      // shape written as `new RegExp("^https://…/v3/?(\\?.*)?$")` produced the
      // same false positive that `/…/` did. Second argument carries the flags.
      const flagsArg = node.arguments[1];
      const flags =
        flagsArg?.type === AST_NODE_TYPES.Literal && typeof flagsArg.value === 'string'
          ? flagsArg.value
          : '';
      checkWithScslre(node, resolved.pattern, flags, !resolved.exact);
    }

    return {
      Literal: checkLiteralRegExp,
      CallExpression: checkNewRegExp,
      NewExpression: checkNewRegExp,
    };
  },
});

