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

  describe('Coverage - branch gaps', () => {
    // ── getMemberExpressionName ──────────────────────────────────────────────

    // id 15 arm[1]: computed property on Identifier object → getMemberExpressionName returns ''
    ruleTester.run('coverage - computed property on Identifier object', noFormatStringInjection, {
      valid: [{ code: 'util.format("User: %s", config["format"])' }],
      invalid: [],
    });

    // id 16 arm[1]: object is CallExpression (neither Identifier nor MemberExpression)
    ruleTester.run('coverage - CallExpression object in member expr', noFormatStringInjection, {
      valid: [{ code: 'util.format("User: %s", getConfig().format)' }],
      invalid: [],
    });

    // ids 16 arm[0] + 17 arm[0]: nested MemberExpression with Identifier property
    ruleTester.run('coverage - nested MemberExpression Identifier property', noFormatStringInjection, {
      valid: [{ code: 'util.format("User: %s", service.config.format)' }],
      invalid: [],
    });

    // id 17 arm[1]: nested MemberExpression with computed property → returns ''
    ruleTester.run('coverage - nested MemberExpression computed property', noFormatStringInjection, {
      valid: [{ code: 'util.format("User: %s", service.config["format"])' }],
      invalid: [],
    });

    // ── isInputValidated ─────────────────────────────────────────────────────

    // id 27 arm[0]: trusted sanitizer IS the format arg node itself (not an ancestor)
    ruleTester.run('coverage - isInputValidated: sanitizer is the direct format arg', noFormatStringInjection, {
      valid: [{ code: 'util.format(sanitize(userMessage), value)' }],
      invalid: [],
    });

    // ── containsFormatSpecifiersInExpression / hasUserInputInExpression ──────
    // Called from the VariableDeclarator handler for BinaryExpression inits.

    // id 32 arm[0], id 33 arm[2], id 38 arm[0]: right is Literal string with specifier; left is user input
    ruleTester.run('coverage - VarDecl BinaryExpr right Literal has specifier', noFormatStringInjection, {
      valid: [],
      invalid: [{ code: 'let formatStr = userInput + "%s"', errors: [{ messageId: 'formatStringInjection' }] }],
    });

    // id 33 arm[1]: right is Literal but non-string (number) — typeof check short-circuits
    ruleTester.run('coverage - VarDecl BinaryExpr right is numeric literal', noFormatStringInjection, {
      valid: [{ code: 'let formatStr = userInput + 42' }],
      invalid: [],
    });

    // ids 34 arm[0], 35 arm[1]: left IS BinaryExpression WITH specifiers
    ruleTester.run('coverage - VarDecl BinaryExpr nested left has specifier', noFormatStringInjection, {
      valid: [],
      invalid: [{ code: 'let formatStr = ("safe" + "%s") + userInput', errors: [{ messageId: 'formatStringInjection' }] }],
    });

    // ids 36 arm[0], 37 arm[1]: right IS BinaryExpression WITH specifiers
    ruleTester.run('coverage - VarDecl BinaryExpr nested right has specifier', noFormatStringInjection, {
      valid: [],
      invalid: [{ code: 'let formatStr = userInput + ("static" + "%s")', errors: [{ messageId: 'formatStringInjection' }] }],
    });

    // id 42 arm[1]: right IS BinaryExpression but no user input inside
    ruleTester.run('coverage - VarDecl BinaryExpr nested right has no user input', noFormatStringInjection, {
      valid: [{ code: 'let formatStr = "%s" + ("static" + "text")' }],
      invalid: [],
    });

    // ids 40 arm[0], 41 arm[1]: left IS BinaryExpression WITH user input inside
    ruleTester.run('coverage - VarDecl BinaryExpr nested left contains user input', noFormatStringInjection, {
      valid: [],
      invalid: [{ code: 'let formatStr = (userInput + "prefix") + "%s"', errors: [{ messageId: 'formatStringInjection' }] }],
    });

    // ── CallExpression handler ───────────────────────────────────────────────

    // id 66 arm[1]: Identifier format arg whose name doesn't include format/template/pattern
    ruleTester.run('coverage - Identifier format arg without format-hint name', noFormatStringInjection, {
      valid: [{ code: 'util.format(myVar, req.body.value)' }],
      invalid: [],
    });

    // id 70 arm[0]: console method with non-format-hint Identifier → don't report
    ruleTester.run('coverage - console.log with non-format Identifier is silent', noFormatStringInjection, {
      valid: [{ code: 'console.log(myVar, req.body.value)' }],
      invalid: [],
    });

    // ── Literal handler ──────────────────────────────────────────────────────

    // ids 80 arm[3], 81 arm[1], 82 arm[1], 86 arm[0], 93 arm[1]:
    // Literal with specifier is the right side of a + assigned to user-input-named var,
    // but it's NOT in a format-function call position → isInDangerousContext=FALSE → no report
    ruleTester.run('coverage - Literal in BinaryExpression assigned to req var, not dangerous', noFormatStringInjection, {
      valid: [{ code: 'const req = "User: " + "%s"' }],
      invalid: [],
    });

    // ids 86 arm[0], 90 arm[0], 92 arm[0], 94 arm[1], 95 arm[0]:
    // Literal inside format-function call, outer var name is user-input-like → report
    ruleTester.run('coverage - Literal inside format-call assigned to req-named var', noFormatStringInjection, {
      valid: [],
      invalid: [{ code: 'const req = sprintf("%s value", "static")', errors: [{ messageId: 'missingFormatValidation' }] }],
    });

    // id 94 arm[0]: @safe-format directly before the Literal suppresses the Literal-handler report
    ruleTester.run('coverage - @safe-format before Literal inside format call', noFormatStringInjection, {
      valid: [{ code: 'const req = sprintf(/** @safe-format */ "%s value", "static")' }],
      invalid: [],
    });

    // ── BinaryExpression else-if block (console-method path) ────────────────

    // Branch 57 arm 1: else-if entered but no user input in BinaryExpression
    ruleTester.run('coverage - BinaryExpression else-if: no user input in expression', noFormatStringInjection, {
      valid: [{ code: 'util.format("prefix: " + staticSuffix, data)' }],
      invalid: [],
    });

    // Branch 58 arm 0: @safe-format suppresses BinaryExpression else-if report (console path)
    ruleTester.run('coverage - @safe-format suppresses BinaryExpression console.log', noFormatStringInjection, {
      valid: [
        {
          code: `
            const message = req.body.message;
            /** @safe-format */ console.log('User: ' + message);
          `,
        },
      ],
      invalid: [],
    });

    // Branch 66 arm 1: firstArg is a Literal string without format specifiers
    ruleTester.run('coverage - Literal firstArg without format specifiers', noFormatStringInjection, {
      valid: [{ code: 'util.format("nospecifiers", req.body.value)' }],
      invalid: [],
    });

    // ── TemplateLiteral handler ──────────────────────────────────────────────

    // ids 98 arm[1], 103 arm[1]: TemplateLiteral is NOT args[0] of format call AND
    // is NOT assigned to a variable → neither isFormatString nor isAssignedToVariable fires
    ruleTester.run('coverage - TemplateLiteral as non-first format-call arg', noFormatStringInjection, {
      valid: [{ code: 'util.format("static %s", `${req.body.value}`)' }],
      invalid: [],
    });

    // id 117 arm[1]: TemplateLiteral has user input but NO format specifiers → VarDecl handler silent
    // (TemplateLiteral visitor still reports because hasUserInput=TRUE & isAssignedToVariable=TRUE)
    ruleTester.run('coverage - VarDecl TemplateLiteral: user input but no specifiers', noFormatStringInjection, {
      valid: [],
      invalid: [{ code: 'const formatStr = `${req.body.value}`', errors: [{ messageId: 'formatStringInjection' }] }],
    });

    // id 118 arm[0]: VarDecl TemplateLiteral with specifiers + user input → both visitors report
    ruleTester.run('coverage - VarDecl TemplateLiteral: specifiers + user input → both visitors report', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'const formatStr = `%s: ${req.body.value}`',
          errors: [{ messageId: 'formatStringInjection' }, { messageId: 'formatStringInjection' }],
        },
      ],
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

    // ── ?? 0 fallback paths (no loc on node) ────────────────────────────────

    it('id 59: loc-fallback for BinaryExpression console-method path (no loc on CallExpression)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      // First prime dangerousVariables with 'message' via VariableDeclarator
      (listeners.VariableDeclarator as (n: unknown) => void)({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'message' },
        init: {
          type: 'MemberExpression',
          object: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'req' },
            property: { type: 'Identifier', name: 'body' },
            computed: false,
          },
          property: { type: 'Identifier', name: 'message' },
          computed: false,
        },
      });
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'console' },
          property: { type: 'Identifier', name: 'log' },
          computed: false,
        },
        arguments: [
          {
            type: 'BinaryExpression',
            operator: '+',
            left: { type: 'Literal', value: 'User: ' },
            right: { type: 'Identifier', name: 'message' },
          },
        ],
        // no loc → ?? 0
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('id 50: loc-fallback for userControlledFormatString (no loc on CallExpression)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'sprintf' },
        arguments: [
          { type: 'Identifier', name: 'userInput' },
          { type: 'Identifier', name: 'value' },
        ],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('id 54: loc-fallback for TemplateLiteral formatArg (no loc on CallExpression)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'sprintf' },
        arguments: [
          {
            type: 'TemplateLiteral',
            expressions: [{ type: 'Identifier', name: 'userInput' }],
            quasis: [{ value: { raw: '' } }, { value: { raw: '' } }],
          },
        ],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('id 76: loc-fallback for unsafeFormatSpecifier report (no loc on CallExpression)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'sprintf' },
        arguments: [
          { type: 'Literal', value: '%s', raw: '"%s"' },
          { type: 'Identifier', name: 'userInput' },
        ],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('id 95: loc-fallback for missingFormatValidation in Literal handler (no loc on Literal)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);

      const callExpr: Record<string, unknown> = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'sprintf' },
        arguments: [],
      };
      const varDecl: Record<string, unknown> = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'req' },
        init: callExpr,
        parent: undefined,
      };
      callExpr.parent = varDecl;
      const literal: Record<string, unknown> = {
        type: 'Literal',
        value: '%s value',
        parent: callExpr,
      };
      (callExpr.arguments as unknown[]).push(literal);

      (listeners.Literal as (n: unknown) => void)(literal);
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('id 105: loc-fallback for TemplateLiteral handler assigned to variable (no loc on TemplateLiteral)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);

      const templateLit: Record<string, unknown> = {
        type: 'TemplateLiteral',
        expressions: [{ type: 'Identifier', name: 'userInput' }],
        quasis: [],
      };
      const varDecl: Record<string, unknown> = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'formatStr' },
        init: templateLit,
        parent: undefined,
      };
      templateLit.parent = varDecl;

      (listeners.TemplateLiteral as (n: unknown) => void)(templateLit);
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('id 118: loc-fallback for TemplateLiteral init in VariableDeclarator handler (no loc on VariableDeclarator)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      (listeners.VariableDeclarator as (n: unknown) => void)({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'formatStr' },
        init: {
          type: 'TemplateLiteral',
          quasis: [{ value: { raw: '%s: ' } }, { value: { raw: '' } }],
          expressions: [{ type: 'Identifier', name: 'userInput' }],
        },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('id 124: loc-fallback for BinaryExpression init in VariableDeclarator handler (no loc on VariableDeclarator)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      (listeners.VariableDeclarator as (n: unknown) => void)({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'formatStr' },
        init: {
          type: 'BinaryExpression',
          operator: '+',
          left: { type: 'Literal', value: '%s', raw: '"%s"' },
          right: { type: 'Identifier', name: 'userInput' },
        },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });
  });
});
