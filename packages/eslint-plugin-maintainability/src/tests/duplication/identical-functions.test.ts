/**
 * Comprehensive tests for identical-functions rule
 * Duplication: Detects duplicate function implementations
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { identicalFunctions } from '../../rules/maintainability/identical-functions';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('identical-functions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - unique functions', identicalFunctions, {
      valid: [
        // Unique functions
        {
          code: `
            function add(a, b) { return a + b; }
            function subtract(a, b) { return a - b; }
          `,
        },
        // Functions below minimum lines
        {
          code: `
            function one() { return 1; }
            function two() { return 2; }
          `,
          options: [{ minLines: 3 }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Duplicate Functions', () => {
    ruleTester.run(
      'invalid - identical function implementations',
      identicalFunctions,
      {
        valid: [],
        invalid: [
          {
            code: `
            function processUser(user) {
              if (!user) return null;
              return user.name.toUpperCase();
            }
            
            function processCustomer(customer) {
              if (!customer) return null;
              return customer.name.toUpperCase();
            }
          `,
            options: [{ minLines: 3, similarityThreshold: 0.8 }],
            errors: [{ messageId: 'identicalFunctions' }],
          },
        ],
      },
    );
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', identicalFunctions, {
      valid: [],
      invalid: [
        {
          code: `
            function formatA(data) {
              return data.toUpperCase();
            }
            
            function formatB(data) {
              return data.toUpperCase();
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
          errors: [
            {
              messageId: 'identicalFunctions',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', identicalFunctions, {
      valid: [
        {
          code: `
            function one() { return 1; }
            function two() { return 2; }
          `,
          options: [{ minLines: 3 }],
        },
        // Line 107: ignoreTestFiles option
        {
          code: `
            function testA() { return 1; }
            function testB() { return 1; }
          `,
          filename: '/path/to/file.test.ts',
          options: [{ ignoreTestFiles: true }],
        },
      ],
      invalid: [
        {
          code: `
            function processA(data) {
              if (!data) return null;
              return data.value;
            }
            
            function processB(data) {
              if (!data) return null;
              return data.value;
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
          errors: [{ messageId: 'identicalFunctions' }],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Lines 139, 144-176: Levenshtein distance algorithm
    // Test when str2 is longer than str1 (line 139)
    // Test different string comparisons to cover the algorithm
    ruleTester.run(
      'line 139, 144-176 - Levenshtein distance',
      identicalFunctions,
      {
        valid: [],
        invalid: [
          {
            code: `
            function processLong(data) {
              if (!data) return null;
              return data.value.toUpperCase();
            }
            
            function processShort(x) {
              if (!x) return null;
              return x.value.toUpperCase();
            }
          `,
            options: [{ minLines: 3, similarityThreshold: 0.7 }],
            errors: [{ messageId: 'identicalFunctions' }],
          },
          {
            code: `
            function formatUser(user) {
              const name = user.name;
              const email = user.email;
              return { name, email };
            }
            
            function formatPerson(person) {
              const name = person.name;
              const email = person.email;
              return { name, email };
            }
          `,
            options: [{ minLines: 4, similarityThreshold: 0.8 }],
            errors: [{ messageId: 'identicalFunctions' }],
          },
        ],
      },
    );

    // Line 279: Default return in suggestRefactoring
    ruleTester.run(
      'line 279 - default refactoring suggestion',
      identicalFunctions,
      {
        valid: [],
        invalid: [
          {
            code: `
            function funcA() {
              return Math.random();
            }
            
            function funcB() {
              return Math.random();
            }
          `,
            options: [{ minLines: 2, similarityThreshold: 0.9 }],
            errors: [{ messageId: 'identicalFunctions' }],
          },
        ],
      },
    );

    // Both early-exit prunes in calculateSimilarity.
    //
    // This rule was 90.9% of ALL rule time before those prunes existed — a
    // full |a|x|b| edit-distance matrix for every pair of functions in a file,
    // growing quadratically (4.3x the source cost 8.3x the time). The prunes
    // took it from 933 ms to 26 ms over the same 60-file corpus with byte-for-
    // byte identical findings.
    //
    // Each prune needs a different shape of input, and neither is reachable
    // from the fixtures above:
    //
    //   - the LENGTH ceiling wants two functions of very different size, so
    //     `shorter/longer` alone falls under the threshold and no matrix is
    //     ever built;
    //   - the DISTANCE BUDGET wants two functions of nearly the SAME size but
    //     different content, so the length ceiling passes and the walk has to
    //     start before it can prove the pair hopeless.
    //
    // Both must stay `valid` — a prune that reported a duplicate it shouldn't
    // would be a correctness bug, and these cases verify that half of the
    // contract.
    //
    // They do NOT lock the prunes themselves. Deleting either one leaves every
    // case here green; the rule would simply run ~30x slower and still report
    // exactly this. That other half — that the prunes actually fire and cannot
    // be silently removed — needs an observable signal rather than a finding,
    // and lives in `identical-functions-perf.test.ts`.
    ruleTester.run('similarity prunes (performance)', identicalFunctions, {
      valid: [
        {
          // Length ceiling: 1-line body vs a much longer one.
          code: `
            function tiny() {
              return 1;
            }

            function sprawling() {
              const a = compute(1);
              const b = compute(2);
              const c = compute(3);
              const d = compute(4);
              return a + b + c + d;
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
        },
        {
          // Distance budget. Note `normalizeBody` rewrites EVERY identifier to
          // `VAR`, so renaming things changes nothing — only structure and
          // punctuation survive, and the pair must differ there.
          //
          // Measured on the normalized bodies: length ratio 0.952 (clears the
          // 0.9 ceiling, so prune 1 does not fire) against an edit distance of
          // 23 versus a budget of 6 — the DP walk has to start, then bail.
          code: `
            function reduceTotals() {
              const total = items.reduce((sum, item) => sum + item.price, 0);
              return total;
            }

            function collectFlags() {
              const flags = [alpha, beta].filter(Boolean).concat(gamma).length;
              return flags;
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
        },
      ],
      invalid: [],
    });
  });
});

/**
 * What `normalizeBody` is allowed to erase.
 *
 * On the pinned 8-repository corpus this rule reported 3,530 findings, and
 * three bugs in the normaliser accounted for most of them. Each is pinned
 * below by a pair of functions that are obviously NOT duplicates.
 */
