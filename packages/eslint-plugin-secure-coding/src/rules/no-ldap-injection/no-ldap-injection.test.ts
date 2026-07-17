/**
 * Comprehensive tests for no-ldap-injection rule
 * Security: CWE-90 (LDAP Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noLdapInjection, containsLdapInterpolation } from './index';

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

describe('no-ldap-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe LDAP operations', noLdapInjection, {
      valid: [
        // Safe LDAP filters with escaping
        {
          code: 'const filter = `(uid=${ldap.escape.filterValue(userId)})`;',
        },
        // Safe LDAP libraries
        {
          code: 'client.search(baseDN, filter, options);',
        },
        // Validated input
        {
          code: 'const cleanFilter = validateLdapInput(userInput); client.search(baseDN, cleanFilter);',
        },
        // Non-LDAP operations
        {
          code: 'const result = database.query(sql);',
        },
        // Safe static filters
        {
          code: 'const filter = "(objectClass=person)";',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - LDAP Injection', () => {
    ruleTester.run('invalid - LDAP injection vulnerabilities', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: 'const filter = `(uid=${userInput})`;',
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
        {
          code: 'client.search(baseDN, `(cn=${req.query.name})`, options);',
          errors: [
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
        {
          code: 'const ldapFilter = "(uid=" + userId + ")"; client.search(baseDN, ldapFilter);',
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Dangerous LDAP Filters', () => {
    ruleTester.run('invalid - dangerous LDAP filter patterns', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: 'const filter = "(uid=*)";',
          errors: [
            {
              messageId: 'dangerousLdapOperation',
            },
          ],
        },
        {
          code: 'const dangerousFilter = "(|(uid=" + input + "))";',
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
        {
          code: 'const badFilter = "(&(cn=" + userInput + "))";',
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
        {
          code: 'const notFilter = "(!(uid=" + input + "))";',
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unescaped LDAP Input', () => {
    ruleTester.run('invalid - unescaped LDAP input', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: 'client.bind(`cn=${username},dc=example,dc=com`, password);',
          errors: [
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
        {
          code: 'const userDn = req.body.dn; ldap.modify(userDn, changes);',
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
        {
          code: 'const userDn = req.params.dn; client.search(userDn, filter);',
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - LDAP Variable Assignment', () => {
    ruleTester.run('invalid - dangerous LDAP variable assignments', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: 'const userFilter = `(uid=${userInput})`;',
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
        {
          code: 'const ldapQuery = req.query.filter;',
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
        {
          code: 'let searchFilter = "(cn=*)" + input;',
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noLdapInjection, {
      valid: [
        // Safe LDAP construction using builder pattern
        {
          code: `
            const filter = buildLdapFilter('and', [
              ['uid', '=', userId],
              ['objectClass', '=', 'person']
            ]);
          `,
        },
        // Internal LDAP operations with static values
        {
          code: 'const adminFilter = "(objectClass=admin)";',
        },
        // Safe non-LDAP related code
        {
          code: 'const data = { filter: someValue };',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom LDAP functions', noLdapInjection, {
      valid: [
        {
          code: 'myLdapClient.search(base, filter);',
          options: [{ ldapFunctions: ['myLdapClient.search'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('config - custom escape functions', noLdapInjection, {
      valid: [
        {
          code: 'const escaped = myLdapEscape(userInput); const filter = `(uid=${escaped})`;',
          options: [{ ldapEscapeFunctions: ['myLdapEscape'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Safe JSDoc Annotations - safetyChecker.isSafe branches', () => {
    ruleTester.run('valid - @validated suppresses unescapedLdapInput (CallExpression, untrusted arg)', noLdapInjection, {
      valid: [
        {
          code: `
            /** @validated */
            client.search(baseDN, req.query.name, options);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe suppresses unescapedLdapInput (CallExpression, template literal)', noLdapInjection, {
      valid: [
        {
          code: `
            /** @safe */
            client.search(baseDN, \`(cn=\${userInput})\`, options);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @sanitized suppresses dangerousLdapOperation (string literal)', noLdapInjection, {
      valid: [
        {
          code: `
            /** @sanitized */
            const filter = "(uid=*)";
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @trusted suppresses unsafeLdapFilter (template literal interpolation)', noLdapInjection, {
      valid: [
        {
          code: `
            /** @trusted */
            const filter = \`(uid=\${userInput})\`;
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @escaped suppresses dangerousLdapOperation (template literal)', noLdapInjection, {
      valid: [
        {
          code: `
            /** @escaped */
            const filter = \`(uid=*)\`;
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @verified suppresses ldapInjection (string concatenation)', noLdapInjection, {
      valid: [
        {
          code: `
            /** @verified */
            const ldapFilter = "(uid=" + userId + ")";
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @clean suppresses ldapInjection (direct untrusted assignment)', noLdapInjection, {
      valid: [
        {
          code: `
            /** @clean */
            const ldapQuery = req.query.filter;
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe suppresses dangerousLdapOperation (template literal, trusted interpolation)', noLdapInjection, {
      valid: [
        // Same trusted-interpolation + trailing dangerous-pattern shape as the
        // "dangerousLdapOperation reported for a template literal" invalid
        // case below, but annotated — exercises this specific report site's
        // safetyChecker.isSafe branch.
        {
          code: `
            /** @safe */
            const ldapFilter = \`(|(cn=\${trustedVal})(*|*))\`;
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('containsLdapInterpolation - single and double quoted concatenation (Layer 2 unit test)', () => {
    // `containsLdapInterpolation` is exported from the module for direct unit
    // testing. Its first alternative (`\$\{[^}]+\}`) matches any real
    // `${...}` interpolation, which is a precondition for the rule's only
    // call site to ever act on the result (it also requires at least one
    // `TemplateLiteral.expressions` entry). That means the 2nd/3rd
    // alternatives (bare quoted-string-plus-string text patterns with no
    // `${}` at all) can only be exercised directly against the function,
    // never through a real TemplateLiteral RuleTester fixture.
    it('matches double-${}-free text via the single-quoted concatenation alternative', () => {
      expect(containsLdapInterpolation("'a' + 'b'")).toBe(true);
    });

    it('matches ${}-free text via the double-quoted concatenation alternative', () => {
      expect(containsLdapInterpolation('"a" + "b"')).toBe(true);
    });

    it('returns false when neither interpolation nor quoted concatenation is present', () => {
      expect(containsLdapInterpolation('(objectClass=person)')).toBe(false);
    });

    it('matches real ${} interpolation via the first alternative', () => {
      expect(containsLdapInterpolation('(uid=${userInput})')).toBe(true);
    });
  });

  describe('isUntrustedLdapInput - MemberExpression prefixes', () => {
    ruleTester.run('invalid - request. prefix is untrusted', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: 'client.search(baseDN, request.query.filter, options);',
          errors: [
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - query. prefix is untrusted', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: 'client.search(baseDN, query.params.filter, options);',
          errors: [
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - params. prefix is untrusted', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: 'client.search(baseDN, params.raw.filter, options);',
          errors: [
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - body. prefix is untrusted', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: 'client.search(baseDN, body.raw.filter, options);',
          errors: [
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
      ],
    });
  });

  describe('isLdapInputEscaped - validation function call escaping', () => {
    ruleTester.run('valid - default escape.filterValue member call marks input as escaped', noLdapInjection, {
      valid: [
        // Exercises the ldapEscapeFunctions.some(...) MemberExpression branch
        // where the property name itself matches a configured escape suffix.
        {
          code: 'const filter = `(uid=${ldap.escape.filterValue(userInput)})`;',
        },
      ],
      invalid: [],
    });
  });

  describe('isLdapInputEscaped - Layer 2 (synthetic parent chain via mock context)', () => {
    // isLdapInputEscaped's `current.type === 'CallExpression'` walk-up branch
    // can only ever match if the untrusted Identifier/MemberExpression `expr`
    // itself has a CallExpression ancestor. In every real call site, `expr`
    // always comes from a `const`/`let` VariableDeclarator's `init` (or a
    // BinaryExpression `+` operand of it) — and a variable declaration is a
    // Statement, never nested inside a CallExpression's argument list. That
    // makes this branch unreachable through any real parsed program, so it is
    // exercised here via a synthetic AST through the mock-context harness.
    it('recognizes escaping via a matching ldapEscapeFunctions MemberExpression ancestor', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
        sourceText: '`(uid=${userInput})`',
      });

      const untrustedId = { type: 'Identifier', name: 'userInput', parent: undefined };
      const templateLiteral = {
        type: 'TemplateLiteral',
        expressions: [untrustedId],
        quasis: [],
        parent: undefined,
      };
      const escapeCall = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'ldap' },
          property: { type: 'Identifier', name: 'filterEscape' },
        },
        arguments: [templateLiteral],
        parent: undefined,
      };
      // Wire up the synthetic ancestor chain: userInput -> TemplateLiteral -> CallExpression(escape)
      untrustedId.parent = templateLiteral;
      templateLiteral.parent = escapeCall;

      const declarator = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'filter' },
        init: templateLiteral,
        parent: undefined,
      };

      (listeners['VariableDeclarator'] as (n: unknown) => void)(declarator);

      // Escaped via the CallExpression ancestor, so no report is produced.
      expect(reports).toHaveLength(0);
    });

    it('recognizes escaping via a matching ldapValidationFunctions Identifier-callee ancestor', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
        sourceText: '`(uid=${userInput})`',
      });

      const untrustedId = { type: 'Identifier', name: 'userInput', parent: undefined };
      const templateLiteral = {
        type: 'TemplateLiteral',
        expressions: [untrustedId],
        quasis: [],
        parent: undefined,
      };
      const validationCall = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'validateLdapInput' },
        arguments: [templateLiteral],
        parent: undefined,
      };
      untrustedId.parent = templateLiteral;
      templateLiteral.parent = validationCall;

      const declarator = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'filter' },
        init: templateLiteral,
        parent: undefined,
      };

      (listeners['VariableDeclarator'] as (n: unknown) => void)(declarator);

      expect(reports).toHaveLength(0);
    });
  });

  describe('LDAP CallExpression with fewer than 2 arguments', () => {
    ruleTester.run('valid - LDAP call with a single argument is not flagged', noLdapInjection, {
      valid: [
        // Exercises the `args.length < 2` early-return branch: a real LDAP
        // method call with only a base DN and no filter/options argument.
        {
          code: 'client.search(baseDN);',
        },
      ],
      invalid: [],
    });
  });

  describe('VariableDeclarator without an initializer or non-Identifier id', () => {
    ruleTester.run('valid - declaration without an initializer is not flagged', noLdapInjection, {
      valid: [
        // Exercises the `!node.init` early-return branch.
        {
          code: 'let ldapFilter;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - destructuring declarator (non-Identifier id) is not flagged', noLdapInjection, {
      valid: [
        // Exercises the `node.id.type !== 'Identifier'` early-return branch.
        {
          code: 'const [ldapFilter] = ["(objectClass=person)"];',
        },
      ],
      invalid: [],
    });
  });

  describe('dangerousLdapOperation reported for a template literal with a trusted interpolation', () => {
    ruleTester.run('invalid - dangerous filter pattern in a template literal whose interpolated value is trusted', noLdapInjection, {
      valid: [],
      invalid: [
        // The interpolated value (`trustedVal`) is NOT considered untrusted
        // input, so the unsafeLdapFilter branch is skipped entirely, letting
        // execution reach the second `containsDangerousLdapFilter(fullText)`
        // check — which matches the `*|*` mid-string dangerous pattern.
        {
          code: 'const ldapFilter = `(|(cn=${trustedVal})(*|*))`;',
          errors: [
            {
              messageId: 'dangerousLdapOperation',
            },
          ],
        },
      ],
    });
  });

  describe('String concatenation that does not resemble LDAP filter construction', () => {
    ruleTester.run('valid - concatenation without parentheses is not flagged', noLdapInjection, {
      valid: [
        // Exercises the false branch of
        // `fullText.includes('(') && fullText.includes(')')`: the assigned
        // value is variable-name LDAP-related ("ldapFilter") but its
        // concatenated text contains no parentheses at all, so it doesn't
        // look like LDAP filter construction and is skipped.
        {
          code: 'const ldapFilter = "uid=" + userInput;',
        },
      ],
      invalid: [],
    });
  });

  describe('Layer 2 - synthetic nodes without loc (mock context)', () => {
    it('unescapedLdapInput (CallExpression, untrusted arg) falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
        sourceText: 'req.filter',
      });

      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'client' },
          property: { type: 'Identifier', name: 'search' },
        },
        arguments: [
          { type: 'Identifier', name: 'baseDN' },
          {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'req' },
            property: { type: 'Identifier', name: 'filter' },
          },
        ],
        loc: undefined,
        parent: undefined,
      };

      (listeners['CallExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('unescapedLdapInput');
      expect(reports[0].data?.line).toBe('0');
    });

    it('unescapedLdapInput (CallExpression, template literal arg) falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
      });

      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'client' },
          property: { type: 'Identifier', name: 'search' },
        },
        arguments: [
          { type: 'Identifier', name: 'baseDN' },
          {
            type: 'TemplateLiteral',
            expressions: [{ type: 'Identifier', name: 'trustedVal' }],
            quasis: [],
          },
        ],
        loc: undefined,
        parent: undefined,
      };

      (listeners['CallExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('unescapedLdapInput');
      expect(reports[0].data?.line).toBe('0');
    });

    it('dangerousLdapOperation (Literal) falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
      });

      const init = { type: 'Literal', value: '(uid=*)' };
      const node = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'ldapFilter' },
        init,
        loc: undefined,
        parent: undefined,
      };

      (listeners['VariableDeclarator'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('dangerousLdapOperation');
      expect(reports[0].data?.line).toBe('0');
    });

    it('unsafeLdapFilter (TemplateLiteral) falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
        sourceText: '`(uid=${userInput})`',
      });

      const untrustedId = { type: 'Identifier', name: 'userInput' };
      const init = {
        type: 'TemplateLiteral',
        expressions: [untrustedId],
        quasis: [],
      };
      const node = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'ldapFilter' },
        init,
        loc: undefined,
        parent: undefined,
      };

      (listeners['VariableDeclarator'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('unsafeLdapFilter');
      expect(reports[0].data?.line).toBe('0');
    });

    it('dangerousLdapOperation (TemplateLiteral) falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
        sourceText: '`(|(cn=${trustedVal})(*|*))`',
      });

      const init = {
        type: 'TemplateLiteral',
        expressions: [{ type: 'Identifier', name: 'trustedVal' }],
        quasis: [],
      };
      const node = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'ldapFilter' },
        init,
        loc: undefined,
        parent: undefined,
      };

      (listeners['VariableDeclarator'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('dangerousLdapOperation');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ldapInjection (BinaryExpression concatenation) falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
        sourceText: '"(uid=" + userInput + ")"',
      });

      const init = {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: '(uid=' },
        right: { type: 'Identifier', name: 'userInput' },
      };
      const node = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'ldapFilter' },
        init,
        loc: undefined,
        parent: undefined,
      };

      (listeners['VariableDeclarator'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('ldapInjection');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ldapInjection (direct untrusted assignment) falls back to line "0" when node.loc is undefined', () => {
      const { listeners, reports } = createWithMockContext(noLdapInjection, {
        options: [{}],
        sourceText: 'req.filter',
      });

      const init = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'req' },
        property: { type: 'Identifier', name: 'filter' },
      };
      const node = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'ldapQuery' },
        init,
        loc: undefined,
        parent: undefined,
      };

      (listeners['VariableDeclarator'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('ldapInjection');
      expect(reports[0].data?.line).toBe('0');
    });
  });

  describe('Complex LDAP Injection Scenarios', () => {
    ruleTester.run('complex - real-world LDAP patterns', noLdapInjection, {
      valid: [],
      invalid: [
        {
          code: `
            function authenticateUser(username, password) {
              // DANGEROUS: Direct interpolation in DN
              const userDN = \`cn=\${username},ou=users,dc=example,dc=com\`;
              return client.bind(userDN, password);
            }
          `,
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
        {
          code: `
            const express = require('express');
            const app = express();

            app.get('/users', (req, res) => {
              // DANGEROUS: User input directly in LDAP filter
              const searchFilter = req.query.name;
              const filter = "(cn=" + searchFilter + ")";
              client.search(baseDN, filter, (err, result) => {
                res.json(result);
              });
            });
          `,
          errors: [
            {
              messageId: 'ldapInjection',
            },
          ],
        },
        {
          code: `
            // LDAP injection with wildcard exploitation
            const userInput = req.params.term; // Could be "*)(objectClass=*)"
            const filter = \`(&(cn=\${userInput})(objectClass=user))\`;
            const result = await client.search(baseDN, filter);
          `,
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
        {
          code: `
            // Blind LDAP injection attempt
            const username = req.body.username; // Could be "admin)(&(1=1)"
            const password = req.body.password;
            const bindDN = \`cn=\${username},ou=users,dc=example,dc=com\`;

            try {
              await client.bind(bindDN, password);
              res.json({ authenticated: true });
            } catch (err) {
              res.json({ authenticated: false }); // Timing leak possible
            }
          `,
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
      ],
    });
  });
});
