/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * Found linting open-source Node apps: an API-key guard class receives the
 * caller's key through its constructor (`this._authorization = authorization`)
 * and compares it with the configured secret. The request is two files away, so
 * the rule saw no attacker and stayed silent on the check that guards every
 * `/api` call.
 *
 * What is provable is the OTHER side: a value read from the environment or from
 * an imported config object is the process's own secret, and comparing it with
 * anything a caller supplied is the oracle. Two secret-looking NAMES are not
 * enough (`found-in-the-wild.test.ts` pins `bearerToken === sessionSecret` as
 * silent), and two configuration values compared with each other are not
 * either: nobody times the operator's own machine.
 */
const ENV_SECRETS = [
  'API_SECRET',
  'WEBHOOK_TOKEN',
  'SERVICE_PASSWORD',
  'SIGNING_KEY',
];
const CONFIG_ROOTS = ['config', 'conf', 'settings', 'secrets'];

ruleTester.run(
  'a configured secret against a supplied value needs no request in sight',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'two configured values compared on the operator’s own machine',
        code: `
          import config from './config';
          function same() {
            return process.env.API_SECRET === config.api.keySecret;
          }
        `,
      },
      {
        name: 'a configured secret against a local that no caller supplied',
        code: `
          function check() {
            const computed = derive();
            return computed === process.env.API_SECRET;
          }
        `,
      },
      {
        name: 'a field that was never filled from a parameter',
        code: `
          class Guard {
            check() {
              return this._x === process.env.API_SECRET;
            }
          }
        `,
      },
      {
        name: 'a field filled by a method call, not a parameter, is not supplied',
        code: `
          class Guard {
            constructor() { this._x = load(); }
            check() { return this._x === process.env.API_SECRET; }
          }
        `,
      },
      {
        name: 'a member of some other object is not a supplied field',
        code: `
          function check(holder) {
            return holder.value === process.env.API_SECRET;
          }
        `,
      },
      {
        name: 'a this outside any class says nothing about its fields',
        code: `
          function check() {
            return this._x === process.env.API_SECRET;
          }
        `,
      },
      {
        name: 'a computed field name cannot be traced to a parameter',
        code: `
          class Guard {
            constructor(supplied) { this[name] = supplied; }
            check() { return this[name] === process.env.API_SECRET; }
          }
        `,
      },
      {
        name: 'aliases that initialise each other are not a configured secret',
        code: `
          function check(supplied) {
            let a = b;
            let b = a;
            return supplied === a;
          }
        `,
      },
      {
        name: 'a config that is declared and never assigned proves nothing',
        code: `
          let config;
          function check(supplied) {
            return supplied === config.api.keySecret;
          }
        `,
      },
      {
        name: 'a config that is a parameter is the caller’s',
        code: `
          function check(supplied, config) {
            return supplied === config.api.keySecret;
          }
        `,
      },
      {
        name: 'a public build-time variable is shipped to the browser on purpose',
        code: `
          function check(supplied) {
            return supplied === process.env.NEXT_PUBLIC_API_KEY;
          }
        `,
      },
      {
        name: 'a path to a key is a location, not the key',
        code: `
          function check(supplied) {
            return supplied === process.env.SIGNING_KEY_PATH;
          }
        `,
      },
      {
        name: 'an environment variable that is not a credential',
        code: `
          function check(supplied) {
            return supplied === process.env.LOG_LEVEL;
          }
        `,
      },
      {
        name: 'a local named process is not the environment',
        code: `
          function check(supplied, process) {
            return supplied === process.env.SERVICE_KEY;
          }
        `,
      },
      {
        name: 'a process imported from somewhere else is not the environment',
        code: `
          import process from './fake-process';
          function check(supplied) {
            return supplied === process.env.SERVICE_KEY;
          }
        `,
      },
      {
        name: 'a local variable named config is not an imported config object',
        code: `
          function check(supplied) {
            const config = loadConfig();
            return supplied === config.api.keySecret;
          }
        `,
      },
      {
        name: 'an imported object that is not a config root',
        code: `
          import fixtures from './fixtures';
          function check(supplied) {
            return supplied === fixtures.api.keySecret;
          }
        `,
      },
      {
        name: 'a config property that is not a secret name',
        code: `
          import config from './config';
          function check(supplied) {
            return supplied === config.api.region;
          }
        `,
      },
      {
        name: 'a configured secret against a string constant',
        code: `
          function check() {
            return process.env.API_SECRET === 'change-me';
          }
        `,
      },
      {
        name: 'a configured secret tested for presence',
        code: `
          function check(supplied) {
            return supplied === undefined || process.env.API_SECRET === undefined;
          }
        `,
      },
      {
        name: 'an && is not a configured value: it may be the left operand',
        code: `
          function check(supplied) {
            return supplied === (flag && process.env.API_SECRET);
          }
        `,
      },
    ],
    invalid: [
      // One row per environment variable shape, so each spelling of the
      // secret-name test is its own failure.
      ...ENV_SECRETS.map((name) => ({
        name: `a parameter against process.env.${name}`,
        code: `
          function check(supplied) {
            return supplied === process.env.${name};
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' as const }],
      })),
      // One row per config root: removing one from the table fails one test.
      ...CONFIG_ROOTS.map((root) => ({
        name: `a parameter against ${root}.api.keySecret read from an import`,
        code: `
          import ${root} from './${root}';
          function check(supplied) {
            return supplied === ${root}.api.keySecret;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' as const }],
      })),
      {
        name: 'the config object may come from require',
        code: `
          const config = require('./config');
          function check(supplied) {
            return supplied !== config.api.keySecret;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'the config object may come from require().default',
        code: `
          const config = require('./config').default;
          function check(supplied) {
            return supplied !== config.api.keySecret;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'the secret on the left, the candidate on the right',
        code: `
          function check(supplied) {
            return process.env.API_SECRET !== supplied;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a candidate from the secret vocabulary, not a parameter',
        code: `
          function check() {
            const authorization = readHeaderSomehow();
            return authorization !== process.env.API_SECRET;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'the bracket spelling of process.env',
        code: `
          function check(supplied) {
            return supplied === process['env'].API_SECRET;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'process imported from node:process is the same object',
        code: `
          import process from 'node:process';
          function check(supplied) {
            return supplied === process.env.SERVICE_KEY;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'process imported from the bare module is the same object',
        code: `
          import process from 'process';
          function check(supplied) {
            return supplied === process.env.SERVICE_KEY;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a variable that aliases the environment secret',
        code: `
          function check(supplied) {
            const expected = process.env.WEBHOOK_SECRET;
            return supplied !== expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a name destructured from process.env',
        code: `
          function check(supplied) {
            const { SIGNING_KEY } = process.env;
            return supplied !== SIGNING_KEY;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a variable that aliases an imported config secret',
        code: `
          import config from './config';
          function check(supplied) {
            const expected = config.api.keySecret;
            return supplied !== expected;
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a default after || is still the configured value',
        code: `
          function check(supplied) {
            return supplied !== (process.env.API_SECRET || '');
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a ?? between two configured values is still configured',
        code: `
          function check(supplied) {
            return supplied !== (process.env.API_SECRET ?? process.env.FALLBACK_SECRET);
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a guard class compares the key its constructor was handed',
        code: `
          class ServerApi {
            constructor(authorization) {
              this._authorization = authorization;
            }
            isAuthorized() {
              return this._authorization === process.env.API_KEY_SECRET;
            }
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a field filled from a parameter, whatever it is named',
        code: `
          class Guard {
            constructor(supplied) { this._x = supplied; }
            check() { return this._x === process.env.API_SECRET; }
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a field filled from a parameter through a type assertion',
        code: `
          class Guard {
            constructor(supplied: string) { this._x = supplied as string; }
            check() { return this._x === process.env.API_SECRET; }
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        name: 'a field filled by another method of the class',
        code: `
          class Guard {
            use(supplied) { this._x = supplied; }
            check() { return this._x === process.env.API_SECRET; }
          }
        `,
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },
);

// The shapes the rule has always left alone must stay that way.
ruleTester.run(
  'two secret names with no configured side stay silent by default',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'a token against a secret, both parameters (pinned contract)',
        code: `
          function isAuthorized(bearerToken, sessionSecret) {
            return bearerToken === sessionSecret;
          }
        `,
      },
      {
        name: 'a guard that compares two fields by name (pinned contract)',
        code: `
          class Guard {
            constructor(authorization, apiKeySecret) {
              this._authorization = authorization;
              this._api_key_secret = apiKeySecret;
            }
            check() { return this._authorization !== this._api_key_secret; }
          }
        `,
      },
    ],
    invalid: [],
  },
);
