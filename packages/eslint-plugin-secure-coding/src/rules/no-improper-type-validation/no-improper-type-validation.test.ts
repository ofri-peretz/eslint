/**
 * Comprehensive tests for no-improper-type-validation rule
 * Security: CWE-1287 (Improper Validation of Specified Type of Input)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperTypeValidation } from './index';

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

describe('no-improper-type-validation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - proper type validation', noImproperTypeValidation, {
      valid: [
        // Proper type checking with strict equality
        {
          code: 'if (value !== null && typeof value === "object") { /* process */ }',
        },
        {
          code: 'if (Array.isArray(data)) { /* process array */ }',
        },
        // Non-user-input typeof checks are valid
        {
          code: 'if (typeof value === "string" && value.length > 0) { /* process */ }',
        },
        // Safe type guards
        {
          code: 'if (Number.isNaN(Number(value))) { /* handle NaN */ }',
        },
        {
          code: 'if (Object.prototype.toString.call(value) === "[object Array]") { /* process */ }',
        },
        // Strict equality for types
        {
          code: 'if (value !== null && value !== undefined) { /* process */ }',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe typeof Checks', () => {
    ruleTester.run('invalid - unsafe typeof usage', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // typeof === "object" on user input variable
        {
          code: 'if (typeof userInput === "object") { processData(userInput); }',
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
        // typeof on data (user input variable)
        {
          code: 'const isObject = typeof data === "object";',
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unsafe instanceof Usage', () => {
    ruleTester.run(
      'invalid - unsafe instanceof usage',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          // instanceof on user input with allowInstanceofSameRealm: false
          {
            code: 'if (userInput instanceof Array) { processArray(userInput); }',
            options: [{ allowInstanceofSameRealm: false }],
            errors: [
              {
                messageId: 'unsafeInstanceofUsage',
              },
            ],
          },
          {
            code: 'if (data instanceof Object) { handleObject(data); }',
            options: [{ allowInstanceofSameRealm: false }],
            errors: [
              {
                messageId: 'unsafeInstanceofUsage',
              },
            ],
          },
        ],
      },
    );
  });

  describe('Loose equality: type juggling, not the nullish idiom', () => {
    /**
     * LOCK — the `looseEqualityTypeCheck` implementation was INVERTED.
     *
     * `isLooseEqualityTypeCheck` required the printed text of an operand to contain
     * "null" or "undefined". So the ONLY `==` it ever reported was `x == null` — the
     * idiomatic nullish test that core `eqeqeq` exempts under `smart`, that this
     * plugin's own `no-insecure-comparison` exempts in as many words, and that this
     * rule's own `unsafeTypeofCheck` message prescribes as the fix. Meanwhile the
     * authentication bypass the message describes — a string from the request body
     * loosely compared to a stored number, where `'0e0' == 0` is true — never
     * reported at all, because neither operand's text contains "null".
     */
    /**
     * Behind `checkLooseEquality`, which defaults to OFF.
     *
     * Both cases below are real: `'0e0' == 0` is true, so a string from the request
     * body loosely compared to a stored value is an authentication bypass. But
     * telling them apart from `config.port != 636` requires knowing where the value
     * came from, and this plugin does not do data-flow — statically only literals
     * have a provable type. Left on, the arm reported 126 findings across 78 KLOC of
     * well-maintained repositories, including the correct null-safe idiom
     * `typeof x == 'object' && x !== null`.
     *
     * So this is a deliberate precision-for-recall trade, not a free win: the arm is
     * opt-in, and `eqeqeq` — which most codebases already run — flags the same lines.
     */
    ruleTester.run('invalid - real type juggling', noImproperTypeValidation, {
      valid: [],
      invalid: [
        {
          code: 'if (req.body.otp == storedOtp) { grant(); }',
          errors: [{ messageId: 'looseEqualityTypeCheck' }],
        },
        {
          code: 'if (req.body.admin == 1) { elevate(); }',
          errors: [{ messageId: 'looseEqualityTypeCheck' }],
        },
      ],
    });

    /**
     * The null-safe idiom spelled with a loose operator. Reported before this change:
     * `typeofObjectOperand` only accepted `===`/`!==`, so the comparison missed the
     * typeof arm entirely and fell through to the loose-equality arm below — the
     * correct code was condemned while its `===` spelling passed.
     */
    ruleTester.run(
      'valid - guarded typeof with a loose operator',
      noImproperTypeValidation,
      {
        valid: [
          'if (typeof value == "object" && value !== null) { process(value); }',
          'if (value != null && typeof value == "object") { process(value); }',
        ],
        invalid: [],
      },
    );

    /** Same hole, loose spelling: still a finding, and now with the right message. */
    ruleTester.run(
      'invalid - unguarded typeof with a loose operator',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          {
            code: 'if (typeof userInput == "object") { processData(userInput); }',
            errors: [{ messageId: 'unsafeTypeofCheck' }],
          },
        ],
      },
    );

    ruleTester.run(
      'valid - the nullish idiom and same-type comparisons',
      noImproperTypeValidation,
      {
        valid: [
          // All four REPORTED before the fix.
          'if (input != null) { processInput(input); }',
          'if (userData == null) { return; }',
          'if (null == userData) { return; }',
          'function isPlainObject(value) { return value != null && typeof value === "object"; }',
          // Two numbers cannot coerce. `annulled` merely CONTAINS the letters "null".
          'const annulled = rows.length; if (annulled == 1) { note(); }',
          // Two strings cannot coerce either.
          'const role = "admin"; if (role == "admin") { go(); }',
        ],
        invalid: [],
      },
    );
  });

  describe('Invalid Code - Unreliable Constructor Checks', () => {
    ruleTester.run(
      'invalid - unreliable constructor checks',
      noImproperTypeValidation,
      {
        valid: [
          // LOCK — reading a class name for a LOG LABEL is not a type check. Nothing
          // branches on it, nothing is merged, nothing is authorised. Reported before
          // the fix, because any `constructor.name` in a VariableDeclarator counted.
          'const errorKind = error.constructor.name; logger.warn({ errorKind });',
          'logger.warn({ kind: error.constructor.name });',
        ],
        invalid: [
          {
            code: 'if (data.constructor.name === "Array") { handleArray(data); }',
            errors: [{ messageId: 'unreliableConstructorCheck' }],
          },
        ],
      },
    );
  });

  describe('Invalid Code - typeof on a plain identifier', () => {
    ruleTester.run('invalid - typeof object check', noImproperTypeValidation, {
      valid: [],
      invalid: [
        {
          code: 'const type = typeof userInput === "object";',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run(
      'valid - false positives reduced',
      noImproperTypeValidation,
      {
        valid: [
          // Safe annotations
          {
            code: `
            /** @validated */
            if (typeof userInput === "object") {
              processData(userInput);
            }
          `,
          },
          // TypeScript type guards (would be handled by TS compiler)
          {
            code: `
            function isString(value: any): value is string {
              return typeof value === "string";
            }
          `,
          },
          // Safe type checking functions
          {
            code: `
            if (validateType(userInput, "object")) {
              processData(userInput);
            }
          `,
          },
          // Proper null checks
          {
            code: `
            if (userInput !== null && userInput !== undefined) {
              processData(userInput);
            }
          `,
          },
          // Safe instanceof within same realm
          {
            code: `
            const arr = [1, 2, 3];
            if (arr instanceof Array) {
              processArray(arr);
            }
          `,
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Configuration Options', () => {
    ruleTester.run(
      'config - disable instanceof checks',
      noImproperTypeValidation,
      {
        valid: [
          // Default: instanceof is same-realm and unremarkable.
          'if (data instanceof Array) { /* process */ }',
        ],
        invalid: [
          {
            code: 'if (data instanceof Array) { /* process */ }',
            options: [{ allowInstanceofSameRealm: false }],
            errors: [{ messageId: 'unsafeInstanceofUsage' }],
          },
        ],
      },
    );
  });

  describe('Safe JSDoc Annotations - safetyChecker.isSafe branches', () => {
    ruleTester.run(
      'valid - @validated annotation suppresses unsafeTypeofCheck',
      noImproperTypeValidation,
      {
        valid: [
          // @validated annotation directly before the flagged statement suppresses
          // the unsafeTypeofCheck report (BinaryExpression handler, matchesUserInput branch).
          {
            code: `
            /** @validated */
            if (typeof userInput === "object") {
              processData(userInput);
            }
          `,
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'valid - @sanitized annotation suppresses looseEqualityTypeCheck',
      noImproperTypeValidation,
      {
        valid: [
          // @sanitized annotation suppresses the looseEqualityTypeCheck report.
          {
            code: `
            /** @sanitized */
            if (userInput == null) {
              return;
            }
          `,
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'valid - @trusted annotation suppresses unreliableConstructorCheck',
      noImproperTypeValidation,
      {
        valid: [
          // @trusted annotation suppresses the unreliableConstructorCheck report
          // (MemberExpression handler, involvesUserInput branch).
          {
            code: `
            /** @trusted */
            const type = userInput.constructor.name;
          `,
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'valid - @safe annotation suppresses truthiness improperTypeValidation',
      noImproperTypeValidation,
      {
        valid: [
          // @safe annotation suppresses the implicit-truthiness improperTypeValidation
          // report (IfStatement handler, test.type === 'Identifier' branch).
          {
            code: `
            /** @safe */
            if (userInput) {
              processData(userInput);
            }
          `,
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'valid - @escaped annotation suppresses missingNullCheck',
      noImproperTypeValidation,
      {
        valid: [
          // @escaped annotation suppresses the missingNullCheck report
          // (IfStatement handler, BinaryExpression test branch).
          {
            code: `
            /** @escaped */
            if (userInput != null) {
              processData(userInput);
            }
          `,
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'valid - @verified annotation suppresses looseEqualityTypeCheck (BinaryExpression handler)',
      noImproperTypeValidation,
      {
        valid: [
          // @verified annotation suppresses the looseEqualityTypeCheck report
          // directly in the BinaryExpression handler's safetyChecker gate.
          {
            code: `
            /** @verified */
            const isNullish = userInput == null;
          `,
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Truthiness is not a type check, and a name is not evidence', () => {
    /**
     * LOCK — `if (userInput)` used to be reported as "Type validation may be bypassed
     * or incomplete", solely because the identifier's spelling contained one of
     * `req`/`request`/`body`/`query`/`params`/`input`/`data`/`userInput`. So
     * `if (metadata)` reported (it contains "data") and `if (isReady)` did not, on
     * identical code with no sink in sight. A truthiness guard IS a weak check, but
     * the rule had no evidence that these particular values needed one, and the
     * message it emitted named a CWE.
     */
    ruleTester.run('valid - truthiness checks', noImproperTypeValidation, {
      valid: [
        'if (userInput) { processData(userInput); }',
        'if (metadata) { render(metadata.title); }',
        'if (isReady) { doSomething(); }',
      ],
      invalid: [],
    });
  });

  describe('typeof x === "object" is unsafe wherever x came from', () => {
    /**
     * LOCK — the null-blindness of `typeof x === 'object'` is a property of the
     * OPERATOR. The rule used to look only when the operand was a bare identifier, or
     * a member expression whose OBJECT was a bare identifier, whose spelling matched a
     * word list. One property deeper, behind optional chaining, or renamed, and the
     * identical hole went unreported.
     */
    ruleTester.run(
      'invalid - every spelling of the same hole',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          {
            code: 'if (typeof req.body === "object") { processData(req.body); }',
            errors: [{ messageId: 'unsafeTypeofCheck' }],
          },
          // Was SILENT: `req.body` is a MemberExpression, not an Identifier.
          {
            code: 'if (typeof req.body.profile === "object") { merge(req.body.profile); }',
            errors: [{ messageId: 'unsafeTypeofCheck' }],
          },
          // Was SILENT: optional chaining.
          {
            code: 'if (typeof payload?.settings === "object") { merge(payload.settings); }',
            errors: [{ messageId: 'unsafeTypeofCheck' }],
          },
          // Was SILENT: renamed to an innocuous word.
          {
            code: 'if (typeof envelope === "object") { merge(envelope); }',
            errors: [{ messageId: 'unsafeTypeofCheck' }],
          },
          // Was reported, and still is.
          {
            code: 'if (typeof config.settings === "object") { /* process */ }',
            errors: [{ messageId: 'unsafeTypeofCheck' }],
          },
        ],
      },
    );
  });

  describe('Null-check-aware typeof walk-up', () => {
    ruleTester.run(
      'valid - null check on left of && suppresses unsafeTypeofCheck (!==)',
      noImproperTypeValidation,
      {
        valid: [
          // userInput !== null && typeof userInput === "object": walks up to the
          // enclosing LogicalExpression, finds the null check on the left side of
          // `&&`, and returns false (no report) via the "!== null" text match.
          {
            code: 'if (userInput !== null && typeof userInput === "object") { processData(userInput); }',
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'valid - the loose null guard is the fix, not a finding',
      noImproperTypeValidation,
      {
        valid: [
          // The `!= null` guard suppresses the typeof report AND is itself exempt: it
          // is the exact remediation `unsafeTypeofCheck` prescribes. It used to be
          // reported as a `looseEqualityTypeCheck` in the same breath.
          'if (userInput != null && typeof userInput === "object") { processData(userInput); }',
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'invalid - typeof check on right of && without null check on left still reports',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          // The walk-up finds a LogicalExpression && ancestor, node is on the right,
          // but the left side text does NOT contain a null check for this variable —
          // so isUnsafeTypeof still returns true and a report is produced.
          {
            code: 'if (isReady && typeof userInput === "object") { processData(userInput); }',
            errors: [
              {
                messageId: 'unsafeTypeofCheck',
              },
            ],
          },
        ],
      },
    );

    ruleTester.run(
      'invalid - typeof check on left of && (not the right side) still reports',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          // The typeof BinaryExpression is the LEFT child of the enclosing `&&`,
          // so the walk-up's `current.right === child` check is false and the
          // null-check short-circuit is skipped entirely — still reported.
          {
            code: 'if (typeof userInput === "object" && isReady) { processData(userInput); }',
            errors: [
              {
                messageId: 'unsafeTypeofCheck',
              },
            ],
          },
        ],
      },
    );
  });

  describe('instanceof under allowInstanceofSameRealm: false', () => {
    ruleTester.run(
      'invalid - the option reports every instanceof, not only named ones',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          {
            code: 'if (config instanceof Array) { /* process */ }',
            options: [{ allowInstanceofSameRealm: false }],
            errors: [{ messageId: 'unsafeInstanceofUsage' }],
          },
        ],
      },
    );
  });

  describe('Loose equality - identifier on left vs right side', () => {
    ruleTester.run(
      'invalid - loose equality with user-input identifier on the left side only',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          // isLooseEqualityTypeCheck requires "null"/"undefined" text somewhere
          // in the comparison; here it comes from the right-hand `undefinedVal`
          // identifier's own text (not a literal null/undefined keyword), while
          // `left.type === 'Identifier' && isUserInput(left.name)` is what
          // satisfies the outer reporting gate's left-hand branch.
          {
            code: 'if (userInput == undefinedVal) { processData(userInput); }',
            errors: [
              {
                messageId: 'looseEqualityTypeCheck',
              },
            ],
          },
        ],
      },
    );

    ruleTester.run(
      'invalid - loose equality with user-input identifier on the right side only',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          // Same null/undefined text gate, satisfied by the left-hand
          // `undefinedVal` identifier's own text, while
          // `right.type === 'Identifier' && isUserInput(right.name)` is what
          // satisfies the outer reporting gate's right-hand branch.
          {
            code: 'if (undefinedVal == userInput) { processData(userInput); }',
            errors: [
              {
                messageId: 'looseEqualityTypeCheck',
              },
            ],
          },
        ],
      },
    );
  });

  describe('Loose equality against undefined with no user-input or null text match', () => {
    ruleTester.run(
      'valid - loose equality vs. undefined with neither side a user-input identifier is not flagged',
      noImproperTypeValidation,
      {
        valid: [
          // isLooseEqualityTypeCheck(node) is true because the right side's text
          // is "undefined", but the reporting gate itself requires either side to
          // be a user-input Identifier OR either side's text to literally
          // contain "null" — none of which hold here ("5" and "undefined" do
          // not contain "null", and neither is a user-input variable name).
          {
            code: 'if (5 == undefined) { /* noop */ }',
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Unreliable Constructor Check via BinaryExpression comparison', () => {
    ruleTester.run(
      'invalid - constructor.name used directly in a comparison',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          // data.constructor.name compared directly in a BinaryExpression (not a
          // VariableDeclarator init): exercises the BinaryExpression walk-up branch.
          {
            code: 'if (data.constructor.name === "Array") { handleArray(data); }',
            errors: [
              {
                messageId: 'unreliableConstructorCheck',
              },
            ],
          },
        ],
      },
    );

    ruleTester.run(
      'valid - constructor.name not used with assignment or comparison is not flagged',
      noImproperTypeValidation,
      {
        valid: [
          // constructor.name accessed but neither assigned to a variable nor used
          // in a BinaryExpression comparison: involvesUserInput stays false.
          {
            code: 'console.log(data.constructor.name);',
          },
        ],
        invalid: [],
      },
    );

    ruleTester.run(
      'invalid - constructor.name compared as the right-hand operand',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          // constructor.name is the RIGHT operand of the BinaryExpression this
          // time, exercising the `current.right === node` half of the walk-up's
          // comparison-detection branch (as opposed to `current.left === node`).
          {
            code: 'if ("Array" === data.constructor.name) { handleArray(data); }',
            errors: [
              {
                messageId: 'unreliableConstructorCheck',
              },
            ],
          },
        ],
      },
    );
  });

  describe('The "null" substring is not a null check', () => {
    /**
     * LOCK — `missingNullCheck` used to fire whenever the PRINTED TEXT of an
     * `if (…)` contained the substring `!= null` or `== null`. The rule's own test
     * suite documented, approvingly, that `if (something != nullinput)` satisfied it
     * because the identifier `nullinput` begins with the letters "null". Both
     * spellings below are ordinary code and both are now valid; the message itself is
     * gone, because the shape it named was the idiomatic nullish test.
     */
    ruleTester.run(
      'valid - identifiers that merely contain the letters',
      noImproperTypeValidation,
      {
        valid: [
          'if (null != userInput) { processData(userInput); }',
          'if (userInput !== null && userInput !== undefined) { processData(userInput); }',
          // The guard may come AFTER the typeof, which the left-only walk never saw.
          'if (typeof userInput === "object" && userInput !== null) { processData(userInput); }',
        ],
        invalid: [
          // Still reported — but as an honest loose comparison between two operands of
          // unknown type, NOT because `nullinput` starts with the letters "null".
          {
            code: 'if (something != nullinput) { processData(nullinput); }',
            errors: [{ messageId: 'looseEqualityTypeCheck' }],
          },
        ],
      },
    );
  });

  describe('Complex Type Validation Scenarios', () => {
    ruleTester.run(
      'complex - real-world type validation patterns',
      noImproperTypeValidation,
      {
        valid: [],
        invalid: [
          // typeof userInput === "object" triggers unsafeTypeofCheck
          {
            code: `
            function processUserData(userInput) {
              // DANGEROUS: typeof check misses null
              if (typeof userInput === "object") {
                // null would pass this check!
                Object.keys(userInput).forEach(key => {
                  processField(key, userInput[key]);
                });
              }
            }
          `,
            errors: [
              {
                messageId: 'unsafeTypeofCheck',
              },
            ],
          },
          // credentials != null triggers looseEqualityTypeCheck (null comparison)
          {
            code: `
            // Authentication bypass through type confusion
            function authenticate(credentials) {
              // DANGEROUS: loose equality allows type confusion
              if (credentials != null) {
                if (credentials.username == "admin") { // == allows string/number confusion
                  return { role: "admin" };
                }
              }
              return { role: "user" };
            }
          `,
            errors: [
              {
                messageId: 'looseEqualityTypeCheck',
              },
            ],
          },
          // A loose comparison in an authorisation decision, which is what the
          // `looseEqualityTypeCheck` message is actually about.
          {
            code: `
            function grantAccess(req) {
              // DANGEROUS: '0e0' == 0 and '0' == 0 both pass
              if (req.body.code == storedCode) {
                return { role: "admin" };
              }
              return { role: "user" };
            }
          `,
            errors: [
              {
                messageId: 'looseEqualityTypeCheck',
              },
            ],
          },
        ],
      },
    );
  });
});

/**
 * Option coverage — each block is a PAIR over identical source whose verdicts
 * disagree. Setting an option and getting the default answer back would execute the
 * line while proving nothing, so every case below has a partner it contradicts.
 */
ruleTester.run(
  'option: trustedSanitizers accepts a project validator at the sink',
  noImproperTypeValidation,
  {
    valid: [
      // The looseEqualityTypeCheck site hands the whole BinaryExpression to `isSafe`,
      // which also probes each operand: the left operand is a call to the registered
      // validator, so the comparison is treated as already type-checked.
      {
        code: 'const mismatched = assertUserShape(userInput) == 0;',
        options: [{ trustedSanitizers: ['assertUserShape'] }],
      },
    ],
    invalid: [
      // Identical source with the validator unregistered. Membership is exact — an
      // unknown wrapper name is not evidence that anything was validated.
      {
        code: 'const mismatched = assertUserShape(userInput) == 0;',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
      // Registered AND strict: strictMode makes `isSafe` return false before the
      // sanitizer list is consulted, so the same code reports again.
      {
        code: 'const mismatched = assertUserShape(userInput) == 0;',
        options: [{ trustedSanitizers: ['assertUserShape'], strictMode: true }],
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
    ],
  },
);

ruleTester.run(
  'option: trustedAnnotations extends the safe-comment vocabulary',
  noImproperTypeValidation,
  {
    valid: [
      // `@type-checked-upstream` is not one of the devkit's SAFE_ANNOTATIONS and shares
      // no substring with any of them, so it can only suppress once declared.
      {
        code: '// @type-checked-upstream\nconst mismatched = userInput == 0;',
        options: [{ trustedAnnotations: ['@type-checked-upstream'] }],
      },
    ],
    invalid: [
      // Same two lines, no declaration.
      {
        code: '// @type-checked-upstream\nconst mismatched = userInput == 0;',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
    ],
  },
);

ruleTester.run(
  'option: strictMode revokes annotation-based suppression',
  noImproperTypeValidation,
  {
    valid: [
      // `@validated` ships in SAFE_ANNOTATIONS, so this is quiet with no options at all.
      {
        code: '// @validated by the request schema\nconst mismatched = userInput == 0;',
      },
    ],
    invalid: [
      // Same source under strictMode: the annotation no longer counts, which is the
      // behaviour an audit run wants from the flag.
      {
        code: '// @validated by the request schema\nconst mismatched = userInput == 0;',
        options: [{ strictMode: true }],
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
    ],
  },
);

/**
 * Branch coverage for the structural predicates that replaced the name lists:
 * `sameExpression`, `hasNullGuard` and `primitiveTypeOf`. Each case is chosen so
 * that a DIFFERENT arm decides the verdict.
 */
describe('structural predicates', () => {
  ruleTester.run(
    'sameExpression and hasNullGuard arms',
    noImproperTypeValidation,
    {
      valid: [
        // Member chain, both sides identical — recursion through object AND property.
        'if (req.body.profile !== null && typeof req.body.profile === "object") { go(); }',
        // `this` receiver.
        'class A { m() { if (this.payload != null && typeof this.payload === "object") { go(); } } }',
        // Computed member with an identical literal key — the Literal arm.
        'if (bag["k"] !== null && typeof bag["k"] === "object") { go(); }',
        // Guard written with the nullish literal on the LEFT.
        'if (null !== payload && typeof payload === "object") { go(); }',
      ],
      invalid: [
        // Different node TYPES on the two sides: guard does not match the operand.
        {
          code: 'if (other !== null && typeof payload === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
        // Same type, different name.
        {
          code: 'if (other !== null && typeof payload.inner === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
        // Member chains that differ in `computed`.
        {
          code: 'if (bag["k"] !== null && typeof bag.k === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
        // Computed member chains with DIFFERENT literal keys.
        {
          code: 'if (bag["a"] !== null && typeof bag["b"] === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
        // A guard that is neither `!=` nor `!==`.
        {
          code: 'if (payload === undefined && typeof payload === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
        // Same node TYPE on both sides, but a kind `sameExpression` cannot compare:
        // two calls may return different values, so identity is not claimed.
        {
          code: 'if (getPayload() !== null && typeof getPayload() === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
        // A guard that compares against something that is not nullish.
        {
          code: 'if (payload !== 0 && typeof payload === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
        // Not a BinaryExpression at all in the chain.
        {
          code: 'if (isReady && typeof payload === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
        // Comparing a non-`object` string: not this rule's shape, so `!==` falls through
        // to the loose-equality arm (which does not apply) and nothing is reported.
        {
          code: 'if (typeof payload === "object") { go(); }',
          errors: [{ messageId: 'unsafeTypeofCheck' }],
        },
      ],
    },
  );

  ruleTester.run('primitiveTypeOf arms', noImproperTypeValidation, {
    valid: [
      // Template literal vs string literal.
      'if (`${a}b` == "x") { go(); }',
      // `.length` vs numeric literal.
      'if (list.length == 3) { go(); }',
      // Explicit coercions.
      'if (String(a) == "x") { go(); }',
      'if (Number(a) == 1) { go(); }',
      'if (parseInt(a, 10) == 1) { go(); }',
      // A binding whose every write is the same primitive type.
      'let mode = "a"; if (flag) { mode = "b"; } if (mode == "b") { go(); }',
    ],
    invalid: [
      // A boolean literal is neither string nor number.
      {
        code: 'if (flag == true) { go(); }',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
      // …including on the right of a provably-string left operand.
      {
        code: 'if ("a" == true) { go(); }',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
      // A call to something else proves nothing.
      {
        code: 'if (compute(a) == 1) { go(); }',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
      // A computed `.length`-looking read is not the language's `.length`.
      {
        code: 'if (list["length"] == 3) { go(); }',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
      // Mixed writes: one string, one number.
      {
        code: 'let v = "a"; if (flag) { v = 1; } if (v == "a") { go(); }',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
      // A binding with no writes at all (a parameter) proves nothing.
      {
        code: 'function f(v) { return v == 1; }',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
      // A binding that is not declared in any scope.
      {
        code: 'if (undeclaredGlobal == 1) { go(); }',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
      // Cyclic initializers must terminate and prove nothing.
      {
        code: 'var a = b; var b = a; if (a == 1) { go(); }',
        errors: [{ messageId: 'looseEqualityTypeCheck' }],
      },
    ],
  });

  ruleTester.run('constructor.name arms', noImproperTypeValidation, {
    valid: [
      // Property is not `name`.
      'const c = value.constructor.prototype;',
      // Computed access.
      'const n = value.constructor["name"];',
      // Inner property is not `constructor`.
      'if (value.proto.name === "Array") { go(); }',
      // Inner is not a MemberExpression at all.
      'if (constructor.name === "Array") { go(); }',
      // Inner is a COMPUTED member.
      'if (value["constructor"].name === "Array") { go(); }',
      // Not compared at all — passed to a call, or read into a log label.
      'logger.warn(value.constructor.name);',
      'const kind = value.constructor.name;',
    ],
    invalid: [
      {
        code: 'if ("Array" === value.constructor.name) { go(); }',
        errors: [{ messageId: 'unreliableConstructorCheck' }],
      },
    ],
  });
});

/**
 * The null guard, both ways round.
 *
 * `typeof x === 'object'` narrows on the TRUE branch, so its guard is an `&&`
 * chain. `typeof x !== 'object'` bails on the true branch, so its guard is an
 * `||` chain asserting the negation. Only the first was recognised, and the
 * second is the more common of the two in real code — it is the early return at
 * the top of a normaliser.
 *
 * Every case here is PAIRED with the same shape missing its guard, because
 * "quiet" proves nothing on a rule that could simply have stopped reporting.
 */
describe('null guards: && for the positive form, || for the negated one', () => {
  ruleTester.run('no-improper-type-validation', noImproperTypeValidation, {
    valid: [
      // mongoose lib/aggregate.js:207 — the textbook check, reported until now.
      'function f(arg) { if (typeof arg !== "object" || arg === null || Array.isArray(arg)) { return; } use(arg); }',
      // axios lib/core/AxiosError.js:34, n8n observation-log-observer.ts:303
      'function f(value) { if (value === null || typeof value !== "object") { return value; } use(value); }',
      // The same, with the operands the other way round.
      'function f(v) { if (typeof v !== "object" || v === null) { return; } use(v); }',
      // A bare truthiness test is STRICTLY STRONGER than `!== null`: it also
      // excludes undefined, 0, '' and false.
      // serverless config-schema-handler/index.js:437, knex lib/client.js:57
      'function f(value) { if (value && typeof value === "object") { use(value); } }',
      // strapi packages/admin-test-utils/src/setup.ts:56
      'function f(arg) { if (arg && typeof arg === "object" && "message" in arg) { use(arg); } }',
      // `!v` on the rejecting side is the same guard, negated.
      'function f(v) { if (!v || typeof v !== "object") { return; } use(v); }',
      // `!= null` covers null AND undefined.
      'function f(v) { if (v != null && typeof v === "object") { use(v); } }',
      // The guard may name the same member expression, not just an identifier.
      'function f(o) { if (o.cfg && typeof o.cfg === "object") { use(o.cfg); } }',
    ],
    invalid: [
      // CONTROLS. Each is the paired case above with the guard removed, or with
      // a guard that does not apply to this operand.
      {
        code: 'function f(arg) { if (typeof arg !== "object" || Array.isArray(arg)) { return; } use(arg); }',
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      {
        code: 'function f(value) { if (typeof value !== "object") { return value; } use(value); }',
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      {
        code: 'function f(value) { if (typeof value === "object") { use(value); } }',
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      // The guard names a DIFFERENT value, so it proves nothing about this one.
      {
        code: 'function f(a, b) { if (b && typeof a === "object") { use(a); } }',
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      {
        code: 'function f(o) { if (o.other && typeof o.cfg === "object") { use(o.cfg); } }',
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      // WRONG COMBINATOR. `&&` cannot guard the negated form — on the branch
      // this takes, `x` has not been excluded at all.
      {
        code: 'function f(v) { if (typeof v !== "object" && v !== null) { return; } use(v); }',
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      // ...and `||` cannot guard the positive form.
      {
        code: 'function f(v) { if (typeof v === "object" || v !== null) { use(v); } }',
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
    ],
  });
});
