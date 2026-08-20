/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Compile a regex that came from a USER'S CONFIG, without handing them a way to
 * crash or hang their own lint run.
 *
 * WHY THIS EXISTS
 *
 * Six rules accept regex options (`ignorePatterns`, `secretPatterns`,
 * `userInputPatterns`, `testFilePattern`) and passed them straight to
 * `new RegExp(...)`. Measured, not theorised:
 *
 *   ignorePatterns: ['(a+)+$']  against a 30-char subject
 *     → 54.9s in no-hardcoded-credentials   (control: 1.21s)
 *     → 58.2s in no-missing-authentication  (control: 1.65s)
 *     → 47.5s in no-timing-unsafe-compare   (control: 1.40s)
 *   Timings scale 1.0 / 70 / 901 / 14045 / 62215 ms at n = 20/24/28/30/32.
 *   Textbook exponential backtracking.
 *
 *   ignorePatterns: ['[']
 *     → "Invalid regular expression: /[/: Unterminated character class",
 *       thrown out of create(). The WHOLE lint run dies, not just the rule.
 *
 * A user misconfiguring one option should degrade that option, never take down
 * the process. Three of the six rules already caught the throw and fell back to
 * a substring match; this makes the other three consistent and adds the
 * backtracking guard none of them had.
 *
 * WHAT THIS DOES NOT DO
 *
 * `looksCatastrophic` is a HEURISTIC over the pattern's shape — nested
 * quantifiers and quantified alternations with overlapping branches. It is not
 * a decision procedure; a determined pattern can evade it, and some safe
 * patterns will be refused. That trade is deliberate: the cost of a false
 * refusal is one option falling back to substring matching, and the cost of a
 * miss is a 60-second hang on every file. If exactness is ever needed, this
 * repo already ships a real automaton analysis in `no-redos-vulnerable-regex`.
 */

/**
 * The minimal shape a pattern test needs.
 *
 * `RegExp` satisfies this structurally, so a call site can migrate from
 * `RegExp[]` to `PatternTest[]` without touching its callers — which is the
 * whole reason the guarded matcher is shaped like a RegExp.
 */
export interface PatternTest {
  test(input: string): boolean;
}

/** A compiled matcher. Always safe to call; never throws. */
export interface UserMatcher extends PatternTest {
  /** How the pattern was handled, so a rule can explain itself to the user. */
  readonly mode: 'regex' | 'literal-invalid' | 'literal-catastrophic';
  readonly source: string;
}

/**
 * Nested or stacked quantifiers — the shape that makes backtracking explode.
 *
 * Matches `(a+)+`, `(a*)*`, `(a+)*`, `(\w+\s?)*` and `(a|a)+`. Deliberately
 * shape-based: the pattern text is all we have before compiling, and inspecting
 * it is cheap compared with running it against every identifier in a codebase.
 */
function looksCatastrophic(pattern: string): boolean {
  // The leading class in the first two excludes the delimiter it scans for.
  // `[^()]*[+*}][^()]*` is the obvious spelling and it is 2nd-degree polynomial
  // (recheck, 2026-08-20): every non-paren run has one split point per character.
  // Excluding the delimiter from the leading class anchors the match on the
  // FIRST occurrence, which removes the ambiguity without changing the language
  // — verified over 400k inputs, 0 disagreements. A ReDoS detector that is
  // itself a ReDoS is the fault this file exists to police.
  // A quantified group whose body itself ends in a quantifier.
  if (/\([^()+*}]*[+*}][^()]*\)\s*[+*]/.test(pattern)) return true;
  // A quantified group containing an alternation — overlapping branches are the
  // other classic exponential source, e.g. `(a|ab)+`.
  if (/\([^()|]*\|[^()]*\)\s*[+*]/.test(pattern)) return true;
  // Two adjacent unbounded quantifiers on groups: `(x)+(y)+` over a shared alphabet.
  if (/\)[+*]\s*\([^()]*\)[+*]/.test(pattern)) return true;
  return false;
}

/** Case-insensitive substring fallback — what a "pattern" degrades to. */
function literalMatcher(pattern: string, mode: UserMatcher['mode']): UserMatcher {
  const needle = pattern.toLowerCase();
  return {
    test: (input: string) => input.toLowerCase().includes(needle),
    mode,
    source: pattern,
  };
}

/**
 * Compile one user-supplied pattern.
 *
 * Never throws. An invalid or dangerous pattern degrades to a case-insensitive
 * substring test, which is what a user writing a plain name like `apiKey` almost
 * always meant anyway.
 */
export function compileUserPattern(pattern: string, flags = ''): UserMatcher {
  if (looksCatastrophic(pattern)) return literalMatcher(pattern, 'literal-catastrophic');
  try {
    const regex = new RegExp(pattern, flags);
    return {
      // `lastIndex` makes a /g/y regex stateful across calls, and these matchers
      // are reused for every identifier in a file. Reset before each test so the
      // Nth call cannot answer differently from the first.
      test: (input: string) => {
        regex.lastIndex = 0;
        return regex.test(input);
      },
      mode: 'regex',
      source: pattern,
    };
  } catch {
    return literalMatcher(pattern, 'literal-invalid');
  }
}

/** Compile a list of user patterns. */
export function compileUserPatterns(patterns: readonly string[], flags = ''): UserMatcher[] {
  return patterns.map((p) => compileUserPattern(p, flags));
}

/** Does any compiled pattern match? The common call shape at every site. */
export function matchesAnyUserPattern(matchers: readonly UserMatcher[], input: string): boolean {
  return matchers.some((m) => m.test(input));
}
