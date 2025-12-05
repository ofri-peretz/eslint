/**
 * Comprehensive tests for no-ldap-injection rule
 * Security: CWE-90 (LDAP Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noLdapInjection } from '../../rules/security/no-ldap-injection';

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
