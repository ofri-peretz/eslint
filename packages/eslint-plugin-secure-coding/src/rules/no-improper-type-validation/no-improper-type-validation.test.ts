/**
 * Comprehensive tests for no-improper-type-validation rule
 * Security: CWE-1287 (Improper Validation of Specified Type of Input)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
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
    ruleTester.run('invalid - unsafe instanceof usage', noImproperTypeValidation, {
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
    });
  });

  describe('Invalid Code - Loose Equality Type Checks', () => {
    ruleTester.run('invalid - loose equality for types', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // Loose equality with null on user input variable - triggers both messages
        // IfStatement reports missingNullCheck, BinaryExpression reports looseEqualityTypeCheck
        {
          code: 'if (input != null) { processInput(input); }',
          errors: [
            {
              messageId: 'missingNullCheck',
            },
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
        // Loose equality with null (always flagged due to null comparison)
        {
          code: 'if (userData == null) { return; }',
          errors: [
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Null Checks', () => {
    ruleTester.run('invalid - missing null checks', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // userInput is a user input variable - reports missingNullCheck first (IfStatement),
        // then looseEqualityTypeCheck (BinaryExpression)
        {
          code: 'if (userInput != null) { processData(userInput); }',
          errors: [
            {
              messageId: 'missingNullCheck',
            },
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
        // req.body involves user input variable - only reports looseEqualityTypeCheck
        // because req.body as MemberExpression doesn't trigger missingNullCheck
        {
          code: 'if (req.body == null) { return; }',
          errors: [
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unreliable Constructor Checks', () => {
    ruleTester.run('invalid - unreliable constructor checks', noImproperTypeValidation, {
      valid: [],
      invalid: [
        {
          code: 'const type = userInput.constructor.name;',
          errors: [
            {
              messageId: 'unreliableConstructorCheck',
            },
          ],
        },
        {
          code: 'if (data.constructor.name === "Array") { handleArray(data); }',
          errors: [
            {
              messageId: 'unreliableConstructorCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Improper Type Validation', () => {
    ruleTester.run('invalid - improper type validation patterns', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // typeof userInput === "object" - unsafe typeof check on user input
        {
          code: 'const type = typeof userInput === "object";',
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noImproperTypeValidation, {
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
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom user input variables', noImproperTypeValidation, {
      valid: [
        // otherInput is NOT in userInputVariables, so it's not flagged
        {
          code: 'if (typeof otherInput === "object") { /* process */ }',
          options: [{ userInputVariables: ['customInput'] }],
        },
      ],
      invalid: [
        // customInput IS in userInputVariables, so it's flagged
        {
          code: 'if (typeof customInput === "object") { /* process */ }',
          options: [{ userInputVariables: ['customInput'] }],
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - disable instanceof checks', noImproperTypeValidation, {
      valid: [],
      invalid: [
        {
          code: 'if (data instanceof Array) { /* process */ }',
          options: [{ allowInstanceofSameRealm: false }],
          errors: [
            {
              messageId: 'unsafeInstanceofUsage',
            },
          ],
        },
      ],
    });
  });

  describe('Safe JSDoc Annotations - safetyChecker.isSafe branches', () => {
    ruleTester.run('valid - @validated annotation suppresses unsafeTypeofCheck', noImproperTypeValidation, {
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
    });

    ruleTester.run('valid - @sanitized annotation suppresses looseEqualityTypeCheck', noImproperTypeValidation, {
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
    });

    ruleTester.run('valid - @trusted annotation suppresses unreliableConstructorCheck', noImproperTypeValidation, {
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
    });

    ruleTester.run('valid - @safe annotation suppresses truthiness improperTypeValidation', noImproperTypeValidation, {
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
    });

    ruleTester.run('valid - @escaped annotation suppresses missingNullCheck', noImproperTypeValidation, {
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
    });

    ruleTester.run('valid - @verified annotation suppresses looseEqualityTypeCheck (BinaryExpression handler)', noImproperTypeValidation, {
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
    });
  });

  describe('Truthiness Check on User Input', () => {
    ruleTester.run('invalid - implicit truthiness check on user input', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // Bare identifier truthiness check on a user-input variable:
        // IfStatement handler, test.type === 'Identifier' && isUserInput(...) branch.
        {
          code: 'if (userInput) { processData(userInput); }',
          errors: [
            {
              messageId: 'improperTypeValidation',
            },
          ],
        },
      ],
    });

    ruleTester.run('valid - truthiness check on non-user-input identifier is not flagged', noImproperTypeValidation, {
      valid: [
        // Identifier truthiness check on a variable that is NOT user input:
        // exercises the false branch of isUserInput(test.name).
        {
          code: 'if (isReady) { doSomething(); }',
        },
      ],
      invalid: [],
    });
  });

  describe('typeof Check on MemberExpression User Input', () => {
    ruleTester.run('invalid - typeof check on member expression user input', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // typeof req.body === "object": left.argument is a MemberExpression whose
        // object is a user-input Identifier (matchesUserInput MemberExpression branch).
        {
          code: 'if (typeof req.body === "object") { processData(req.body); }',
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('valid - typeof check on non-user-input member expression is not flagged', noImproperTypeValidation, {
      valid: [
        // MemberExpression argument whose object is NOT user input: exercises
        // the false branch of the MemberExpression matchesUserInput check.
        {
          code: 'if (typeof config.settings === "object") { /* process */ }',
        },
      ],
      invalid: [],
    });
  });

  describe('Null-check-aware typeof walk-up', () => {
    ruleTester.run('valid - null check on left of && suppresses unsafeTypeofCheck (!==)', noImproperTypeValidation, {
      valid: [
        // userInput !== null && typeof userInput === "object": walks up to the
        // enclosing LogicalExpression, finds the null check on the left side of
        // `&&`, and returns false (no report) via the "!== null" text match.
        {
          code: 'if (userInput !== null && typeof userInput === "object") { processData(userInput); }',
        },
      ],
      invalid: [],
    });

    ruleTester.run('mixed - null check on left of && suppresses unsafeTypeofCheck but its own loose equality is still flagged (!=)', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // Same walk-up (using the loose "!= null" text form) suppresses the
        // unsafeTypeofCheck report on the right side of `&&`, but the left
        // side `userInput != null` is itself a loose-equality null comparison
        // on a user-input variable, so looseEqualityTypeCheck still fires once.
        {
          code: 'if (userInput != null && typeof userInput === "object") { processData(userInput); }',
          errors: [
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - typeof check on right of && without null check on left still reports', noImproperTypeValidation, {
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
    });

    ruleTester.run('invalid - typeof check on left of && (not the right side) still reports', noImproperTypeValidation, {
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
    });
  });

  describe('instanceof usage - non-user-input left side', () => {
    ruleTester.run('valid - instanceof on non-user-input identifier is not flagged', noImproperTypeValidation, {
      valid: [
        // instanceof usage where isUnsafeInstanceof(node) is true (strict mode
        // via allowInstanceofSameRealm: false) but the left side is NOT a
        // user-input identifier: exercises the false branch of
        // `left.type === 'Identifier' && isUserInput(left.name)`.
        {
          code: 'if (config instanceof Array) { /* process */ }',
          options: [{ allowInstanceofSameRealm: false }],
        },
      ],
      invalid: [],
    });
  });

  describe('Loose equality - identifier on left vs right side', () => {
    ruleTester.run('invalid - loose equality with user-input identifier on the left side only', noImproperTypeValidation, {
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
    });

    ruleTester.run('invalid - loose equality with user-input identifier on the right side only', noImproperTypeValidation, {
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
    });
  });

  describe('Loose equality against undefined with no user-input or null text match', () => {
    ruleTester.run('valid - loose equality vs. undefined with neither side a user-input identifier is not flagged', noImproperTypeValidation, {
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
    });
  });

  describe('Unreliable Constructor Check via BinaryExpression comparison', () => {
    ruleTester.run('invalid - constructor.name used directly in a comparison', noImproperTypeValidation, {
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
    });

    ruleTester.run('valid - constructor.name not used with assignment or comparison is not flagged', noImproperTypeValidation, {
      valid: [
        // constructor.name accessed but neither assigned to a variable nor used
        // in a BinaryExpression comparison: involvesUserInput stays false.
        {
          code: 'console.log(data.constructor.name);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - constructor.name compared as the right-hand operand', noImproperTypeValidation, {
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
    });
  });

  describe('Missing Null Check - right-side user input, undefined already present', () => {
    ruleTester.run('invalid - user input on right side of null comparison', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // isUserInput matches on the right-hand identifier of the comparison
        // rather than the left (test.right.type === 'Identifier' branch in the
        // BinaryExpression handler's isLooseEqualityTypeCheck report). The
        // missingNullCheck IfStatement branch requires the literal text "!= null"
        // (in that order), which "null != userInput" does not contain, so only
        // looseEqualityTypeCheck fires here.
        {
          code: 'if (null != userInput) { processData(userInput); }',
          errors: [
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
        // `nullinput` is a user-input variable name (contains the exact,
        // case-sensitive substring "input") whose own identifier text begins
        // with "null", so the comparison text "something != nullinput"
        // contains the literal substring "!= null" needed by the
        // missingNullCheck IfStatement gate, while `test.right` (not
        // `test.left`) is the matching user-input Identifier — exercising the
        // `test.right.type === 'Identifier' && isUserInput(...)` branch.
        {
          code: 'if (something != nullinput) { processData(nullinput); }',
          errors: [
            {
              messageId: 'missingNullCheck',
            },
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('valid - null check already includes undefined check is not flagged as missingNullCheck', noImproperTypeValidation, {
      valid: [
        // testText already includes "!== undefined", so the missingNullCheck
        // IfStatement branch is skipped (though looseEqualityTypeCheck may still
        // apply to the "== null"/"!= null" text depending on operators used).
        {
          code: 'if (userInput !== null && userInput !== undefined) { processData(userInput); }',
        },
      ],
      invalid: [],
    });
  });

  describe('Layer 2 - synthetic nodes without loc (mock context)', () => {
    // NOTE: `typeof` is a reserved word, so `typeof(value)` always parses as a
    // UnaryExpression (the parens are just a grouping expression around
    // `value`), never as a CallExpression with an Identifier callee named
    // "typeof" — that shape cannot be produced by any real parser. The
    // CallExpression handler's `callee.name === 'typeof'` branch is exercised
    // below via a synthetic AST node instead.
    it('unsafeTypeofCheck report falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noImproperTypeValidation, {
        options: [{}],
      });

      const typeofArg = { type: 'Identifier', name: 'userInput' };
      const unaryTypeof = {
        type: 'UnaryExpression',
        operator: 'typeof',
        argument: typeofArg,
        parent: undefined,
      };
      const node = {
        type: 'BinaryExpression',
        operator: '===',
        left: unaryTypeof,
        right: { type: 'Literal', value: 'object' },
        loc: undefined,
        parent: undefined,
      };
      unaryTypeof.parent = node;

      (listeners['BinaryExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('unsafeTypeofCheck');
      expect(reports[0].data?.line).toBe('0');
    });

    it('unsafeInstanceofUsage report falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noImproperTypeValidation, {
        options: [{ allowInstanceofSameRealm: false }],
      });

      const node = {
        type: 'BinaryExpression',
        operator: 'instanceof',
        left: { type: 'Identifier', name: 'userInput' },
        right: { type: 'Identifier', name: 'Array' },
        loc: undefined,
        parent: undefined,
      };

      (listeners['BinaryExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('unsafeInstanceofUsage');
      expect(reports[0].data?.line).toBe('0');
    });

    it('looseEqualityTypeCheck report falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noImproperTypeValidation, {
        options: [{}],
        sourceText: 'userInput == null',
      });

      const node = {
        type: 'BinaryExpression',
        operator: '==',
        left: { type: 'Identifier', name: 'userInput' },
        right: { type: 'Literal', value: null, raw: 'null' },
        loc: undefined,
        parent: undefined,
      };

      (listeners['BinaryExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('looseEqualityTypeCheck');
      expect(reports[0].data?.line).toBe('0');
    });

    it('unreliableConstructorCheck report falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noImproperTypeValidation, {
        options: [{}],
      });

      const constructorMember = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'userInput' },
        property: { type: 'Identifier', name: 'constructor' },
      };
      const node = {
        type: 'MemberExpression',
        object: constructorMember,
        property: { type: 'Identifier', name: 'name' },
        loc: undefined,
        parent: undefined,
      };
      const declarator = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'type' },
        init: node,
        parent: undefined,
      };
      node.parent = declarator;

      (listeners['MemberExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('unreliableConstructorCheck');
      expect(reports[0].data?.line).toBe('0');
    });

    it('improperTypeValidation (CallExpression) report falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noImproperTypeValidation, {
        options: [{}],
      });

      const node = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'typeof' },
        arguments: [{ type: 'Identifier', name: 'value' }],
        loc: undefined,
        parent: undefined,
      };

      (listeners['CallExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('improperTypeValidation');
      expect(reports[0].data?.line).toBe('0');
    });

    it('improperTypeValidation (truthiness IfStatement) report falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noImproperTypeValidation, {
        options: [{}],
      });

      const test = { type: 'Identifier', name: 'userInput' };
      const node = {
        type: 'IfStatement',
        test,
        consequent: { type: 'BlockStatement', body: [] },
        loc: undefined,
        parent: undefined,
      };

      (listeners['IfStatement'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('improperTypeValidation');
      expect(reports[0].data?.line).toBe('0');
    });

    it('missingNullCheck report falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noImproperTypeValidation, {
        options: [{}],
        sourceText: 'userInput != null',
      });

      const test = {
        type: 'BinaryExpression',
        operator: '!=',
        left: { type: 'Identifier', name: 'userInput' },
        right: { type: 'Literal', value: null, raw: 'null' },
      };
      const node = {
        type: 'IfStatement',
        test,
        consequent: { type: 'BlockStatement', body: [] },
        loc: undefined,
        parent: undefined,
      };

      (listeners['IfStatement'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingNullCheck');
      expect(reports[0].data?.line).toBe('0');
    });
  });

  describe('Complex Type Validation Scenarios', () => {
    ruleTester.run('complex - real-world type validation patterns', noImproperTypeValidation, {
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
        // input != null triggers missingNullCheck (IfStatement) first,
        // then looseEqualityTypeCheck (BinaryExpression)
        {
          code: `
            // Incomplete type validation
            function validateAndProcess(input) {
              // DANGEROUS: only checks != null, misses undefined
              if (input != null) {
                if (typeof input === "string") {
                  processString(input);
                } else if (Array.isArray(input)) {
                  processArray(input);
                }
                // undefined would pass != null check but cause issues
              }
            }
          `,
          errors: [
            {
              messageId: 'missingNullCheck',
            },
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
      ],
    });
  });
});
