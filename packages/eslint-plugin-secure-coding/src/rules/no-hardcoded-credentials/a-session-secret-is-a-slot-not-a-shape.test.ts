/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The `secret` handed to a session middleware.
 *
 * `session({ secret: 'keyboard cat' })` is the example on express-session's own
 * README, and the value reads as prose, so every shape test in this rule
 * (correctly) refuses it. What identifies it is the call: a function loaded from
 * `express-session` or `cookie-session` whose `secret` is the key every cookie is
 * signed with. A literal there is hardcoded whatever it looks like.
 *
 * Every report has a control: the same literal in a call to something that is not
 * a session package, a lookup instead of a literal, and a locally defined function
 * that happens to be called `session`.
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
  'no-hardcoded-credentials — a session secret is a slot, not a shape',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'process.env is the lookup the rule asks for',
        code: `import session from 'express-session';
          app.use(session({ secret: process.env.SESSION_SECRET }));`,
      },
      {
        name: 'a config lookup is not a literal',
        code: `import session from 'express-session';
          app.use(session({ secret: config.session.secret, resave: false }));`,
      },
      {
        name: 'a process.env default is the development fallback the rule already allows',
        code: `import session from 'express-session';
          app.use(session({ secret: process.env.SESSION_SECRET || 'keyboard cat' }));`,
      },
      {
        name: 'a self-evident placeholder is documentation',
        code: `import session from 'express-session';
          app.use(session({ secret: '<your-secret-here>' }));`,
      },
      {
        name: 'the same literal in a call to some other package is not a session secret',
        code: `import session from 'my-own-session-lib';
          app.use(session({ secret: 'keyboard cat' }));`,
      },
      {
        name: 'a locally defined function called session is not the middleware',
        code: `function session(options) { return options; }
          app.use(session({ secret: 'keyboard cat' }));`,
      },
      {
        name: 'a session variable declared with no initialiser is not evidence',
        code: `var session;
          app.use(session({ secret: 'keyboard cat' }));`,
      },
      {
        name: 'a session global with no import is not evidence',
        code: `app.use(session({ secret: 'keyboard cat' }));`,
      },
      {
        name: 'a non-secret option of the middleware is not the signing key',
        code: `import session from 'express-session';
          app.use(session({ name: 'sid', secret: process.env.S, cookie: { path: '/app' } }));`,
      },
      {
        name: 'express-session has no `keys` option, so a literal there is not a signing key',
        code: `import session from 'express-session';
          app.use(session({ secret: process.env.S, keys: ['a-b-c-d'] }));`,
      },
      {
        name: 'a secret passed in a second argument is not the options object',
        code: `import session from 'express-session';
          app.use(session(options, { secret: 'keyboard cat' }));`,
      },
      {
        name: 'a value the project listed in ignorePatterns is left alone',
        options: [{ ignorePatterns: ['keyboard cat'] }],
        code: `import session from 'express-session';
          app.use(session({ secret: 'keyboard cat' }));`,
      },
      {
        name: 'an empty string names no secret',
        code: `import session from 'express-session';
          app.use(session({ secret: '' }));`,
      },
      {
        name: 'a key computed at runtime names no slot',
        code: `import session from 'express-session';
          app.use(session({ [name]: 'keyboard cat' }));`,
      },
      {
        name: 'a test file may use a literal',
        filename: 'app.test.ts',
        code: `import session from 'express-session';
          app.use(session({ secret: 'keyboard cat' }));`,
      },
    ],
    invalid: [
      {
        name: 'express-session, the README example (prose, not secret-shaped)',
        code: `import session from 'express-session';
          app.use(session({ secret: 'keyboard cat', resave: false }));`,
        errors: REPORTED,
      },
      {
        name: 'express-session through require, as DVNA wires it',
        code: `const session = require('express-session');
          app.use(session({ secret: 'keyboard cat', resave: true }));`,
        errors: REPORTED,
      },
      {
        name: 'the import can be renamed',
        code: `import expressSession from 'express-session';
          app.use(expressSession({ secret: 'keyboard cat' }));`,
        errors: REPORTED,
      },
      {
        name: 'cookie-session accepts `secret` too',
        code: `import cookieSession from 'cookie-session';
          app.use(cookieSession({ secret: 'keyboard cat' }));`,
        errors: REPORTED,
      },
      {
        name: 'cookie-session `keys` is its signing key list',
        code: `const cookieSession = require('cookie-session');
          app.use(cookieSession({ keys: ['one', 'two'] }));`,
        errors: [...REPORTED, ...REPORTED],
      },
      {
        name: 'express-session accepts an array of secrets',
        code: `import session from 'express-session';
          app.use(session({ secret: ['new one', 'old one'] }));`,
        errors: [...REPORTED, ...REPORTED],
      },
      {
        name: 'a quoted key is the same key',
        code: `import session from 'express-session';
          app.use(session({ 'secret': 'keyboard cat' }));`,
        errors: REPORTED,
      },
      {
        name: 'an ignorePatterns entry that does not match leaves the finding',
        options: [{ ignorePatterns: ['something else'] }],
        code: `import session from 'express-session';
          app.use(session({ secret: 'keyboard cat' }));`,
        errors: REPORTED,
      },
      {
        name: 'a computed string key is the same key',
        code: `import session from 'express-session';
          app.use(session({ ['secret']: 'keyboard cat' }));`,
        errors: REPORTED,
      },
      {
        name: 'the middleware required inline',
        code: `app.use(require('express-session')({ secret: 'keyboard cat' }));`,
        errors: REPORTED,
      },
    ],
  },
);
