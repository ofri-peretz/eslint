/**
 * Tests for no-self-signed-certs rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSelfSignedCerts } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-self-signed-certs', () => {
  ruleTester.run('no-self-signed-certs', noSelfSignedCerts, {
    valid: [
      {
        name: 'the default verification',
        code: 'https.request({ hostname: "example.com" }, callback);',
      },
      {
        name: 'tls.connect with rejectUnauthorized true is not reported',
        code: 'tls.connect({ rejectUnauthorized: true });',
      },
      {
        name: 'pinning a custom CA keeps verification on',
        code: 'const options = { ca: customCA };',
      },
      {
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";',
        name: 'setting NODE_TLS_REJECT_UNAUTHORIZED to 1 keeps verification on',
      },
      {
        name: 'a non-literal rejectUnauthorized is not proven false',
        code: 'const x = { rejectUnauthorized: validated };',
      },
      {
        code: 'https.request({ hostname: "example.com", rejectUnauthorized: true });',
      },
    ],
    invalid: [
      {
        name: 'rejectUnauthorized false accepts any certificate',
        code: 'https.request({ rejectUnauthorized: false }, callback);',
        errors: [
          {
            messageId: 'insecureTls',
            suggestions: [
              {
                messageId: 'enableValidation',
                output:
                  'https.request({ rejectUnauthorized: true }, callback);',
              },
            ],
          },
        ],
      },
      {
        name: 'rejectUnauthorized false on a tls.connect',
        code: 'tls.connect({ rejectUnauthorized: false });',
        errors: [
          {
            messageId: 'insecureTls',
            suggestions: [
              {
                messageId: 'enableValidation',
                output: 'tls.connect({ rejectUnauthorized: true });',
              },
            ],
          },
        ],
      },
      {
        code: 'const options = { rejectUnauthorized: false };',
        errors: [
          {
            messageId: 'insecureTls',
            suggestions: [
              {
                messageId: 'enableValidation',
                output: 'const options = { rejectUnauthorized: true };',
              },
            ],
          },
        ],
      },
      {
        code: 'const tls = { cert: ca, rejectUnauthorized: false };',
        errors: [
          {
            messageId: 'insecureTls',
            suggestions: [
              {
                messageId: 'enableValidation',
                output: 'const tls = { cert: ca, rejectUnauthorized: true };',
              },
            ],
          },
        ],
      },
      {
        code: 'fetch(url, { rejectUnauthorized: false });',
        errors: [
          {
            messageId: 'insecureTls',
            suggestions: [
              {
                messageId: 'enableValidation',
                output: 'fetch(url, { rejectUnauthorized: true });',
              },
            ],
          },
        ],
      },
    ],
  });

  // A certificate check relaxed in a TEST file.
  //
  // An integration test that points at a local server with a self-signed
  // certificate has no other way to talk to it. Verified on
  // mariadb-corporation/mariadb-connector-nodejs: 41 findings between this rule
  // and its sibling, every single one under `test/`.
  ruleTester.run('no-self-signed-certs - test files', noSelfSignedCerts, {
    valid: [
      {
        code: `const agent = new https.Agent({ rejectUnauthorized: false });`,
        filename: 'test/conf.js',
        options: [{ allowInTests: true }],
      },
    ],
    invalid: [
      // Production code is untouched.
      {
        code: `const agent = new https.Agent({ rejectUnauthorized: false });`,
        filename: 'lib/client.js',
        options: [{ allowInTests: true }],
        errors: 1,
      },
      // Without the opt-in, a test file is unchanged — this rule owns the
      // decision through `allowInTests`, so it must NOT also take the devkit's
      // `skipTestFiles`, which runs before `create()` and would make the option
      // dead. That trap is documented and I walked into it once here.
      {
        code: `const agent = new https.Agent({ rejectUnauthorized: false });`,
        filename: 'test/conf.js',
        errors: 1,
      },
    ],
  });

  ruleTester.run('mutation-guided edges', noSelfSignedCerts, {
    valid: [
      {
        name: 'a false on any other TLS key is not a disabled certificate check',
        code: 'tls.connect({ host, port, requestCert: false });',
      },
      {
        name: 'a numeric 0 for rejectUnauthorized still verifies (Node tests `!== false`)',
        code: 'tls.connect({ rejectUnauthorized: 0 });',
      },
      {
        name: 'a plain variable assignment is not an env-var write',
        code: 'let rejectUnauthorized = true;\nrejectUnauthorized = 0;',
      },
      {
        name: "another env var set to '0' is not the TLS switch",
        code: "process.env.DEBUG = '0';",
      },
      {
        name: 'a property of process other than env is not the environment',
        code: "process.config.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
      },
      {
        name: "the string 'false' does not disable verification (only '0' does)",
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = false;',
      },
      {
        name: 'a test file is exempt only when allowInTests is on',
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
        filename: 'test/setup.js',
        options: [{ allowInTests: true }],
      },
      {
        name: 'an env object that is not process.env is not the environment',
        code: "config.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
      },
      {
        name: 'a process property of an object other than globalThis is not the process',
        code: "sandbox.process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
      },
      {
        name: 'a globalThis property other than process is not the process',
        code: "globalThis.config.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
      },
      {
        name: "the env switch set to '1' keeps verification on",
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';",
      },
      {
        name: 'the env switch set to the number 1 keeps verification on',
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = 1;',
      },
    ],
    invalid: [
      {
        name: 'an agent built inside an axios interceptor is still reported',
        code: [
          'axios.interceptors.request.use((config) => {',
          '  config.httpsAgent = new https.Agent({ rejectUnauthorized: false });',
          '  return config;',
          '});',
        ].join('\n'),
        errors: [
          {
            messageId: 'insecureTls',
            suggestions: [
              {
                messageId: 'enableValidation',
                output: [
                  'axios.interceptors.request.use((config) => {',
                  '  config.httpsAgent = new https.Agent({ rejectUnauthorized: true });',
                  '  return config;',
                  '});',
                ].join('\n'),
              },
            ],
          },
        ],
      },
      {
        name: 'the env switch written with a bracket key is reported',
        code: "process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';",
        errors: [{ messageId: 'insecureTls' }],
      },
      {
        name: 'the env switch set through globalThis.process is reported',
        code: "globalThis.process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
        errors: [{ messageId: 'insecureTls' }],
      },
      {
        name: 'the env switch set with a template literal is reported',
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = `0`;',
        errors: [{ messageId: 'insecureTls' }],
      },
      {
        name: 'the env switch in a test path is reported without allowInTests',
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
        filename: 'test/setup.js',
        errors: [{ messageId: 'insecureTls' }],
      },
      {
        name: 'the env switch outside a test path is reported even with allowInTests',
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
        filename: 'src/setup.js',
        options: [{ allowInTests: true }],
        errors: [{ messageId: 'insecureTls' }],
      },
    ],
  });
});
