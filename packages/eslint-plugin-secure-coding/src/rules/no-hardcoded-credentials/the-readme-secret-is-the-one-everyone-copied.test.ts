/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `session({ secret: 'keyboard cat' })` is express-session's README placeholder and is
 * widely copied into production. Three gaps in how the session-secret check reached it:
 *
 * 1. Well-known copied secrets (`changeme`, `your-secret-key`, ...) were quiet under the
 *    default `allowPlaceholders`, because they read as placeholders. In the signing slot
 *    of a session middleware they are the real secret. Bracketed templates stay quiet.
 * 2. The options object held in a `const` and passed on: `const opts = { secret }`.
 * 3. Fastify's plugin form: `fastify.register(fastifySession, { secret })`.
 *
 * Narrow on purpose: the same strings anywhere else, in a test file, behind
 * `allowPlaceholders` for an unlisted word, or in an unrelated package stay quiet.
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
const IM = `import session from 'express-session';\n`;

ruleTester.run(
  'no-hardcoded-credentials — copied session secrets',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'an empty knownSessionSecrets list leaves changeme as a placeholder',
        options: [{ knownSessionSecrets: [] }],
        code: `${IM}app.use(session({ secret: 'changeme' }));`,
      },
      {
        name: 'a bracketed template is documentation',
        code: `${IM}app.use(session({ secret: '<your-secret-here>' }));`,
      },
      {
        name: 'an unlisted placeholder word still reads as a placeholder',
        code: `${IM}app.use(session({ secret: 'replace-me-please' }));`,
      },
      {
        name: 'the same word outside a session call',
        code: `const config = { secret: 'changeme' };`,
      },
      {
        name: 'a test file',
        filename: 'app.test.ts',
        code: `${IM}app.use(session({ secret: 'changeme' }));`,
      },
      {
        name: 'some other package',
        code: `import session from 'my-session';\napp.use(session({ secret: 'changeme' }));`,
      },
      {
        name: 'a hoisted object that never reaches a session call',
        code: `${IM}const opts = { secret: 'changeme' };\nuse(opts);`,
      },
      {
        name: 'a hoisted let is not followed',
        code: `${IM}let opts = { secret: 'changeme' };\napp.use(session(opts));`,
      },
      {
        name: 'register with a non-session plugin',
        code: `import cors from '@fastify/cors';\nfastify.register(cors, { secret: 'changeme' });`,
      },
      {
        name: 'a fastify session loaded with a lookup',
        code: `import fastifySession from '@fastify/session';\nfastify.register(fastifySession, { secret: process.env.S });`,
      },
      {
        name: 'express-session through register is not the fastify shape',
        code: `${IM}fastify.register(session, { secret: 'changeme' });`,
      },
      {
        name: 'a call that is neither the middleware nor register',
        code: `${IM}other.use(session, { secret: 'changeme' });`,
      },
    ],
    invalid: [
      {
        name: 'a project-listed copied secret is reported, matched case-insensitively',
        options: [{ knownSessionSecrets: ['Replace-This'] }],
        code: `${IM}app.use(session({ secret: 'replace-this' }));`,
        errors: REPORTED,
      },
      {
        name: 'changeme, default options',
        code: `${IM}app.use(session({ secret: 'changeme' }));`,
        errors: REPORTED,
      },
      {
        name: 'your-secret-key, default options',
        code: `${IM}app.use(session({ secret: 'your-secret-key' }));`,
        errors: REPORTED,
      },
      {
        name: 'secret, allowPlaceholders off',
        options: [{ allowPlaceholders: false }],
        code: `${IM}app.use(session({ secret: 'secret' }));`,
        errors: REPORTED,
      },
      {
        name: 'CHANGE_ME in any case',
        code: `${IM}app.use(session({ secret: ' CHANGE_ME ' }));`,
        errors: REPORTED,
      },
      {
        name: 'options held in a const',
        code: `${IM}const opts = { secret: 'keyboard cat', resave: false };\napp.use(session(opts));`,
        errors: REPORTED,
      },
      {
        name: 'fastify plugin form',
        code: `import fastifySession from '@fastify/session';\nfastify.register(fastifySession, { secret: 'keyboard cat' });`,
        errors: REPORTED,
      },
      {
        name: 'the older fastify package',
        code: `const fastifySession = require('fastify-session');\nfastify.register(fastifySession, { secret: 'changeme' });`,
        errors: REPORTED,
      },
    ],
  },
);