describe('identical-functions — normalisation', () => {
  ruleTester.run('valid - normalisation keeps what distinguishes', identicalFunctions, {
    valid: [
      {
        // KEYWORDS. `[a-z_$][a-zA-Z0-9_$]*` matches `return`, `throw`, `if`
        // and `this` too, so both of these normalised to the same string of
        // `VAR`s and punctuation. Control flow is the only thing left to
        // compare once bindings are generic; erasing it made every function
        // with the same bracket shape a duplicate.
        code: `
          function alpha(a, b) {
            const x = compute(a, b);
            return x;
          }
          function beta(a, b) {
            const x = compute(a, b);
            throw x;
          }
        `,
      },
      {
        // COMMENTS ran last, after \s+ had collapsed the body onto one line —
        // at which point //.* deletes from the first line comment to the END
        // of the function. Both bodies were compared as their opening lines.
        code: `
          function alpha(a) {
            const x = 1; // explain alpha
            return first(x);
          }
          function beta(a) {
            const x = 1; // explain beta
            return second(x, x, x);
          }
        `,
      },
      {
        // STRING CONTENTS were renamed too — every lowercase run inside a
        // literal became `VAR` — so two methods calling different endpoints
        // normalised to the same text and compared 100% identical. This is the
        // okta-auth-js authn mixin shape.
        //
        // The literals here are far apart on purpose. The near-miss pair
        // `/api/v1/authn/recovery/password` vs `.../unlock` still reports: with
        // contents preserved it drops from 100% to exactly 90%, which is the
        // default threshold rather than a normalisation defect.
        code: `
          function alpha(opts) {
            const url = "/api/v1/authn/recovery/password";
            return post(url, opts);
          }
          function beta(opts) {
            const url = "/oauth2/revoke";
            return post(url, opts);
          }
        `,
      },
      {
        // Property names are part of the call and must survive normalisation.
        //
        // The names here are deliberately far apart. `.create` vs `.destroy`
        // also keeps its names, but those two bodies really ARE ~90% similar
        // as text, so at the default threshold they report — which is the
        // threshold doing its job, not the normaliser losing information.
        code: `
          function alpha(client, id) {
            const res = client.create(id);
            return res;
          }
          function beta(client, id) {
            const res = client.reconcileEveryOutstandingLedgerEntry(id);
            return res;
          }
        `,
      },
      {
        // A URL inside a string literal. Comment removal matched the `//` and
        // deleted the rest of the FUNCTION, so any two bodies containing a URL
        // compared identical. Raised by CodeRabbit on #595.
        code: `
          function alpha(a) {
            const u = "https://alpha.example.com/one";
            return get(u, a);
          }
          function beta(a) {
            const u = "https://beta.example.org/two/three/four";
            return get(u, a);
          }
        `,
      },
      {
        // Unquoted object KEYS were renamed, so `{ create: id }` and
        // `{ destroy: id }` were one string. A key names the operation.
        code: `
          function alpha(id) {
            const payload = { create: id };
            return send(payload);
          }
          function beta(id) {
            const payload = { destroy: id };
            return send(payload);
          }
        `,
      },
      {
        // Regex literal CONTENTS were renamed like any other identifier, so
        // `/create/` and `/destroy/` compared identically. Raised by
        // CodeRabbit on #595.
        code: `
          function alpha(s) {
            const re = /create/;
            return re.test(s);
          }
          function beta(s) {
            const re = /destroy/;
            return re.test(s);
          }
        `,
      },
      {
        // A template literal is the one literal that spans lines, so a pattern
        // stopping at \n never protected it — and a `//` in its contents then
        // ate the rest of the body.
        code: [
          'function alpha(a) {',
          '  const t = `line one',
          '  https://alpha.example.com/one',
          '  end`;',
          '  return send(t, a);',
          '}',
          'function beta(a) {',
          '  const t = `wholly different',
          '  https://beta.example.org/x/y/z',
          '  other`;',
          '  return send(t, a);',
          '}',
        ].join('\n'),
      },
      {
        // A generator is a different function too, and `*` is likewise on the
        // node rather than in the body.
        code: `
          function* alpha(a) {
            const x = load(a);
            return x;
          }
          function beta(a) {
            const x = load(a);
            return x;
          }
        `,
      },
      {
        // `async` is on the NODE, not in `node.body`, so an async function and
        // its synchronous twin normalised to the same string.
        code: `
          async function alpha(a) {
            const x = load(a);
            return x;
          }
          function beta(a) {
            const x = load(a);
            return x;
          }
        `,
      },
    ],
    invalid: [
      {
        // FN GUARD: `/` is genuinely ambiguous in JavaScript, so the regex
        // guard is anchored to positions where a slash cannot be division.
        // These two are ordinary arithmetic and ARE a renamed copy.
        code: `
          function alpha(a, b) {
            const r = a / b / 2;
            return r;
          }
          function beta(x, y) {
            const r = x / y / 2;
            return r;
          }
        `,
        errors: [{ messageId: 'identicalFunctions' }],
      },
      {
        // FN GUARD: renaming BINDINGS is still the point — a copy-paste with
        // the variables renamed is exactly what this rule exists to catch.
        code: `
          function alpha(input) {
            const parsed = parse(input);
            return parsed;
          }
          function beta(other) {
            const decoded = parse(other);
            return decoded;
          }
        `,
        // One report per GROUP, not per member.
        errors: [{ messageId: 'identicalFunctions' }],
      },
    ],
  });
});
