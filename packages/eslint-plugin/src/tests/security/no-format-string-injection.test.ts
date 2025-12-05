/**
 * Comprehensive tests for no-format-string-injection rule
 * Security: CWE-134 (Use of Externally-Controlled Format String)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noFormatStringInjection } from '../../rules/security/no-format-string-injection';

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
      ],
    });
  });
});
