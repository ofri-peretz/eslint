/**
 * Comprehensive tests for no-ldap-injection rule
 * Security: CWE-90 (LDAP Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noLdapInjection } from './index';

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

/**
 * Every fixture below is run with an `ldapjs` import prepended.
 *
 * The rule is gated on an LDAP client being loaded (see `fileImportsLdapClient`
 * in ./index.ts) — nothing else in a file is evidence that CWE-90 applies. A
 * fixture without one would go green for the wrong reason: not because the rule
 * judged the code safe, but because it never looked. The ungated behaviour is
 * pinned separately, in "the file gate" below.
 */
const LDAP_IMPORT = "import ldapjs from 'ldapjs';\n";

type Fixture = string | { code: string; [key: string]: unknown };

const withLdapImport = (fixture: Fixture): Fixture =>
  typeof fixture === 'string'
    ? LDAP_IMPORT + fixture
    : { ...fixture, code: LDAP_IMPORT + fixture.code };

/** `ruleTester.run`, with the LDAP client the gate requires. */
const runLdap = (
  name: string,
  rule: typeof noLdapInjection,
  tests: { valid: Fixture[]; invalid: Fixture[] },
): void => {
  ruleTester.run(name, rule, {
    valid: tests.valid.map(withLdapImport),
    invalid: tests.invalid.map(withLdapImport),
  } as never);
};

