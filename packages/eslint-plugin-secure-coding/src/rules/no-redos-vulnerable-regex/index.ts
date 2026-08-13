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
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { RegExpParser } from '@eslint-community/regexpp';
import { analyse } from 'scslre';

// Module-level parser; cheap to reuse.
const REGEXPP_PARSER = new RegExpParser();

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
      flags: string
    ): void {
      try {
        const ast = REGEXPP_PARSER.parsePattern(
          pattern,
          0,
          pattern.length,
          { unicode: flags.includes('u'), unicodeSets: flags.includes('v') }
        );
        const result = analyse(
          { pattern: ast, flags: { ignoreCase: flags.includes('i'), unicode: flags.includes('u'), dotAll: flags.includes('s'), multiline: flags.includes('m') } as never },
          { reportTypes: { Move: false } }
        );

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
              vulnerabilityName: report.type === 'Self'
                ? `Self-loop quantifier (${isExp ? 'exponential' : 'polynomial'} backtracking)`
                : `Cross-quantifier trade (${isExp ? 'exponential' : 'polynomial'} backtracking)`,
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
     * Check new RegExp() calls for ReDoS vulnerabilities
     */
    function checkNewRegExp(node: TSESTree.CallExpression | TSESTree.NewExpression) {
      // Check for new RegExp(pattern) or RegExp(pattern)
      let callee: TSESTree.Expression;

      if (node.type === 'NewExpression') {
        callee = node.callee;
      } else if (node.type === 'CallExpression') {
        callee = node.callee;
      } else {
        return;
      }

      const isRegExp = callee.type === 'Identifier' && callee.name === 'RegExp';

      if (!isRegExp) {
        return;
      }

      // Check if first argument is a string literal
      if (node.arguments.length === 0) {
        return;
      }

      const firstArg = node.arguments[0];

      // Template literal with interpolation — runtime-built pattern.
      // Closes the audit FN where `new RegExp(\`^(\${pattern}+)+$\`)` was
      // bypassing detection. We can't fully analyse the resulting regex
      // (the interpolated parts are user-controlled), but we CAN detect
      // the nested-quantifier signature `+)+`/`+)*`/`*)+`/`*)*` in the
      // static template text — that shape is catastrophic regardless of
      // what the interpolation injects. See benchmarks/AUDIT_PATTERNS.md
      // §3.5 ("Runtime-built patterns").
      if (firstArg.type === 'TemplateLiteral' && firstArg.expressions.length > 0) {
        const concatenated = firstArg.quasis
          .map((q) => q.value.cooked ?? q.value.raw)
          .join(' '); // sentinel between static parts
        // Look for the nested-quantifier signature on either side of an
        // interpolation: `+)+`, `+)*`, `*)+`, `*)*`, `})+` etc.
        const hasNestedQuantifier =
          /[+*}](?:\)\s*[+*]|\)\s*\{\s*\d+\s*,?\s*\d*\s*\}| \s*[+*])/.test(
            concatenated,
          ) ||
          /[+*] .*\)[+*]/.test(concatenated) ||
          /\( [+*]\)[+*]/.test(concatenated);
        if (hasNestedQuantifier) {
          context.report({
            node,
            messageId: 'redosVulnerable',
            data: {
              vulnerabilityName: 'Runtime-built nested quantifier',
              description:
                'Template-literal pattern interpolation places user input inside a nested-quantifier shape (`(...+)+` / `(...*)*`); this is catastrophic regardless of what the interpolation injects.',
              severity: 'HIGH',
              fix:
                'Avoid runtime-built nested quantifiers. Build the pattern at module load time and validate; or constrain the interpolated section to a non-quantifier region.',
            },
          });
        }
        return;
      }

      if (firstArg.type !== 'Literal' || typeof firstArg.value !== 'string') {
        return;
      }

      const pattern = firstArg.value;

      // Skip if pattern is too long (performance)
      if (pattern.length > maxPatternLength) {
        return;
      }

      // `new RegExp("…")` with a string literal is exactly as analysable as the
      // `/…/` form, and used to go straight to the heuristics — so the Stripe
      // shape written as `new RegExp("^https://…/v3/?(\\?.*)?$")` produced the
      // same false positive that `/…/` did. Second argument carries the flags.
      const flagsArg = node.arguments[1];
      const flags =
        flagsArg?.type === 'Literal' && typeof flagsArg.value === 'string' ? flagsArg.value : '';
      checkWithScslre(node, pattern, flags);
    }

    return {
      Literal: checkLiteralRegExp,
      CallExpression: checkNewRegExp,
      NewExpression: checkNewRegExp,
    };
  },
});

