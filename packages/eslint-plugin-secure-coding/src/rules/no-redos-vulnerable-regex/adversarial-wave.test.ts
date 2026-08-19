/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Adversarial wave — 2026-08-18.
 *
 * Written AFTER the rule reached 100% F1 on its corpus, for the express purpose
 * of breaking it. Phase 4 of RULE-TO-BAR-PLAYBOOK.md: a score on a corpus the
 * rule was fitted to is worth nothing.
 *
 * The method holds the WEAKNESS constant and varies only the spelling. Every
 * case below compiles `(x+x+)+y`, whose blow-up was measured rather than
 * asserted — 1317.8 ms via scripts/redos-classify.mts, exponential, reproduced
 * from an input the classifier derived from the pattern itself. Fifteen routes
 * to that one automaton; the rule caught thirteen.
 *
 * The two it missed are the two the sibling rule `detect-non-literal-regexp`
 * already handled, which is why the fix is a SHARED resolver rather than a
 * second copy of the same knowledge:
 *
 *   const R = RegExp; new R('(x+x+)+y')     — native-constructor capture
 *   new globalThis.RegExp('(x+x+)+y')       — the bundler-safe spelling
 *
 * Both are real library idiom. Neither is exotic. Both were silent.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noRedosVulnerableRegex } from './index';

const ruleTester = new RuleTester();

/** The measured-exponential automaton every case below reaches. */
const CATASTROPHIC = '(x+x+)+y';

ruleTester.run('no-redos-vulnerable-regex (adversarial wave)', noRedosVulnerableRegex, {
  valid: [
    // CONTROLS. Each pairs with an invalid case above it and must stay quiet,
    // so that "the rule reports everything" cannot pass this file.
    {
      name: 'a parameter named RegExp is not the intrinsic',
      code: `function render(RegExp: (p: string) => unknown) { return RegExp('${CATASTROPHIC}'); }`,
    },
    {
      name: 'a locally declared RegExp shadowing the global is not the intrinsic',
      code: `const RegExp = (p: string) => p; export default RegExp('${CATASTROPHIC}');`,
    },
    {
      name: 'a captured binding that is NOT the intrinsic',
      code: `const R = String; export default R('${CATASTROPHIC}');`,
    },
    {
      name: 'globalThis member that is not RegExp',
      code: `export default new globalThis.Map();`,
    },
    {
      name: 'a linear pattern through the captured-native route stays quiet',
      code: `const R = RegExp; export default new R('^[a-z]+$');`,
    },
    {
      name: 'a linear pattern through globalThis stays quiet',
      code: `export default new globalThis.RegExp('^[a-z]+$');`,
    },
    {
      // The depth guard. Five hops is already past any real code, and the
      // guard is what keeps a cyclic `const a = b; const b = a` from
      // recursing forever — so the resolver gives up and the rule stays
      // quiet. Deliberately a MISS: refusing to answer beats not returning.
      name: 'an alias chain deeper than the resolver follows',
      code: [
        'const A = RegExp;',
        'const B = A;',
        'const C = B;',
        'const D = C;',
        'const E = D;',
        'const F = E;',
        `export default new F('${CATASTROPHIC}');`,
      ].join('\n'),
    },
    {
      // THE ORACLE RETRACTION PATH — verified to be the path, not assumed.
      //
      // This is sequelize's CSV-field splitter, taken from the real-source
      // corpus. The structural pass reports it: a quantified group whose
      // branches can both begin on a quote. recheck proves the automaton
      // linear, and the finding is withdrawn.
      //
      // Confirmed by running it BOTH ways rather than by reading the code —
      // with the oracle forced absent the rule REPORTS, with it present the
      // rule is quiet. Three shorter candidates were rejected first because
      // they were quiet either way, which would have made this a test of
      // nothing. That is the same trap as a probe with no positive control.
      //
      // The case therefore holds only while the optional oracle is installed,
      // which it is here. Without it the rule reports, and that is the
      // documented cost of not installing it.
      name: 'the oracle retracts a pattern the structural pass cannot clear',
      code: String.raw`export default /("(?:\.|[^"\])*"|[^,]*)(?:\s*,\s*|\s*$)/;`,
    },
  ],
  invalid: [
    {
      name: 'native-constructor capture — const R = RegExp',
      code: `const R = RegExp; export default new R('${CATASTROPHIC}');`,
      errors: [{ messageId: 'redosVulnerable' }],
    },
    {
      name: 'native-constructor capture, called without new',
      code: `const R = RegExp; export default R('${CATASTROPHIC}');`,
      errors: [{ messageId: 'redosVulnerable' }],
    },
    {
      name: 'globalThis.RegExp',
      code: `export default new globalThis.RegExp('${CATASTROPHIC}');`,
      errors: [{ messageId: 'redosVulnerable' }],
    },
    {
      name: 'globalThis.RegExp, called without new',
      code: `export default globalThis.RegExp('${CATASTROPHIC}');`,
      errors: [{ messageId: 'redosVulnerable' }],
    },
    {
      name: 'a capture two hops deep',
      code: `const A = RegExp; const B = A; export default new B('${CATASTROPHIC}');`,
      errors: [{ messageId: 'redosVulnerable' }],
    },
    {
      name: 'the bare intrinsic still reports — the route the rule already had',
      code: `export default new RegExp('${CATASTROPHIC}');`,
      errors: [{ messageId: 'redosVulnerable' }],
    },
  ],
});
