/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A `const` object literal handed to a TypeScript `import x = require()` binding
 * must not abort the run.
 *
 * Found scanning cal.com (2026-11-26): a method with `const params = { … 'code' … }`
 * threw `TypeError: Cannot read properties of undefined (reading 'value')` out of
 * `sessionPackageOf` and ended the whole eslint process (exit 2, no report at all).
 *
 * Root cause: a scope-manager `ImportBinding` is declared by an `ImportDeclaration`
 * OR by `import x = require('m')` (`TSImportEqualsDeclaration`), and the second has
 * no `source`. The rule read `.source.value` off both. The minimal trigger is a
 * const object literal that the same scope passes to a function bound by
 * `import-equals`; the method body is irrelevant.
 *
 * The fix resolves the module of an import-equals too, so the declaration that
 * used to crash now answers "is this a session package?" correctly in both
 * directions: `import session = require('express-session')` is detected, other
 * modules and non-module aliases are not.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const REPORTED = [
  {
    messageId: 'useEnvironmentVariable' as const,
    data: { credentialType: 'Session secret', envVarName: 'SESSION_SECRET' },
    suggestions: 2,
  },
];

ruleTester.run(
  'no-hardcoded-credentials — import-equals bindings do not crash',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'the cal.com shape as triaged: destructured client_id, const params in a method',
        code: `
class Svc {
  async generateAuthUrl(state: string) {
    const { client_id } = await this.getKeys();
    const params = { response_type: "code", client_id, state: state };
  }
}`,
      },
      {
        name: 'crash: const options passed to an import-equals binding in a method',
        code: `
import post = require("./post");
class Svc {
  async go() {
    const params = { response_type: "code", grant_type: "authorization_code" };
    post(params);
  }
}`,
      },
      {
        name: 'control: import-equals of a module that is not a session package',
        code: `
import post = require("some-http-client");
const opts = { secret: "keyboard cat" };
post(opts);`,
      },
      {
        name: 'control: import-equals of an entity name is no module at all',
        code: `
import session = Outer.Inner;
const opts = { secret: "keyboard cat" };
session(opts);`,
      },
      {
        name: 'control: options handed to a lib global, a binding with no definition',
        code: `
const opts = { secret: "keyboard cat" };
String(opts);`,
      },
    ],
    invalid: [
      {
        name: 'import-equals of express-session is the session middleware',
        code: `
import session = require("express-session");
app.use(session({ secret: "keyboard cat" }));`,
        errors: REPORTED,
      },
      {
        name: 'import-equals of express-session, options held in a const',
        code: `
import session = require("express-session");
class Svc {
  build() {
    const opts = { secret: "keyboard cat" };
    return session(opts);
  }
}`,
        errors: REPORTED,
      },
    ],
  },
);
