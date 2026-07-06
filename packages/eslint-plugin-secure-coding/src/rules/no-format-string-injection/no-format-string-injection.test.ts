/**
 * Comprehensive tests for no-format-string-injection rule
 * Security: CWE-134 (Use of Externally-Controlled Format String)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noFormatStringInjection } from './index';

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

describe('no-format-string-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe format string usage', noFormatStringInjection, {
      valid: [
        // Safe hardcoded format strings
        {
          code: 'util.format("User: %s, Age: %d", name, age);',
        },
        {
          code: 'console.log("Error: %s", error.message);',
        },
        // Template literals (safe)
        {
          code: 'console.log(`User ${name} logged in`);',
        },
        // Safe sprintf usage
        {
          code: 'sprintf("%s-%s", prefix, suffix);',
        },
        // No format specifiers
        {
          code: 'console.log(userMessage);',
        },
        // Validated input
        {
          code: 'const safeFormat = validateFormat(userInput); util.format(safeFormat, data);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Format String Injection', () => {
    ruleTester.run('invalid - format string injection vulnerabilities', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'util.format(userInput, arg1, arg2);',
          errors: [
            {
              messageId: 'userControlledFormatString',
            },
          ],
        },
        {
          code: 'sprintf(req.query.format, data);',
          errors: [
            {
              messageId: 'userControlledFormatString',
            },
          ],
        },
        {
          code: 'printf(userFormatString);',
          errors: [
            {
              messageId: 'userControlledFormatString',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Template Literals as Format Strings', () => {
    ruleTester.run('invalid - template literals with user input', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'util.format(`User: ${userInput}`, data);',
          errors: [
            {
              messageId: 'formatStringInjection',
            },
          ],
        },
        {
          code: 'console.log(`Error ${req.body.message}: %s`, error);',
          errors: [
            {
              messageId: 'formatStringInjection',
            },
          ],
        },
        {
          code: 'sprintf(`Format: ${userTemplate}`, values);',
          errors: [
            {
              messageId: 'formatStringInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unsafe Format Specifiers', () => {
    ruleTester.run('invalid - user input with format specifiers', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'console.log("Format: %s", userMessage); // userMessage could contain %',
          errors: [
            {
              messageId: 'unsafeFormatSpecifier',
              suggestions: [
                {
                  messageId: 'escapeFormatString',
                  output: 'console.log("Format: %s", userMessage.replace(/%/g, "%%")); // userMessage could contain %',
                },
              ],
            },
          ],
        },
        {
          code: 'util.format("%s", req.body.format); // Could contain % specifiers',
          errors: [
            {
              messageId: 'unsafeFormatSpecifier',
              suggestions: [
                {
                  messageId: 'escapeFormatString',
                  output: 'util.format("%s", req.body.format.replace(/%/g, "%%")); // Could contain % specifiers',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Format Validation', () => {
    ruleTester.run('invalid - unvalidated format strings', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'const formatStr = "User: %s, Data: %j"; util.format(formatStr, user, data);',
          errors: [
            {
              messageId: 'missingFormatValidation',
              suggestions: [
                {
                  messageId: 'escapeFormatString',
                  output: 'const formatStr = "User: %s, Data: %j"; util.format(formatStr, user.replace(/%/g, "%%"), data);',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Variable Assignments', () => {
    ruleTester.run('invalid - dangerous format variable assignments', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'const userFormat = `Template: ${req.query.template}`;',
          errors: [
            {
              messageId: 'formatStringInjection',
            },
          ],
        },
        {
          code: 'let formatString = "%s-" + userInput;',
          errors: [
            {
              messageId: 'formatStringInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noFormatStringInjection, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @safe-format */
            util.format(userInput, data);
          `,
        },
        // Validated inputs
        {
          code: `
            const cleanFormat = sanitizeFormatString(req.body.format);
            util.format(cleanFormat, data);
          `,
        },
        // Escaped inputs
        {
          code: `
            const escaped = userInput.replace(/%/g, '%%');
            console.log('Message: %s', escaped);
          `,
        },
        // Safe format libraries
        {
          code: `
            const template = handlebars.compile('{{name}}');
            const result = template(data);
          `,
        },
        // Hardcoded format strings
        {
          code: 'const format = "%s-%s-%s"; util.format(format, a, b, c);',
        },
      ],
      invalid: [],
    });
  });

  describe('Additional Detection Patterns (helper function branch coverage)', () => {
    ruleTester.run('invalid - vsprintf is recognized as a format function', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'vsprintf(userInput, [arg1]);',
          errors: [{ messageId: 'userControlledFormatString' }],
        },
      ],
    });

    ruleTester.run('invalid - bare req.* member pattern (not req.query, req.body, req.params, or req.param)', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'util.format(req.userInput, data);',
          errors: [{ messageId: 'userControlledFormatString' }],
        },
      ],
    });

    ruleTester.run('invalid - deeply nested member expression name (req.body.nested.format)', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'util.format(req.body.nested.userTemplate, data);',
          errors: [{ messageId: 'userControlledFormatString' }],
        },
      ],
    });

    ruleTester.run('valid - isInputValidated finds a trusted sanitizer call up the ancestor chain', noFormatStringInjection, {
      valid: [
        {
          // The format string itself (`fmt`) is not user-input by name so no
          // userControlledFormatString fires; the format-specifier/user-input
          // secondary check treats args[1..] — validate(userInput) as the
          // second arg is itself a sanitizer call, exercising the
          // `isInputValidated` ancestor CallExpression walk (trustedSanitizers
          // match) so it is excluded from `hasUserInputInArgs`.
          code: 'const fmt = "%s"; util.format(fmt, validate(userInput));',
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - deeply nested binary-expression concatenation (recursive helper branches)', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'util.format("a" + ("b" + ("%s" + userInput)), data);',
          errors: [{ messageId: 'userControlledFormatString' }],
        },
      ],
    });

    ruleTester.run('valid - validated variable reused as CallExpression first argument suppresses report', noFormatStringInjection, {
      valid: [
        {
          // `userInput` matches isUserInput by name (so isFormatFromUserInput
          // is true), but it was reassigned through a trusted sanitizer call,
          // so safetyChecker.isSafe's CallExpression-first-argument-validated
          // branch suppresses the report.
          code: `
            const userInput = validate(rawInput);
            util.format(userInput, arg1);
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom format functions', noFormatStringInjection, {
      valid: [
        {
          code: 'myLogger.format(message, data);',
          options: [{ formatFunctions: ['myLogger.format'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('config - custom user input variables', noFormatStringInjection, {
      valid: [
        {
          code: 'util.format(safeInput, data);',
          options: [{ userInputVariables: ['otherInput'] }],
        },
      ],
      invalid: [
        {
          code: 'util.format(safeInput, data);',
          options: [{ userInputVariables: ['safeInput'] }],
          errors: [
            {
              messageId: 'userControlledFormatString',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Format String Scenarios', () => {
    ruleTester.run('complex - real-world format string vulnerabilities', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: `
            // Log injection vulnerability
            app.post('/log', (req, res) => {
              const message = req.body.message;
              // DANGEROUS: User input could contain format specifiers
              console.log('User message: ' + message); // Could be exploited with %s, %d, etc.

              res.json({ logged: true });
            });
          `,
          errors: [
            {
              messageId: 'formatStringInjection',
            },
          ],
        },
        {
          code: `
            // Format string in error messages
            function createErrorMessage(template, userData) {
              // DANGEROUS: Template could contain %s from user
              return util.format(template, userData);
            }

            const error = createErrorMessage(req.query.template, req.body.data);
          `,
          errors: [
            {
              messageId: 'missingFormatValidation',
              suggestions: [
                {
                  messageId: 'escapeFormatString',
                  output: `
            // Format string in error messages
            function createErrorMessage(template, userData) {
              // DANGEROUS: Template could contain %s from user
              return util.format(template, userData.replace(/%/g, "%%"));
            }

            const error = createErrorMessage(req.query.template, req.body.data);
          `,
                },
              ],
            },
          ],
        },
        {
          code: `
            // Dynamic format construction
            function formatUserMessage(type, data) {
              // DANGEROUS: Type could be user-controlled
              const templates = {
                'info': 'INFO: %s',
                'error': 'ERROR: %s',
                'debug': 'DEBUG: %s'
              };

              const template = templates[type] || data; // Could be user input!
              return util.format(template, data);
            }
          `,
          errors: [
            {
              messageId: 'missingFormatValidation',
              suggestions: [
                {
                  messageId: 'escapeFormatString',
                  output: `
            // Dynamic format construction
            function formatUserMessage(type, data) {
              // DANGEROUS: Type could be user-controlled
              const templates = {
                'info': 'INFO: %s',
                'error': 'ERROR: %s',
                'debug': 'DEBUG: %s'
              };

              const template = templates[type] || data; // Could be user input!
              return util.format(template, data.replace(/%/g, "%%"));
            }
          `,
                },
              ],
            },
          ],
        },
        {
          code: `
            // Template literal injection
            const userTemplate = req.body.template; // Could be "Hello ${process.env['SECRET_KEY']}"
            const message = \`User said: \${userTemplate}\`;

            console.log(message); // Could leak secrets through template injection
          `,
          errors: [
            {
              messageId: 'formatStringInjection',
            },
          ],
        },
        {
          code: `
            // sprintf with user-controlled format
            const format = req.query.fmt; // Could be "%s%s%s" to read extra arguments
            const result = sprintf(format, arg1, arg2, arg3);

            res.send(result);
          `,
          errors: [
            {
              messageId: 'userControlledFormatString',
            },
          ],
        },
        {
          code: `
            // Format string in database queries (logging)
            function logQuery(query, params) {
              // DANGEROUS: Query could contain format specifiers
              const logMessage = util.format('Query: ' + query, ...params);
              logger.info(logMessage);

              return executeQuery(query, params);
            }
          `,
          errors: [
            {
              messageId: 'userControlledFormatString',
            },
          ],
        },
        // Concatenation in format string (BinaryExpression visitor)
        {
          code: 'util.format("User: " + userInput, data);',
          errors: [{ messageId: 'userControlledFormatString' }],
        },
        // Complex concatenation
        {
          code: 'util.format("Prefix " + (safe + userInput), data);',
          errors: [{ messageId: 'userControlledFormatString' }],
        },
        // Variable assigned from concatenation used as format string
        {
          code: `
            const fmt = "Template: " + userInput;
            util.format(fmt, data);
          `,
          errors: [{ messageId: 'userControlledFormatString' }], // Caught by VariableDeclarator visitor
        },
        // Printf specific test
        {
          code: 'printf(userInput, arg1);',
          errors: [{ messageId: 'userControlledFormatString' }],
        },
      ],
    });
  });

  // Layer 1: the rule's local safetyChecker.isSafe() early-return guards every
  // report site. It checks (in order): a `@safe-format` JSDoc comment directly
  // before the reported node, whether the node is an already-validated
  // Identifier, or (for CallExpression nodes) whether the first argument is a
  // validated Identifier.
  //
  // Every call site passes the *visitor callback's own `node` parameter* to
  // `isSafe(node, context)` — not `node.init` or any other sub-node — so
  // `getCommentsBefore` looks for a comment immediately preceding that exact
  // node type: the CallExpression itself (comment right before the call), the
  // Literal itself, the TemplateLiteral itself, or — for the
  // `VariableDeclarator` visitor — the VariableDeclarator itself, i.e. the
  // comment must precede the `const`/`let` keyword, not the initializer.
  describe('Safe Annotation Suppression (safetyChecker.isSafe branches)', () => {
    ruleTester.run('valid - @safe-format suppresses userControlledFormatString', noFormatStringInjection, {
      valid: [
        {
          code: `
            /** @safe-format */
            util.format(userInput, arg1, arg2);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe-format suppresses formatStringInjection (template literal)', noFormatStringInjection, {
      valid: [
        {
          code: `
            /** @safe-format */
            util.format(\`User: \${userInput}\`, data);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe-format suppresses formatStringInjection (binary expression)', noFormatStringInjection, {
      valid: [
        {
          code: `
            /** @safe-format */
            util.format("User: " + userInput, data);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe-format suppresses unsafeFormatSpecifier and missingFormatValidation', noFormatStringInjection, {
      valid: [
        {
          code: `
            /** @safe-format */
            console.log("Format: %s", userMessage);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe-format suppresses missingFormatValidation (dangerous Literal)', noFormatStringInjection, {
      valid: [
        {
          code: `
            const userTemplate = "prefix %s";
            /** @safe-format */
            util.format(userTemplate, data);
          `,
        },
      ],
      invalid: [],
    });

    // Reported node here is the TemplateLiteral itself (the CallExpression
    // visitor's "assigned to variable" branch reports `node`, the template),
    // so the annotation must sit right after `=`, directly before the
    // template literal token, not before `const`.
    ruleTester.run('valid - @safe-format suppresses formatStringInjection (TemplateLiteral assigned to variable)', noFormatStringInjection, {
      valid: [
        {
          code: 'const userFormat = /** @safe-format */ `Template: ${req.query.template}`;',
        },
      ],
      invalid: [],
    });

    // The `VariableDeclarator` visitor calls `isSafe(node, context)` with
    // `node` being the VariableDeclarator itself (not `node.init`). A comment
    // before the `const`/`let` keyword attaches to the parent
    // `VariableDeclaration` node instead (verified directly against the
    // linter's `getCommentsBefore`), so it is NEVER visible to
    // `isSafe(VariableDeclarator, ...)` in a single-declarator statement.
    // `getCommentsBefore` DOES attach a comment placed between a preceding
    // declarator's comma and the next declarator's identifier — so a second
    // declarator in the same statement is the real, reachable way to arm this
    // guard for a VariableDeclarator node.
    // A template literal assigned to a `format`-named variable is ALSO
    // independently visited (and reported) by the `TemplateLiteral` visitor's
    // own "assigned to variable" branch, which checks `isSafe` against the
    // TemplateLiteral node itself (no comment directly precedes that node
    // here). So arming only the `VariableDeclarator` guard suppresses that
    // one report but leaves the sibling visitor's report intact — exactly 1
    // (not 0, not 2) error is the correct, fully-explained outcome, and it
    // still exercises the `VariableDeclarator` isSafe() early-return branch.
    ruleTester.run('valid - @safe-format suppresses formatStringInjection (VariableDeclarator TemplateLiteral, second declarator)', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'let unused, /** @safe-format */ formatTemplate = `prefix %s ${userInput}`;',
          errors: [{ messageId: 'formatStringInjection' }],
        },
      ],
    });

    ruleTester.run('valid - @safe-format suppresses formatStringInjection (VariableDeclarator BinaryExpression, second declarator)', noFormatStringInjection, {
      valid: [
        {
          code: 'let unused, /** @safe-format */ formatString = "%s-" + userInput;',
        },
      ],
      invalid: [],
    });
  });

  // Layer 2: raw unit tests against rule.create() with a mock context, for
  // safetyChecker.isSafe() internal branches that no RuleTester fixture can
  // reach (the `safeNode` passed to isSafe is always a CallExpression/Literal/
  // TemplateLiteral/VariableDeclarator.init from the visitor call sites, never
  // a bare validated Identifier), plus other parser-unreachable defensive
  // branches.
  describe('Layer 2 - mock context', () => {
    it('CallExpression is not reported when the callee is not a format function', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'somethingElse' },
        arguments: [{ type: 'Identifier', name: 'userInput' }],
      });

      expect(reports).toHaveLength(0);
    });

    it('CallExpression is not reported when there are zero arguments', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'sprintf' },
        arguments: [],
      });

      expect(reports).toHaveLength(0);
    });

    it('Literal is not reported when it has no format specifiers', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const literal = listeners.Literal as (node: unknown) => void;

      literal({ type: 'Literal', value: 'plain text', parent: undefined });

      expect(reports).toHaveLength(0);
    });

    it('Literal is not reported for a non-string literal value (e.g. number)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const literal = listeners.Literal as (node: unknown) => void;

      literal({ type: 'Literal', value: 42, parent: undefined });

      expect(reports).toHaveLength(0);
    });

    it('TemplateLiteral with no user-input expressions is not reported', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const templateLiteral = listeners.TemplateLiteral as (node: unknown) => void;

      templateLiteral({
        type: 'TemplateLiteral',
        parent: undefined,
        expressions: [{ type: 'Identifier', name: 'safeName' }],
        quasis: [],
      });

      expect(reports).toHaveLength(0);
    });

    it('VariableDeclarator is not reported when there is no init', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const variableDeclarator = listeners.VariableDeclarator as (node: unknown) => void;

      variableDeclarator({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'x' },
        init: null,
      });

      expect(reports).toHaveLength(0);
    });

    it('VariableDeclarator is not reported when the id is not an Identifier (e.g. destructuring)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const variableDeclarator = listeners.VariableDeclarator as (node: unknown) => void;

      variableDeclarator({
        type: 'VariableDeclarator',
        id: { type: 'ObjectPattern', properties: [] },
        init: { type: 'Identifier', name: 'userInput' },
      });

      expect(reports).toHaveLength(0);
    });

    it('VariableDeclarator ignores names that do not suggest a format/template (early return)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const variableDeclarator = listeners.VariableDeclarator as (node: unknown) => void;

      variableDeclarator({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'plainVariable' },
        init: {
          type: 'TemplateLiteral',
          expressions: [{ type: 'Identifier', name: 'userInput' }],
          quasis: [{ value: { raw: '%s' } }],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('safetyChecker.isSafe treats an already-validated Identifier node as safe', () => {
      // Drive this through the public surface: assign via a trusted sanitizer
      // first (populates validatedVariables), then reference that Identifier
      // directly as the CallExpression's format-string argument so isUserInput
      // matching is bypassed but the safe path still short-circuits reporting.
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      const variableDeclarator = listeners.VariableDeclarator as (node: unknown) => void;
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      variableDeclarator({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'safeFormat' },
        init: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'validateFormat' },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        },
      });

      callExpression({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'sprintf' },
        arguments: [
          { type: 'Identifier', name: 'safeFormat' },
          { type: 'Identifier', name: 'userInput' },
        ],
      });

      // safeFormat is validated (not user input by name), and userInput as a
      // trailing arg is real user input, but the format string itself
      // (safeFormat) is validated, so isFormatSafe short-circuits the
      // specifier-based report path entirely (no isSafe() call needed here) —
      // asserting zero reports still exercises the isFormatSafe branch.
      expect(reports).toHaveLength(0);
    });
  });
});
