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
          // Was `printf(userFormatString)`, which only reported because
          // `userformat` was matched as a SUBSTRING of it — the same test that
          // read `metadata` and `paymentData` as user input. `userFormat` is a
          // whole name on the declared list.
          code: 'printf(userFormat);',
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

  /**
   * These three were `invalid`, asserting `unsafeFormatSpecifier` — and every
   * one of them is the CWE-134 REMEDIATION, not the vulnerability.
   *
   * `util.format`, `console.log` and `sprintf` substitute arguments verbatim;
   * they do not re-scan a substituted value for specifiers. So with a constant
   * format string, a `%d` sitting inside `req.body.format` reaches the output
   * as the two characters `%d`. Passing untrusted data as an ARGUMENT is
   * exactly what the rule's own message text tells people to do.
   *
   * The suggestion attached to those fixtures made it worse: rewriting the
   * argument to `.replace(/%/g, "%%")` doubles every literal percent sign in
   * the user's data, so `"50% off"` printed as `"50%% off"`.
   *
   * They are `valid` now, and the rule no longer reports a constant format
   * string. The genuine finding is below.
   */
  describe('Constant format string, untrusted argument — the mitigation', () => {
    ruleTester.run('valid - constant format, untrusted argument', noFormatStringInjection, {
      valid: [
        'console.log("Format: %s", userMessage);',
        'util.format("%s", req.body.format);',
        // Via a `const` binding one line up: still a constant this file can
        // read, resolved through scope rather than by the variable's name.
        'const formatStr = "User: %s, Data: %j"; util.format(formatStr, user, data);',
      ],
      invalid: [
        // The same call shape, with the format string no longer constant, is
        // still reported — so the change above removed a false positive and
        // not the detection.
        {
          code: 'let formatStr = "User: %s"; formatStr = req.query.fmt; util.format(formatStr, user);',
          errors: [
            // Was `missingFormatValidation`, reached only because the binding
            // is SPELLED `formatStr` — rename it to `f` and the report died.
            // The re-assignment `formatStr = req.query.fmt` is now tracked, so
            // the finding is the accurate one: the format string is
            // attacker-controlled. The escape suggestion goes with it, which is
            // the point — it rewrote the ARGUMENT and doubled every literal
            // percent sign in the user's own data.
            {
              messageId: 'userControlledFormatString',
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
        // The format string is a function PARAMETER, so nothing in this file
        // establishes it is constant — which is the shape CWE-134 describes.
        // Its former companion in this block, `const formatStr = 'User: %s,
        // Data: %j'; util.format(formatStr, user, data)`, moved to the valid
        // set: a `const`-bound literal is not attacker-controlled.
        {
          code: 'function render(formatTemplate, user) { return util.format(formatTemplate, user); }',
          errors: [
            {
              messageId: 'missingFormatValidation',
              suggestions: [
                {
                  messageId: 'escapeFormatString',
                  output:
                    'function render(formatTemplate, user) { return util.format(formatTemplate, user.replace(/%/g, "%%")); }',
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
          // The specifier is what makes this CWE-134: `%s` consumes an argument, so
          // attacker-controlled text placed here can read beyond what was passed.
          code: 'const userFormat = `Template: %s ${req.query.template}`;',
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
            // Was `missingFormatValidation` (with the escape suggestion), which
            // reached this line only through the identifier being SPELLED
            // `template`. `templates[type] || data` is now read as what the
            // fixture's own comment says it is — a format string that can be
            // `data` — so the finding is the precise one, and the suggestion
            // that doubled every percent sign in the ARGUMENT is not offered
            // for a format string the user controls.
            {
              messageId: 'userControlledFormatString',
            },
          ],
        },
        {
          code: `
            // Format-string injection through console's util.format semantics.
            // A single-argument console.log(message) is SAFE — there is no following
            // argument for a '%s' in userTemplate to consume. The second argument is
            // what makes this exploitable: '%s' now reads sessionToken.
            const userTemplate = req.body.template; // Could be "%s"
            const message = \`User said: \${userTemplate}\`;

            console.log(message, sessionToken);
          `,
          errors: [
            {
              messageId: 'userControlledFormatString',
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

    // The format string here is a PARAMETER, so the call is reported without
    // the annotation — see "Invalid Code - Missing Format Validation". This
    // pins that `@safe-format` still turns it off.
    //
    // It used to use `console.log('Format: %s', userMessage)`, which is no
    // longer reported with or without the annotation (constant format string),
    // so the case had stopped proving the suppression works.
    ruleTester.run('valid - @safe-format suppresses missingFormatValidation', noFormatStringInjection, {
      valid: [
        {
          code: `
            function render(formatTemplate, user) {
              /** @safe-format */
              util.format(formatTemplate, user);
            }
          `,
        },
      ],
      invalid: [
        {
          code: `
            function render(formatTemplate, user) {
              util.format(formatTemplate, user);
            }
          `,
          errors: [
            {
              messageId: 'missingFormatValidation',
              suggestions: [
                {
                  messageId: 'escapeFormatString',
                  output: `
            function render(formatTemplate, user) {
              util.format(formatTemplate, user.replace(/%/g, "%%"));
            }
          `,
                },
              ],
            },
          ],
        },
      ],
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

    // id 117 arm[1]: TemplateLiteral assigned to a variable, carrying a format specifier.
    // This previously asserted that a template with NO specifier reports — it does not, and
    // should not: with no `%s`/`%d` there is nothing a format-string injection could consume.
    // That assertion fired on every `const x = `…${req.foo}…`` in existence.
    ruleTester.run('coverage - VarDecl TemplateLiteral: user input with a specifier', noFormatStringInjection, {
      valid: [],
      invalid: [{ code: 'const formatStr = `%s ${req.body.value}`', errors: [{ messageId: 'formatStringInjection' }] }],
    });

    // id 118 arm[0]: VarDecl TemplateLiteral with specifiers + user input.
    // Reported ONCE. Both the VariableDeclarator handler and the TemplateLiteral visitor
    // match this shape; the declarator claims the node so the visitor defers.
    ruleTester.run('coverage - VarDecl TemplateLiteral: specifiers + user input reported once', noFormatStringInjection, {
      valid: [],
      invalid: [
        {
          code: 'const formatStr = `%s: ${req.body.value}`',
          errors: [{ messageId: 'formatStringInjection' }],
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

    // Was "loc-fallback for unsafeFormatSpecifier". That message is gone and
    // a constant `'%s'` in first position is no longer reported at all, so the
    // fallback is now exercised through a NON-constant format string — an
    // unresolvable identifier, which is what a parameter looks like here.
    it('id 76: loc-fallback for missingFormatValidation report (no loc on CallExpression)', () => {
      const { listeners, reports } = createWithMockContext(noFormatStringInjection);
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'sprintf' },
        arguments: [
          { type: 'Identifier', name: 'formatTemplate' },
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
        // The reporting branch now requires a specifier in a static quasi.
        quasis: [{ value: { raw: '%s ' } }],
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


/**
 * Regression lock — the specifier scan reads the AST quasis, not printed source.
 *
 * A specifier can only live in a STATIC quasi: an interpolated `%s` is a value being
 * formatted, not a format directive. Reading `sourceCode.getText` here also broke under the
 * mock contexts the coverage suite uses.
 */
ruleTester.run('lock: specifier detected from quasis', noFormatStringInjection, {
  valid: [
    // Interpolating a value that happens to contain '%s' is not a format directive.
    { code: 'const formatStr = `${req.body.value}`;' },
    { code: 'const formatStr = ``;' },
  ],
  invalid: [
    { code: 'const formatStr = `%d ${req.body.value}`;', errors: 1 },
  ],
});

/**
 * Option coverage — every case below is a PAIR over the same source whose verdicts
 * disagree. A test that merely sets an option and reproduces the default verdict
 * executes the line without proving anything: the branch could be deleted and the
 * suite would stay green.
 */
ruleTester.run('option: formatSpecifiers is the alphabet the scan looks for', noFormatStringInjection, {
  valid: [
    // `%n` is not in the default specifier list, so the template carries no format
    // directive as far as this rule is concerned and the VariableDeclarator branch
    // never reaches its report. Same source as the invalid case below.
    { code: 'const formatStr = `Progress: %n ${req.body.stage}`;' },
  ],
  invalid: [
    // Adding `%n` to the alphabet is the only difference. `%n` is the classic
    // write-what-where specifier, so a project that formats through a C-style
    // backend has a real reason to declare it — and the rule now sees a
    // user-interpolated template that carries a directive.
    {
      code: 'const formatStr = `Progress: %n ${req.body.stage}`;',
      options: [{ formatSpecifiers: ['%n'] }],
      errors: [{ messageId: 'formatStringInjection' }],
    },
  ],
});

ruleTester.run('option: trustedSanitizers launders a user-controlled format string', noFormatStringInjection, {
  valid: [
    // Registering the project's own guard puts `userFormat` into validatedVariables,
    // which is the ONLY thing this rule's internal safety checker consults for a
    // CallExpression's first argument. Without the registration the same two lines
    // report — see the invalid case.
    {
      code: [
        'const userFormat = myFormatGuard(req.query.fmt);',
        'util.format(userFormat, values);',
      ].join('\n'),
      options: [{ trustedSanitizers: ['myFormatGuard'] }],
    },
  ],
  invalid: [
    // An unknown wrapper is not evidence that the format string was checked, so the
    // value still reads as attacker-controlled in the format position — CWE-134.
    {
      code: [
        'const userFormat = myFormatGuard(req.query.fmt);',
        'util.format(userFormat, values);',
      ].join('\n'),
      errors: [{ messageId: 'userControlledFormatString' }],
    },
  ],
});

/**
 * NOT covered here, deliberately: `safeFormatLibraries`, `trustedAnnotations` and
 * `strictMode` are declared in the schema and in defaultOptions but are never read
 * inside `create()` — the destructure at the top of `create` takes only
 * `formatSpecifiers`, `userInputVariables` and `trustedSanitizers`, and this rule
 * substitutes a local `safetyChecker` that hardcodes `@safe-format` instead of
 * calling the devkit's `createSafetyChecker`. Measured, not inferred:
 *
 *   `/* @safe-format *\/ util.format(safeFormat, req.body.name)` stays QUIET with
 *   `strictMode: true` — strict mode cannot re-enable a report it does not gate.
 *   The same call with `trustedAnnotations: ['@fmt-reviewed']` and a
 *   `/* @fmt-reviewed *\/` comment still reports.
 *
 * No test is added for those three: any case that sets them produces the default
 * verdict, which would assert that a dead branch is working.
 */

/**
 * Regression lock — user input is a WHOLE name, never a substring of one.
 *
 * `isUserInput` was `lowerName.includes(input)` over the default
 * `userInputVariables` list, which contains `data`, `params`, `request` and
 * `input`. Three probes, three reports on code that touches no request:
 *
 *   console.error(paymentData, orderId)     // `data` ⊂ paymentData
 *   console.info(validationParams, reqId)   // `params` ⊂ validationParams
 *   util.format(metadata, id)               // `data` ⊂ metadata
 *
 * A dotted path is asked the same question one segment at a time, so
 * `request.body.layout` still resolves and `paymentData.total` does not.
 */
ruleTester.run('lock: user input matches whole names', noFormatStringInjection, {
  valid: [
    'console.error(paymentData, orderId);',
    'console.info(validationParams, requestId);',
    'util.format(metadata, id);',
    'console.log(bodyText, elapsedMs);',
    'util.format(paymentData.total, id);',
  ],
  invalid: [
    {
      code: 'util.format(request.body.layout, token);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
    {
      code: 'const { query } = ctx; util.format(query.format, secret);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
  ],
});

/**
 * Regression lock — a type-only cast is not a change of provenance.
 *
 * `req.query.pattern as string` is `req.query.pattern` once TypeScript is
 * erased, and Express types force the cast at nearly every query read
 * (`string | string[] | ParsedQs`). Leaving the wrapper on meant the typed half
 * of the ecosystem went unreported while the untyped half did not.
 */
ruleTester.run('lock: type casts are unwrapped', noFormatStringInjection, {
  valid: ['util.format("account=%s", req.query.pattern as string);'],
  invalid: [
    {
      code: 'util.format(req.query.pattern as string, account.apiKey);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
    {
      code: 'util.format(<string>req.query.pattern, account.apiKey);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
  ],
});

/**
 * Regression lock — the util.format sink is a BINDING, not the spelling `util.`.
 *
 * `const { format } = require('node:util')` is how Node's own documentation
 * imports it, and it made the sink vanish: the rule saw a call to something
 * named `format` and had no opinion. Resolved through the module binding, so
 * an aliased import counts and a local helper called `format` does not.
 */
ruleTester.run('lock: util.format resolved through its binding', noFormatStringInjection, {
  valid: [
    // A local function of the same name is a different binding entirely.
    'function format(tz, stamp) { return String(stamp); } format(req.query.tz, stamp);',
    // Constant format string through the imported binding: still the mitigation.
    'import { format } from "node:util"; format("tz=%s", req.query.tz);',
  ],
  invalid: [
    {
      code: 'const { format } = require("node:util"); format(req.query.fmt, token);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
    {
      code: 'import { format as fmt } from "util"; fmt(req.query.f, token);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
  ],
});

/**
 * Regression lock — a fallback does not launder the tainted branch.
 *
 * `flag ? DEFAULT : req.query.fmt` and `req.query.fmt ?? DEFAULT` both put the
 * request value in the format position on one of their paths. Both were quiet,
 * which made the finding deletable by the "make it configurable" commit that
 * adds the default.
 */
ruleTester.run('lock: conditional and logical fallbacks', noFormatStringInjection, {
  valid: ['util.format(flag ? SHORT_FORMAT : LONG_FORMAT, account.id);'],
  invalid: [
    {
      code: 'util.format(flag ? DEFAULT_FMT : req.query.fmt, token);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
    {
      code: 'util.format(req.query.fmt ?? DEFAULT_FMT, token);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
  ],
});

/**
 * Regression lock — taint survives destructuring and re-assignment.
 *
 * The declarator visitor returned immediately unless the id was a plain
 * Identifier, so `const { fmt } = req.query` — the idiomatic Express read —
 * carried the taint nowhere. And a re-assignment is not a declaration, so a
 * `let` declared with a constant stayed trusted no matter what was written into
 * it afterwards.
 *
 * The `valid` pair is what keeps the fix honest: destructuring a domain object,
 * and a `let` whose every write is a literal, must stay quiet.
 */
ruleTester.run('lock: destructured and re-assigned bindings', noFormatStringInjection, {
  valid: [
    'const { template, payload } = record; util.format(template, payload.name);',
    'let pattern = "order=%s"; pattern = "%s/%d"; util.format(pattern, order.id);',
    'const { total } = paymentData; util.format("t=%s", total);',
  ],
  invalid: [
    {
      code: 'const { fmt } = req.query; util.format(fmt, token);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
    {
      code: 'const [first] = req.body.patterns; util.format(first, token);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
    {
      code: 'let pattern = "order=%s"; pattern = req.query.pattern; util.format(pattern, order.id);',
      errors: [{ messageId: 'userControlledFormatString' }],
    },
  ],
});

/**
 * Coverage — the assignment-tracking visitor only tracks a plain binding.
 *
 * `obj.fmt = req.query.f` writes into a property, which is a different
 * question: nothing in this file establishes what else reads `obj`.
 */
ruleTester.run('coverage: assignment target must be a binding', noFormatStringInjection, {
  valid: ['const obj = {}; obj.fmt = req.query.f; util.format(obj.fmt2, token);'],
  invalid: [],
});

/**
 * The `user*` alias family is an option, and its default is exactly what
 * shipped.
 *
 * Probed both directions before these were written:
 *   util.format(userTemplate, 1)     reports userControlledFormatString
 *   util.format(tenantTemplate, 1)   QUIET
 * so the alias list is the only thing moving in every case below.
 */
ruleTester.run('options: userInputAliases is configurable, default unchanged', noFormatStringInjection, {
  valid: [
    // ---- replacing the list drops the built-in aliases --------------------
    // A CMS where `userTemplate` is a template BELONGING TO a user record, not
    // a template supplied BY one. Narrowing the family is the remedy; before
    // the option existed it was disable-the-rule.
    {
      code: 'const util = require("util"); export function f(userTemplate) { return util.format(userTemplate, 1); }',
      options: [{ userInputAliases: ['userinput'] }],
    },
    // Extending never removes: a name in neither list stays quiet.
    {
      code: 'const util = require("util"); export function f(tenantTemplate) { return util.format(tenantTemplate, 1); }',
      options: [{ additionalUserInputAliases: ['callerTemplate'] }],
    },
  ],
  invalid: [
    // ---- the default is unchanged ----------------------------------------
    // Positive control for the replacing case above.
    {
      code: 'const util = require("util"); export function f(userTemplate) { return util.format(userTemplate, 1); }',
      options: [{}],
      errors: [{ messageId: 'userControlledFormatString' }],
    },

    // ---- extending the list adds coverage ---------------------------------
    // A codebase whose request-supplied format string is spelled
    // `callerTemplate`. Matched as a WHOLE name, exactly like the built-ins.
    {
      code: 'const util = require("util"); export function f(callerTemplate) { return util.format(callerTemplate, 1); }',
      options: [{ additionalUserInputAliases: ['callerTemplate'] }],
      errors: [{ messageId: 'userControlledFormatString' }],
    },
    // Full replacement widens as well as narrows.
    {
      code: 'const util = require("util"); export function f(callerTemplate) { return util.format(callerTemplate, 1); }',
      options: [{ userInputAliases: ['callerTemplate'] }],
      errors: [{ messageId: 'userControlledFormatString' }],
    },
  ],
});
