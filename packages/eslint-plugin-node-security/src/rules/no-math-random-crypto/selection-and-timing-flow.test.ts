/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Where the draw GOES decides, not what the binding beside it is called.
 *
 * Measured on github-aws-runners/terraform-aws-github-runner
 * (`control-plane/src/github/auth.ts:269`, `termination-watcher/src/
 * github-app-client.ts:38`) and dayuanjiang/next-ai-draw-io
 * (`lib/ai-providers.ts:188`): a draw spreads load across several configured
 * GitHub Apps or API keys,
 *
 *   const credential = credentials[Math.floor(Math.random() * credentials.length)];
 *
 * and was reported at CWE-338 CRITICAL because the binding the picked ELEMENT is
 * stored in is called `credential`. The draw chose WHICH existing secret to use;
 * nothing about the choice has to be unguessable.
 *
 * Three flows are selection or scheduling, never a value: the draw (through
 * arithmetic) is an array INDEX whose pick is not accumulated into a new value,
 * a timer DELAY, or an operand of a COMPARISON (a sampling decision). Anything
 * else the draw touches keeps the old verdict, and so does every use that BUILDS
 * a value out of picks: `token += CHARS[draw]`, an alphabet literal, a push.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-math-random-crypto — selection, delay and sampling are not secrets',
  noMathRandomCrypto,
  {
    valid: [
      {
        name: 'a pick among configured credentials is a selection',
        code: `export function pick(credentials) {
          const credential = credentials[Math.floor(Math.random() * credentials.length)];
          return credential;
        }`,
      },
      {
        name: 'a function returning one of the configured credentials',
        code: `export function getAppCredential(credentials) {
          return credentials[Math.floor(Math.random() * credentials.length)];
        }`,
      },
      {
        name: 'a rotation offset only ever indexes the same list',
        code: `export function rotate(creds, i) {
          const credentialStart = Math.floor(Math.random() * creds.length);
          return creds[(credentialStart + i) % creds.length];
        }`,
      },
      {
        name: 'a refresh delay only reaches setTimeout',
        code: `const tokenRefresh = BASE + Math.random() * 1000;
          setTimeout(refresh, tokenRefresh);`,
      },
      {
        name: 'a timer delay computed inline',
        code: `const sessionTimer = setTimeout(close, 500 + Math.random() * 500);`,
      },
      {
        name: 'a sampling decision is a comparison',
        code: `const keepSession = Math.random() < 0.1;`,
      },
      {
        name: 'a sampling draw bound once and only compared',
        code: `const sessionSample = Math.random();
          if (sessionSample < 0.1) track();`,
      },
      {
        name: 'a picked env-var name read back from a filtered list',
        code: `export function chooseKey(envVars) {
          const valid = envVars.filter((v) => process.env[v]);
          const selectedKeyEnv = valid[Math.floor(Math.random() * valid.length)];
          return { value: process.env[selectedKeyEnv], selectedKeyEnv };
        }`,
      },
      {
        name: 'a typed pick through Math.min, a unary minus and a non-null assertion',
        code: `export function pick(credentials: string[], n: number) {
          const credential = credentials[Math.min(n, -Math.floor(-Math.random() * credentials.length)) as number]!;
          return credential;
        }`,
      },
      {
        name: 'a pick read through a property of the chosen element',
        code: `export const pick = (credentials) => {
          const credential = credentials[Math.floor(Math.random() * credentials.length)].apiKey;
          return credential;
        };`,
      },
      {
        name: 'a pick stored as an object property',
        code: `export const pick = (credentials) => ({
          credential: credentials[Math.floor(Math.random() * credentials.length)],
        });`,
      },
      {
        name: 'a pick assigned to a field',
        code: `export function use(credentials) {
          this.credential = credentials[Math.floor(Math.random() * credentials.length)];
        }`,
      },
      {
        name: 'a pick from an undeclared list is a selection',
        code: `export const credential = CREDENTIAL_POOL[Math.floor(Math.random() * CREDENTIAL_POOL.length)];`,
      },
      {
        name: 'a pick through a cycle of aliases terminates and is a selection',
        code: `const a = b;
          const b = a;
          export const credential = a[Math.floor(Math.random() * 3)];`,
      },
      {
        name: 'a pick from a number is not an alphabet',
        code: `export const credential = (123)[Math.floor(Math.random() * 3)];`,
      },
      {
        name: 'a pick from an empty array is not an alphabet',
        code: `export const credential = [][Math.floor(Math.random() * 3)];`,
      },
      {
        name: 'a pick from an array holding a non-literal is not an alphabet',
        code: `export const credential = ['a', other][Math.floor(Math.random() * 2)];`,
      },
      {
        name: 'a pick from an array holding a number is not an alphabet',
        code: `export const credential = ['a', 1][Math.floor(Math.random() * 2)];`,
      },
      {
        name: 'a pick from an array of words is not an alphabet',
        code: `export const credential = ['alpha', 'beta'][Math.floor(Math.random() * 2)];`,
      },
      {
        name: 'a pick from an array with a hole is not an alphabet',
        code: `export const credential = [, 'a'][Math.floor(Math.random() * 2)];`,
      },
      {
        name: 'a pick from a call result is not an alphabet',
        code: `export const credential = getPool()[Math.floor(Math.random() * 2)];`,
      },
      {
        name: 'a pick from a copy of a list is not an alphabet',
        code: `export const credential = pool.slice()[Math.floor(Math.random() * 2)];`,
      },
      {
        name: 'a delay passed as the only argument of a timer',
        code: `const tokenWake = Math.random() * 500;
          setTimeout(tokenWake);`,
      },
      {
        name: 'a pick from a member expression is a selection',
        code: `export const credential = this.credentials[Math.floor(Math.random() * this.credentials.length)];`,
      },
    ],
    invalid: [
      {
        name: 'a pick from a template alphabet builds a value',
        code: 'const sessionToken = `abc123`[Math.floor(Math.random() * 6)];',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a negated draw is not a number that selects',
        code: `const sessionFlag = !Math.random();`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw bound and then called is not a delay or an index',
        code: `const sessionFn = Math.random(); sessionFn();`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw under a dynamically named Math function is unknown',
        code: `const sessionPick = Math[op](Math.random());`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a pick from an alphabet bound to a string literal builds a value',
        code: `const chars = 'abc123';
          const sessionToken = chars[Math.floor(Math.random() * chars.length)];`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a pick from an array of single characters builds a value',
        code: `const sessionToken = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a pick from a split alphabet builds a value',
        code: `const sessionToken = 'abc'.split('')[Math.floor(Math.random() * 3)];`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw handed to an arbitrary function is not a timer delay',
        code: `const sessionTimer = schedule(Math.random() * 500);`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw under a locally declared setTimeout is not the platform timer',
        code: `import { setTimeout } from './queue';
          const sessionTimer = setTimeout(close, Math.random() * 500);`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw reaching an in-operator is not arithmetic',
        code: `const sessionId = 'id-' + Math.random() in room;`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw that is never read stays under its name',
        code: `const sessionSeed = Math.random();`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a binding that is rewritten proves nothing about its reads',
        code: `let sessionSeed = Math.random();
          sessionSeed = readFromRequest();
          if (sessionSeed < 0.5) track();`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a token accumulated from picks is still a weak token',
        code: `let token = '';
          for (let i = 0; i < 32; i++) token += CHARS[Math.floor(Math.random() * CHARS.length)];`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'an index bound first and accumulated later is still a weak token',
        code: `let token = '';
          for (let i = 0; i < 32; i++) {
            const r = Math.floor(Math.random() * CHARS.length);
            token += CHARS[r];
          }`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a pick from an alphabet literal builds a value',
        code: `const sessionToken = 'abcdef0123456789'[Math.floor(Math.random() * 16)];`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a pick pushed into a collection builds a value',
        code: `export function generateApiKey() {
          const out = [];
          for (let i = 0; i < 16; i++) out.push(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
          return out.join('');
        }`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw that is compared AND stringified into a seed still reports',
        code: `const tokenSeed = Math.random();
          if (tokenSeed < 0.5) log();
          export const out = tokenSeed.toString(36);`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw that is a delay AND the value stored as a token still reports',
        code: `const tokenRefresh = Math.random() * 1000;
          setTimeout(refresh, tokenRefresh);
          store.token = tokenRefresh;`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw stringified into a credential slot is not a selection',
        code: `headers.set('X-CSRF-Token', String(Math.floor(Math.random() * 1e9)));`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a pick used as a lookup key is not a whole pick',
        code: `const credential = table[creds[Math.floor(Math.random() * creds.length)]];`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a pick used as a computed property key is not a whole pick',
        code: `const credential = { [creds[Math.floor(Math.random() * creds.length)]]: 1 };`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a pick appended with += builds a value',
        code: `let credential = '';
          credential += creds[Math.floor(Math.random() * creds.length)];`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw through the in operator is not a number that selects',
        code: `const sessionKey = Math.random() in room;
          if (sessionKey < 1) go();`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a negated draw read only by a comparison is still not a number',
        code: `const sessionFlag = !Math.random();
          if (sessionFlag < 1) go();`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a member named setTimeout is not the platform timer',
        code: `const sessionTimer = scheduler.setTimeout(fn, Math.random() * 500);`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw in the third argument of a timer is not its delay',
        code: `const sessionTimer = setTimeout(fn, 10, Math.random() * 500);`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        name: 'a draw indexed into is not a pick',
        code: `const sessionPart = Math.random()[0];`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
    ],
  },
);
