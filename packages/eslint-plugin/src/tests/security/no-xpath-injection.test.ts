/**
 * Comprehensive tests for no-xpath-injection rule
 * Security: CWE-643 (XPath Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noXpathInjection } from '../../rules/security/no-xpath-injection';

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

describe('no-xpath-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe XPath operations', noXpathInjection, {
      valid: [
        // Safe XPath literals
        {
          code: 'const result = document.evaluate("/users/user[@id=\'123\']", document);',
        },
        // Validated input
        {
          code: 'const safeId = validateId(userInput); const xpath = `/users/user[@id="${safeId}"]`;',
        },
        // Safe XPath construction
        {
          code: 'const xpath = buildXPath("users", { id: "123" });',
        },
        // Non-XPath operations
        {
          code: 'const result = array.find(item => item.id === userInput);',
        },
        // Escaped input
        {
          code: 'const xpath = `/users/user[@name="${escapeXPath(userName)}"]`;',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - XPath Injection', () => {
    ruleTester.run('invalid - XPath injection vulnerabilities', noXpathInjection, {
      valid: [],
      invalid: [
        {
          code: 'const xpath = "/users/user[name=\'" + userInput + "\']";',
          errors: [
            {
              messageId: 'xpathInjection',
            },
          ],
        },
        {
          code: 'const query = `/users/user[@id="${userId}"]`;',
          errors: [
            {
              messageId: 'unsafeXpathConcatenation',
            },
          ],
        },
        {
          code: 'document.evaluate(userQuery, document);',
          errors: [
            {
              messageId: 'unvalidatedXpathInput',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Dangerous XPath Patterns', () => {
    ruleTester.run('invalid - dangerous XPath expressions', noXpathInjection, {
      valid: [],
      invalid: [
        {
          code: 'const xpath = "//users/user/..";',
          errors: [
            {
              messageId: 'dangerousXpathExpression',
            },
          ],
        },
        {
          code: 'const query = "/root/*";',
          errors: [
            {
              messageId: 'dangerousXpathExpression',
            },
          ],
        },
        {
          code: 'const xpathWithWildcard = "//user[*]";',
          errors: [
            {
              messageId: 'dangerousXpathExpression',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unvalidated XPath Input', () => {
    ruleTester.run('invalid - unvalidated XPath input', noXpathInjection, {
      valid: [],
      invalid: [
        {
          code: 'xmlDoc.selectNodes(userSearchQuery);',
          errors: [
            {
              messageId: 'unvalidatedXpathInput',
            },
          ],
        },
        {
          code: 'const xpathVar = userInput; document.evaluate(xpathVar, document);',
          errors: [
            {
              messageId: 'xpathInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - XPath Variable Assignment', () => {
    ruleTester.run('invalid - dangerous XPath variable assignments', noXpathInjection, {
      valid: [],
      invalid: [
        {
          code: 'const userXPath = "//users/user/..";',
          errors: [
            {
              messageId: 'dangerousXpathExpression',
            },
          ],
        },
        {
          code: 'const xpathQuery = req.params.query;',
          errors: [
            {
              messageId: 'xpathInjection',
            },
          ],
        },
        {
          code: 'let searchPath = userInput;',
          errors: [
            {
              messageId: 'xpathInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noXpathInjection, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @xpath-safe */
            const xpath = \`//user[@id="\${userId}"]\`;
          `,
        },
        // Validated inputs
        {
          code: `
            const cleanId = validateXPathInput(userId);
            const xpath = \`/users/user[@id="\${cleanId}"]\`;
          `,
        },
        // Sanitized inputs
        {
          code: `
            const safeQuery = sanitizeXPath(req.query.search);
            document.evaluate(safeQuery, document);
          `,
        },
        // Safe XPath construction
        {
          code: `
            const xpath = createXPath('users', 'user', { id: userId });
            document.evaluate(xpath, document);
          `,
        },
        // Internal XPath queries
        {
          code: 'const configPath = "/config/database";',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom XPath functions', noXpathInjection, {
      valid: [
        {
          code: 'myXpathLib.evaluate(query, doc);',
          options: [{ xpathFunctions: ['myXpathLib.evaluate'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('config - custom safe constructors', noXpathInjection, {
      valid: [
        {
          code: 'const xpath = mySafeBuilder("users", userId);',
          options: [{ safeXpathConstructors: ['mySafeBuilder'] }],
        },
        {
          code: 'const xpath = unsafeBuilder(userId);',
          options: [{ safeXpathConstructors: ['mySafeBuilder'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Complex XPath Injection Scenarios', () => {
    ruleTester.run('complex - real-world XPath patterns', noXpathInjection, {
      valid: [],
      invalid: [
        {
          code: `
            function searchUsers(searchTerm) {
              // DANGEROUS: Direct interpolation
              const xpath = \`//user[contains(name, "\${searchTerm}")]\`;
              return document.evaluate(xpath, xmlDoc);
            }
          `,
          errors: [
            {
              messageId: 'unsafeXpathConcatenation',
            },
            {
              messageId: 'dangerousXpathExpression',
            },
          ],
        },
        {
          code: `
            const express = require('express');
            const app = express();

            app.get('/search', (req, res) => {
              // DANGEROUS: User input directly in XPath
              const userQuery = req.query.q;
              const xpath = "/users/user[name='" + userQuery + "']";
              const result = xmlDoc.selectSingleNode(xpath);
              res.json(result);
            });
          `,
          errors: [
            {
              messageId: 'xpathInjection',
            },
            {
              messageId: 'xpathInjection',
            },
          ],
        },
        {
          code: `
            // XPath injection with attribute traversal
            const maliciousQuery = req.params.id; // Could be "../../../etc/passwd"
            const xpath = \`//user[@id='\${maliciousQuery}']\`;
            const node = xml.evaluate(xpath, xmlDoc);
          `,
          errors: [
            {
              messageId: 'xpathInjection',
            },
            {
              messageId: 'unsafeXpathConcatenation',
            },
            {
              messageId: 'dangerousXpathExpression',
            },
          ],
        },
        {
          code: `
            // Dangerous XPath allowing parent traversal
            const userPath = userInput; // Could be "../admin/password"
            const xpath = \`/app/users/user[\${userPath}]\`;
            const result = document.evaluate(xpath, document);
          `,
          errors: [
            {
              messageId: 'xpathInjection',
            },
            {
              messageId: 'unsafeXpathConcatenation',
            },
          ],
        },
      ],
    });
  });
});