describe('no-ldap-injection', () => {
  describe('Valid Code', () => {
    runLdap('valid - safe LDAP operations', noLdapInjection, {
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
    runLdap('invalid - LDAP injection vulnerabilities', noLdapInjection, {
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
          // A filter BUILT from an interpolation is `unsafeLdapFilter`; the value is
          // not merely unescaped, it is concatenated into filter grammar.
          code: 'client.search(baseDN, `(cn=${req.query.name})`, options);',
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
        {
          // Reported ONCE, at the construction, even though the value is also read at
          // the call site — both resolve to the same node.
          code: 'const ldapFilter = "(uid=" + userId + ")"; client.search(baseDN, ldapFilter);',
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Dangerous LDAP Filters', () => {
    runLdap('invalid - dangerous LDAP filter patterns', noLdapInjection, {
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
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
        {
          code: 'const badFilter = "(&(cn=" + userInput + "))";',
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
        {
          code: 'const notFilter = "(!(uid=" + input + "))";',
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unescaped LDAP Input', () => {
    runLdap('invalid - unescaped LDAP input', noLdapInjection, {
      valid: [],
      invalid: [
        {
          // Argument 0 of `bind` is the DN, so this is DN injection. Argument 1 is the
          // bind PASSWORD and is not filter grammar — reporting it was the false
          // positive that fired on the canonical ldapjs authentication call.
          code: 'client.bind(`cn=${username},dc=example,dc=com`, password);',
          errors: [
            {
              messageId: 'ldapInjection',
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
    runLdap('invalid - dangerous LDAP variable assignments', noLdapInjection, {
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
          // The variable name alone is not evidence of LDAP — the file has to
          // actually touch a directory. With `client.search()` present this is a
          // real CWE-90; see the valid case below for the same assignment in a
          // file with no LDAP anywhere, which is not.
          code: 'const ldapQuery = req.query.filter; client.search(baseDN, ldapQuery);',
          errors: [
            {
              messageId: 'unescapedLdapInput',
            },
          ],
        },
        {
          code: 'let searchFilter = "(cn=*)" + input;',
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
        {
          // CommonJS `require('ldapjs')` counts as LDAP evidence too — most LDAP
          // code in the wild is CJS, so an ESM-only check would have left the
          // majority of real directory code unprotected.
          code: "const ldap = require('ldapjs'); const ldapFilter = `(uid=${req.query.uid})`;",
          errors: [
            {
              messageId: 'unsafeLdapFilter',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    runLdap('valid - false positives reduced', noLdapInjection, {
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
    runLdap('config - custom LDAP functions', noLdapInjection, {
      valid: [
        {
          code: 'myLdapClient.search(base, filter);',
          options: [{ ldapFunctions: ['myLdapClient.search'] }],
        },
      ],
      invalid: [],
    });

    runLdap('config - custom escape functions', noLdapInjection, {
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
    runLdap(
      'valid - @validated suppresses unescapedLdapInput (CallExpression, untrusted arg)',
      noLdapInjection,
      {
        valid: [
          {
            code: `
            /** @validated */
            client.search(baseDN, req.query.name, options);
          `,
          },
        ],
        invalid: [],
      },
    );

    runLdap(
      'valid - @safe suppresses unescapedLdapInput (CallExpression, template literal)',
      noLdapInjection,
      {
        valid: [
          {
            code: `
            /** @safe */
            client.search(baseDN, \`(cn=\${userInput})\`, options);
          `,
          },
        ],
        invalid: [],
      },
    );

    runLdap(
      'valid - @sanitized suppresses dangerousLdapOperation (string literal)',
      noLdapInjection,
      {
        valid: [
          {
            code: `
            /** @sanitized */
            const filter = "(uid=*)";
          `,
          },
        ],
        invalid: [],
      },
    );

    runLdap(
      'valid - @trusted suppresses unsafeLdapFilter (template literal interpolation)',
      noLdapInjection,
      {
        valid: [
          {
            code: `
            /** @trusted */
            const filter = \`(uid=\${userInput})\`;
          `,
          },
        ],
        invalid: [],
      },
    );

    runLdap(
      'valid - @escaped suppresses dangerousLdapOperation (template literal)',
      noLdapInjection,
      {
        valid: [
          {
            code: `
            /** @escaped */
            const filter = \`(uid=*)\`;
          `,
          },
        ],
        invalid: [],
      },
    );

    runLdap(
      'valid - @verified suppresses ldapInjection (string concatenation)',
      noLdapInjection,
      {
        valid: [
          {
            code: `
            /** @verified */
            const ldapFilter = "(uid=" + userId + ")";
          `,
          },
          {
            // A `@clean` annotation still suppresses the branch even when the
            // file genuinely uses LDAP — the gate narrows what is considered, it
            // does not bypass the existing safety checks.
            code: `
            const ldap = require('ldapjs');
            /** @clean */
            const ldapQuery = req.query.filter;
          `,
          },
        ],
        invalid: [],
      },
    );

    runLdap(
      'valid - @clean suppresses ldapInjection (direct untrusted assignment)',
      noLdapInjection,
      {
        valid: [
          {
            code: `
            /** @clean */
            const ldapQuery = req.query.filter;
          `,
          },
        ],
        invalid: [],
      },
    );

    runLdap(
      'valid - @safe suppresses dangerousLdapOperation (template literal, trusted interpolation)',
      noLdapInjection,
      {
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
      },
    );
  });

  describe('isUntrustedLdapInput - MemberExpression prefixes', () => {
    runLdap('invalid - request. prefix is untrusted', noLdapInjection, {
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

    // The ROOT of the member chain has to be a request object. Matching the
    // substring `query.` / `params.` / `body.` anywhere in the PRINTED TEXT was
    // what made `req.headers[field.toLowerCase()]` in expressjs/morgan a CWE-90
    // finding; a bare `query.params.filter` in a file that never declares `query`
    // is not evidence of anything, and is now valid.
    runLdap('invalid - the request roots, and only the roots', noLdapInjection, {
      valid: [
        'client.search(baseDN, query.params.filter, options);',
        'client.search(baseDN, params.raw.filter, options);',
        'client.search(baseDN, body.raw.filter, options);',
      ],
      invalid: [
        {
          code: 'client.search(baseDN, req.query.filter, options);',
          errors: [{ messageId: 'unescapedLdapInput' }],
        },
        {
          code: 'client.search(baseDN, request.params.filter, options);',
          errors: [{ messageId: 'unescapedLdapInput' }],
        },
        {
          // Destructured one statement earlier — resolved through the scope, not
          // guessed from the name.
          code: 'const { query } = req; client.search(baseDN, query.filter, options);',
          errors: [{ messageId: 'unescapedLdapInput' }],
        },
      ],
    });
  });

  describe('isLdapInputEscaped - validation function call escaping', () => {
    runLdap(
      'valid - default escape.filterValue member call marks input as escaped',
      noLdapInjection,
      {
        valid: [
          // Exercises the ldapEscapeFunctions.some(...) MemberExpression branch
          // where the property name itself matches a configured escape suffix.
          {
            code: 'const filter = `(uid=${ldap.escape.filterValue(userInput)})`;',
          },
        ],
        invalid: [],
      },
    );
  });

  describe('LDAP CallExpression with fewer than 2 arguments', () => {
    runLdap(
      'valid - LDAP call with a single argument is not flagged',
      noLdapInjection,
      {
        valid: [
          // Exercises the `args.length < 2` early-return branch: a real LDAP
          // method call with only a base DN and no filter/options argument.
          {
            code: 'client.search(baseDN);',
          },
        ],
        invalid: [],
      },
    );
  });

  describe('VariableDeclarator without an initializer or non-Identifier id', () => {
    runLdap(
      'valid - declaration without an initializer is not flagged',
      noLdapInjection,
      {
        valid: [
          // Exercises the `!node.init` early-return branch.
          {
            code: 'let ldapFilter;',
          },
        ],
        invalid: [],
      },
    );

    runLdap(
      'valid - destructuring declarator (non-Identifier id) is not flagged',
      noLdapInjection,
      {
        valid: [
          // Exercises the `node.id.type !== 'Identifier'` early-return branch.
          {
            code: 'const [ldapFilter] = ["(objectClass=person)"];',
          },
        ],
        invalid: [],
      },
    );
  });

  describe('dangerousLdapOperation reported for a template literal with a trusted interpolation', () => {
    runLdap(
      'invalid - dangerous filter pattern in a template literal whose interpolated value is trusted',
      noLdapInjection,
      {
        valid: [],
        invalid: [
          // The interpolated value (`trustedVal`) is NOT considered untrusted
          // input, so the unsafeLdapFilter branch is skipped entirely, letting
          // execution reach the second `containsDangerousLdapFilter(fullText)`
          // check — which matches the `*|*` mid-string dangerous pattern.
          {
            // The interpolated value folds to a literal written in this file, so
            // there is no injection — which lets execution reach the
            // `containsDangerousLdapFilter` check, and the `*|*` mid-string
            // pattern matches.
            code: "const CN = 'admin'; const ldapFilter = `(|(cn=${CN})(*|*))`;",
            errors: [
              {
                messageId: 'dangerousLdapOperation',
              },
            ],
          },
        ],
      },
    );
  });

  describe('String concatenation that does not resemble LDAP filter construction', () => {
    runLdap(
      'valid - concatenation without parentheses is not flagged',
      noLdapInjection,
      {
        valid: [
          // The value's own text is not filter grammar — no `(attr=` anywhere —
          // so it is not a filter, whatever the variable is called. The variable
          // name was never evidence in either direction.
          {
            code: 'const ldapFilter = "uid=" + userInput;',
          },
          {
            code: 'const ldapFilter = `${prefix} (${count}) items`;',
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Complex LDAP Injection Scenarios', () => {
    runLdap('complex - real-world LDAP patterns', noLdapInjection, {
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
              // Argument 0 of `bind` is the DN. Reported once, at the
              // construction — not twice, and not on the password.
              messageId: 'ldapInjection',
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
              messageId: 'unsafeLdapFilter',
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
              messageId: 'ldapInjection',
            },
          ],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// THE FILE GATE. Deliberately NOT run through `runLdap` — the whole point of
// each fixture is that no LDAP client is loaded, so `fileImportsLdapClient`
// returns false and the rule abstains.
//
// Every fixture here is red on the pre-gate predicates.
// ---------------------------------------------------------------------------
describe('no-ldap-injection — the LDAP client gate', () => {
  ruleTester.run('no LDAP client in the file, no CWE-90', noLdapInjection, {
    valid: [
      // Corpus: Shopify/cli packages/app/src/cli/models/extensions/specifications/
      // type-generation.ts:599. A TypeScript interface built as a template
      // literal. Predicates at fault: `varName.startsWith('input')`
      // (`inputTypeName`) plus "the printed text contains `(` and `)`" — which
      // `JSON.stringify(intent.action)` supplies. There is no LDAP anywhere in
      // that repository.
      `const requestType = \`interface \${requestTypeName} {
  action: \${JSON.stringify(intent.action)};
  data: \${inputTypeName};
  value?: \${valueTypeName};
}\`;`,
      // Corpus: Shopify/cli packages/theme/src/cli/services/package.ts:28. A zip
      // glob. `inputDirectory` starts with `input`; the parentheses are the
      // alternation group of the glob.
      `const matchFilePattern = \`\${inputDirectory}/(\${themeFilesPattern})\`;`,
      // The `Set` method that opened the OLD gate. `add`, `search`, `bind` and
      // `delete` were accepted as "an LDAP sink is present"; `intentKeys.add()`
      // is on the line above the type-generation finding.
      `const intentKeys = new Set();
intentKeys.add(intentKey);
const inputType = \`(\${intentKey})\`;`,
      // expressjs/morgan index.js:373 — an HTTP logger. Matched because the
      // printed text contains `req.` and `toLowerCase()` supplied the
      // parentheses.
      `morgan.token('req', function getRequestToken (req, res, field) {
  var header = req.headers[field.toLowerCase()]
  return Array.isArray(header) ? header.join(', ') : header
})`,
      // A variable called `ldapQuery` is a naming guess, not evidence.
      'const ldapQuery = req.query.filter;',
      // An import of something that is not an LDAP client is not evidence —
      // the shape most web handlers have.
      "import express from 'express';\nconst ldapQuery = req.query.filter;",
      // A method call that merely shares a name with an LDAP sink.
      "import express from 'express';\nrouter.bind(baseDN, `(cn=${req.query.name})`);",
      // A literal that parses as a dangerous filter, in a file that speaks no
      // LDAP: this is a regex, a glob, or a comment more often than a filter.
      'const pattern = "(uid=*)";',
      // A zip glob is STILL not an LDAP filter once ldapjs is loaded. This case
      // used to be `invalid`, asserting the false positive as correct behaviour
      // whenever the gate happened to be open — the gate was covering for a
      // predicate that could not tell a glob from a filter. `(${themeFilesPattern})`
      // is a parenthesised alternation, not `(attribute=value)`.
      "import ldapjs from 'ldapjs';\nconst matchFilePattern = `${inputDirectory}/(${themeFilesPattern})`;",
      // Reading a request value into a variable is not itself a vulnerability, and
      // the variable being CALLED `ldapQuery` is not evidence that it is one. The
      // report belongs where the value reaches a filter or a DN.
      "import ldapjs from 'ldapjs';\nconst ldapQuery = req.query.filter;",
    ],
    invalid: [
      // …and the identical value IS reported once it is built into filter grammar,
      // so the gate removed a false positive rather than the detection.
      {
        code: "import ldapjs from 'ldapjs';\nconst filter = `(uid=${req.query.uid})`;",
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      // Every load spelling opens the gate, through the shared devkit probe:
      // `require`, dynamic `import()`, `import =`, and Deno's `npm:` prefix.
      {
        code: "const ldap = require('ldapts');\nconst filter = `(uid=${req.query.uid})`;",
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      {
        code: "const ldap = await import('activedirectory2');\nconst filter = `(uid=${req.query.uid})`;",
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      {
        code: "import ldap = require('@ldapjs/filter');\nconst filter = `(uid=${req.query.uid})`;",
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      {
        code: "import ldap from 'npm:ldapjs';\nconst filter = `(uid=${req.query.uid})`;",
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
    ],
  });
});

/**
 * Every option in `meta.schema`, exercised so that setting it CHANGES the
 * verdict.
 *
 * The bar is deliberately not "the option is mentioned in a test". A case that
 * reports the same way with and without the setting executes the line and
 * proves nothing about it — the branch could be deleted and the suite would
 * stay green. Each pair below is the same source with and without one option,
 * and the two halves disagree.
 */
describe('option branches', () => {
  const SANITIZED =
    "import ldapjs from 'ldapjs';\n" +
    'const userInput = ldapClean(req.query.name);\n' +
    'client.search(baseDN, userInput, options);';
  const ANNOTATED =
    "import ldapjs from 'ldapjs';\n" +
    '// @ldap-reviewed\n' +
    'const filter = `(uid=${req.query.uid})`;';
  const BUILT_IN_ANNOTATION =
    "import ldapjs from 'ldapjs';\n// @safe\nconst filter = `(uid=${req.query.uid})`;";

  ruleTester.run('trustedSanitizers silences a custom escaper', noLdapInjection, {
    valid: [{ code: SANITIZED, options: [{ trustedSanitizers: ['ldapClean'] }] }],
    // …and without it, the very same source is reported. `ldapClean` is not in
    // the devkit's built-in SANITIZATION_FUNCTIONS, and membership there is
    // exact, so nothing but the option can account for the difference.
    invalid: [{ code: SANITIZED, errors: [{ messageId: 'unescapedLdapInput' }] }],
  });

  ruleTester.run('trustedAnnotations honours a project marker', noLdapInjection, {
    valid: [
      { code: ANNOTATED, options: [{ trustedAnnotations: ['@ldap-reviewed'] }] },
    ],
    invalid: [{ code: ANNOTATED, errors: [{ messageId: 'unsafeLdapFilter' }] }],
  });

  ruleTester.run('strictMode ignores the safety checker', noLdapInjection, {
    // `@safe` is a built-in SAFE_ANNOTATION, so this is quiet by default…
    valid: [BUILT_IN_ANNOTATION],
    // …and strictMode turns every suppression off, including that one.
    invalid: [
      {
        code: BUILT_IN_ANNOTATION,
        options: [{ strictMode: true }],
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
    ],
  });

  ruleTester.run('ldapFunctions redefines the sink set', noLdapInjection, {
    // `lookup` is not an LDAP sink by default, so the interpolation is unseen…
    valid: ["import ldapjs from 'ldapjs';\nclient.lookup(baseDN, `(cn=${req.query.name})`, options);"],
    invalid: [
      // …until the caller names it one.
      {
        code: "import ldapjs from 'ldapjs';\nclient.lookup(baseDN, `(cn=${req.query.name})`, options);",
        options: [{ ldapFunctions: ['lookup'] }],
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
    ],
  });

  // The converse direction, and the more useful one to pin: the option
  // REPLACES the sink set rather than extending it. A consumer who adds one
  // method of their own silently loses all seven defaults — `client.search`,
  // the canonical CWE-90 sink, stops being examined at all.
  ruleTester.run('ldapFunctions replaces rather than extends', noLdapInjection, {
    valid: [
      {
        code: "import ldapjs from 'ldapjs';\nclient.search(baseDN, `(cn=${req.query.name})`, options);",
        options: [{ ldapFunctions: ['lookup'] }],
      },
    ],
    invalid: [
      {
        code: "import ldapjs from 'ldapjs';\nclient.search(baseDN, `(cn=${req.query.name})`, options);",
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
    ],
  });
});

/**
 * LOCKS — every defect the per-rule corpus proved.
 *
 * benchmarks/rule-corpus/secure-coding__no-ldap-injection scored 42.9% F1 before these
 * (30.0% after its adversarial wave). Each case below is red on the pre-fix rule.
 */
describe('no-ldap-injection — corpus locks', () => {
  ruleTester.run('the canonical ldapjs search idiom', noLdapInjection, {
    valid: [],
    invalid: [
      {
        // ldapjs has NO positional-filter overload for `search`; the filter lives on
        // the OPTIONS OBJECT, exactly as its README writes it. The rule looked only at
        // argument 1 as a string, so the single commonest real spelling of CWE-90 was
        // invisible — and so was every ldapts `client.search(base, { filter })`.
        code: [
          "import ldap from 'ldapjs';",
          "const client = ldap.createClient({ url: 'ldaps://d' });",
          "client.search('dc=example,dc=com', { filter: `(uid=${req.query.uid})`, scope: 'sub' }, cb);",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      {
        // …including through a spread and a COMPUTED key resolved from a constant.
        code: [
          "import ldap from 'ldapjs';",
          "const client = ldap.createClient({ url: 'ldaps://d' });",
          "const FILTER_KEY = 'filter';",
          "const BASE = { scope: 'sub' };",
          'const options = { ...BASE, [FILTER_KEY]: `(uid=${req.query.uid})` };',
          "client.search('dc=example,dc=com', options, cb);",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
    ],
  });

  ruleTester.run('argument 1 is a filter only for the search family', noLdapInjection, {
    valid: [
      // `client.bind(dn, password, cb)` — the canonical ldapjs service-account bind.
      // A bind password is a protocol field with no filter grammar to escape out of.
      // Reported as CWE-90 before the fix, because `password` was on a list of
      // "untrusted-looking variable names".
      [
        "import ldap from 'ldapjs';",
        "const client = ldap.createClient({ url: 'ldaps://d' });",
        "const SERVICE_DN = 'cn=svc,ou=service,dc=example,dc=com';",
        'const password = process.env.LDAP_BIND_PASSWORD;',
        'client.bind(SERVICE_DN, password, cb);',
      ].join('\n'),
      // `client.add(dn, entry, cb)` — argument 1 is an ATTRIBUTE MAP. Reported before
      // the fix because the variable name began with "user".
      [
        "import ldap from 'ldapjs';",
        "const client = ldap.createClient({ url: 'ldaps://d' });",
        "const ONBOARDING_DN = 'cn=pending,ou=onboarding,dc=example,dc=com';",
        'const userEntry = { cn: req.body.commonName, sn: req.body.surname };',
        'client.add(ONBOARDING_DN, userEntry, cb);',
      ].join('\n'),
    ],
    invalid: [],
  });

  ruleTester.run('DN injection, which has no parentheses to look for', noLdapInjection, {
    valid: [],
    invalid: [
      {
        // A distinguished name contains no `(` or `)`, so the old
        // `text.includes('(') && text.includes(')')` guard made DN injection
        // undetectable by construction. `del` was also missing from the sink list
        // entirely — ldapjs spells delete `del`.
        code: [
          "import ldap from 'ldapjs';",
          "const client = ldap.createClient({ url: 'ldaps://d' });",
          "const dn = 'uid=' + req.params.uid + ',ou=people,dc=example,dc=com';",
          'client.del(dn, cb);',
        ].join('\n'),
        errors: [{ messageId: 'ldapInjection' }],
      },
    ],
  });

  ruleTester.run('taint decided by evidence, not by spelling', noLdapInjection, {
    valid: [
      // A frozen lookup table. Every value is a literal written in this file; the
      // request only picks WHICH one. Reported before the fix because the printed
      // text of the initializer contained the substring `req.`.
      [
        "import ldap from 'ldapjs';",
        "const client = ldap.createClient({ url: 'ldaps://d' });",
        "const FILTERS = Object.freeze({ eng: '(ou=engineering)', sales: '(ou=sales)' });",
        'const filter = FILTERS[req.params.department];',
        "client.search('dc=example,dc=com', { filter, scope: 'sub' }, cb);",
      ].join('\n'),
      // `add`, `delete` and `search` are also Set, Map and Array methods. The file
      // imports ldapjs, so the gate is open, and these are still not LDAP calls.
      [
        "import ldap from 'ldapjs';",
        'const seenAttributes = new Set();',
        'const entryCache = new Map();',
        'seenAttributes.add(req.body.attributeName, entry);',
        'entryCache.delete(req.params.dn, entry);',
      ].join('\n'),
    ],
    invalid: [
      {
        // The same injection with every identifier renamed to an innocuous word: no
        // `req`, `query`, `user`, `input`, `filter` or `dn` anywhere. Silent before
        // the fix — the false-negative direction nobody runs.
        code: [
          "import ldap from 'ldapjs';",
          "const client = ldap.createClient({ url: 'ldaps://d' });",
          'const criterion = envelope.parsed.needle;',
          'const spec = `(uid=${criterion})`;',
          "client.search('dc=example,dc=com', { filter: spec, scope: 'sub' }, onDone);",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      {
        // A LOCAL function wearing a trusted name, whose body returns its argument
        // unchanged. The spelling of the callee is not the evidence.
        code: [
          "import ldap from 'ldapjs';",
          "const client = ldap.createClient({ url: 'ldaps://d' });",
          'function escapeFilterValue(value) { return value; }',
          'const filter = `(uid=${escapeFilterValue(req.query.uid)})`;',
          "client.search('dc=example,dc=com', { filter, scope: 'sub' }, cb);",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
    ],
  });
});

/**
 * Branch coverage for the structural machinery that replaced the name lists:
 * local-binding collection, receiver resolution, `dynamicParts`, `staticSkeleton`,
 * the request-root walk and the options-object `filter` lookup.
 */
describe('no-ldap-injection — structural machinery', () => {
  ruleTester.run('LDAP local collection and receiver resolution', noLdapInjection, {
    valid: [
      // A NAMESPACE import and a DESTRUCTURED require both bind LDAP locals; a Set
      // built in the same file is still a Set.
      [
        "import * as ldap from 'ldapjs';",
        'const bag = new Set();',
        'bag.add(req.body.x, req.body.y);',
      ].join('\n'),
      [
        "const { createClient } = require('ldapjs');",
        'const cache = new Map();',
        'cache.delete(req.params.k, v);',
      ].join('\n'),
      // A require of something else binds nothing.
      [
        "import ldap from 'ldapjs';",
        "const util = require('node:util');",
        'const bag = new Set();',
        'bag.add(req.body.x, req.body.y);',
      ].join('\n'),
      // A receiver that is an object literal, an array literal or a string.
      "import ldap from 'ldapjs';\nconst o = { add(a, b) {} }; o.add(req.body.x, req.body.y);",
      "import ldap from 'ldapjs';\n['a'].search(req.body.x, req.body.y);",
      "import ldap from 'ldapjs';\n'abc'.search(req.body.x, req.body.y);",
      // A receiver produced by a call that is NOT an LDAP construction.
      "import ldap from 'ldapjs';\nconst q = makeQueue(); q.add(req.body.x, req.body.y);",
      "import ldap from 'ldapjs';\nmakeQueue().add(req.body.x, req.body.y);",
      "import ldap from 'ldapjs';\nnew Queue().add(req.body.x, req.body.y);",
      // A class field that is NOT an LDAP construction.
      [
        "import ldap from 'ldapjs';",
        'class Svc { store = new Map(); m() { this.store.delete(req.params.dn, v); } }',
      ].join('\n'),
      // A `this.x` receiver with no matching field declaration is unresolvable, and a
      // benign argument keeps it quiet either way.
      [
        "import ldap from 'ldapjs';",
        "class Svc { m() { this.client.search(BASE, { filter: '(cn=admin)' }, cb); } }",
        "const BASE = 'dc=example,dc=com';",
      ].join('\n'),
      // A computed callee is not a method name the rule can read.
      "import ldap from 'ldapjs';\nconst m = 'search'; client[m](req.body.dn, req.body.f);",
      // Fewer arguments than the shape needs.
      "import ldap from 'ldapjs';\nconst client = ldap.createClient({}); client.search();",
    ],
    invalid: [
      // A class field constructed from a NAMED import.
      {
        code: [
          "import { Client } from 'ldapts';",
          'class Svc {',
          "  client = new Client({ url: 'ldaps://d' });",
          '  find(login) {',
          '    return this.client.search(BASE, { filter: `(uid=${login})` });',
          '  }',
          '}',
          "const BASE = 'dc=example,dc=com';",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      // A class field constructed through a NAMESPACE import member.
      {
        code: [
          "import * as ldapts from 'ldapts';",
          'class Svc {',
          "  client = new ldapts.Client({ url: 'ldaps://d' });",
          '  find(login) {',
          '    return this.client.search(BASE, { filter: `(uid=${login})` });',
          '  }',
          '}',
          "const BASE = 'dc=example,dc=com';",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      // A destructured require binds the factory name directly.
      {
        code: [
          "const { createClient } = require('ldapjs');",
          'const client = createClient({});',
          'client.search(BASE, { filter: `(uid=${login})` }, cb);',
          "const BASE = 'dc=example,dc=com';",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
    ],
  });

  ruleTester.run('dynamicParts, staticSkeleton and the filter lookup', noLdapInjection, {
    valid: [
      // Numeric concatenation is not a string, so it is not a filter.
      "import ldap from 'ldapjs';\nconst n = offset + limit; client.del(n, cb);",
      // A ternary neither branch of which is a string construction.
      "import ldap from 'ldapjs';\nconst dn = flag ? a : b; client.del(dn, cb);",
      // An options object with no `filter` property, and a computed key that resolves
      // to something else.
      [
        "import ldap from 'ldapjs';",
        "const KEY = 'scope';",
        "client.search(BASE, { scope: 'sub', [KEY]: 'one' }, cb);",
        "const BASE = 'dc=example,dc=com';",
      ].join('\n'),
      // A computed key that cannot be resolved at all, plus a spread.
      [
        "import ldap from 'ldapjs';",
        'client.search(BASE, { ...extra, [dynamicKey]: value }, cb);',
        "const BASE = 'dc=example,dc=com';",
      ].join('\n'),
      // A second argument that is a bare identifier with more than one write.
      [
        "import ldap from 'ldapjs';",
        "let opts = { filter: '(cn=a)' };",
        "opts = { filter: '(cn=b)' };",
        'client.search(BASE, opts, cb);',
        "const BASE = 'dc=example,dc=com';",
      ].join('\n'),
      // `filter` written as a STRING-literal key, holding a constant.
      [
        "import ldap from 'ldapjs';",
        "client.search(BASE, { 'filter': '(objectClass=person)' }, cb);",
        "const BASE = 'dc=example,dc=com';",
      ].join('\n'),
      // Cyclic bindings must terminate and claim nothing.
      "import ldap from 'ldapjs';\nvar a = b; var b = a; client.del(a, cb);",
      // A request root that is a plain undeclared identifier chain.
      "import ldap from 'ldapjs';\nclient.del(someGlobal.dn, cb);",
      // A root declared from something that is not a request.
      "import ldap from 'ldapjs';\nconst q = makeThing(); client.del(q.dn, cb);",
      // A root declared with no initializer.
      "import ldap from 'ldapjs';\nlet q; client.del(q.dn, cb);",
      // An assignment whose right side is not filter grammar.
      "import ldap from 'ldapjs';\nlet label; label = 'uid=' + userId;",
      // A `.length` read is not a DN.
      "import ldap from 'ldapjs';\nclient.del(entries.length, cb);",
    ],
    invalid: [
      // A ternary whose consequent alone is a filter construction.
      {
        code: [
          "import ldap from 'ldapjs';",
          "const ALL = '(objectClass=person)';",
          'const filter = flag ? `(cn=${req.query.cn})` : ALL;',
          'client.search(BASE, { filter }, cb);',
          "const BASE = 'dc=example,dc=com';",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      // A ternary whose ALTERNATE alone is a filter construction.
      {
        code: [
          "import ldap from 'ldapjs';",
          "const ALL = '(objectClass=person)';",
          'const filter = flag ? ALL : `(cn=${req.query.cn})`;',
          'client.search(BASE, { filter }, cb);',
          "const BASE = 'dc=example,dc=com';",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      // A ternary DN, reached through the assignment visitor.
      {
        code: [
          "import ldap from 'ldapjs';",
          'let filter;',
          'filter = `(cn=${req.query.cn})`;',
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      // A `filter` reached through a STRING-literal key.
      {
        code: [
          "import ldap from 'ldapjs';",
          "client.search(BASE, { 'filter': `(cn=${req.query.cn})` }, cb);",
          "const BASE = 'dc=example,dc=com';",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      // A request root that was destructured out of a destructured request.
      {
        code: [
          "import ldap from 'ldapjs';",
          'const q = req.query;',
          'client.search(BASE, q.filter, cb);',
          "const BASE = 'dc=example,dc=com';",
        ].join('\n'),
        errors: [{ messageId: 'unescapedLdapInput' }],
      },
    ],
  });
});

describe('no-ldap-injection — remaining structural arms', () => {
  ruleTester.run('binding forms, receivers and roots', noLdapInjection, {
    valid: [
      // An array-pattern require binds no readable LDAP local.
      "const [ldap] = require('ldapjs');\nconst bag = new Set();\nbag.add(req.body.x, y);",
      // A rest element in a destructured require.
      "const { ...rest } = require('ldapjs');\nconst bag = new Set();\nbag.add(req.body.x, y);",
      // A receiver produced by `new` and bound to a name…
      "import ldap from 'ldapjs';\nconst q = new Queue();\nq.add(req.body.x, y);",
      // …and every other literal form a collection can arrive in.
      "import ldap from 'ldapjs';\nconst q = [];\nq.search(req.body.x, y);",
      "import ldap from 'ldapjs';\nconst q = {};\nq.add(req.body.x, y);",
      "import ldap from 'ldapjs';\nconst q = 'abc';\nq.search(req.body.x, y);",
      // A write that is none of those keeps the receiver unresolved, so `every` is
      // false and the call is examined — the argument here is a constant.
      "import ldap from 'ldapjs';\nconst q = other;\nq.search(BASE, '(cn=admin)');\nconst BASE = 'dc=x';",
      // A PRIVATE method shares the name but is not a member the rule can read.
      "import ldap from 'ldapjs';\nclass S { #search(a, b) {} m() { this.#search(req.body.x, y); } }",
      // A member chain whose ROOT is not an identifier at all.
      "import ldap from 'ldapjs';\nclass S { m() { this.req.query.filter; client.del(this.req.query.dn, cb); } }",
      // A root that is a function PARAMETER, not a variable declaration.
      "import ldap from 'ldapjs';\nfunction f(query) { client.search(BASE, query.filter, cb); }",
      // An assignment in a file with no LDAP client at all.
      "let label;\nlabel = '(cn=' + userInput + ')';",
      // A numeric literal reaching the static-text walk.
      "import ldap from 'ldapjs';\nlet total;\ntotal = 5 + offset;",
    ],
    invalid: [
      // `this.client` used outside any class body — there is no field to read, so the
      // receiver is unresolvable rather than provably non-LDAP, and the filter is
      // still examined.
      {
        code: [
          "import ldap from 'ldapjs';",
          'function handler(req) {',
          '  this.client.search(BASE, { filter: `(uid=${req.query.uid})` }, cb);',
          '}',
          "const BASE = 'dc=example,dc=com';",
        ].join('\n'),
        errors: [{ messageId: 'unsafeLdapFilter' }],
      },
      // A TypeScript cast around the DN is unwrapped.
      {
        code: [
          "import ldap from 'ldapjs';",
          'const dn = req.params.dn as string;',
          'client.del(dn, cb);',
        ].join('\n'),
        errors: [{ messageId: 'ldapInjection' }],
      },
      // Receivers none of the resolution arms can settle: a template literal, a nested
      // `this.a.b`, a computed `this[k]`. None is PROVABLY a collection, so the DN
      // argument is still examined — the gate is negative evidence by design.
      {
        code: "import ldap from 'ldapjs';\n`abc`.search(req.body.x, y);",
        errors: [{ messageId: 'ldapInjection' }],
      },
      {
        code: "import ldap from 'ldapjs';\nclass S { m() { this.a.b.search(req.body.x, y); } }",
        errors: [{ messageId: 'ldapInjection' }],
      },
      {
        code: "import ldap from 'ldapjs';\nclass S { m() { this[k].search(req.body.x, y); } }",
        errors: [{ messageId: 'ldapInjection' }],
      },
    ],
  });
});
