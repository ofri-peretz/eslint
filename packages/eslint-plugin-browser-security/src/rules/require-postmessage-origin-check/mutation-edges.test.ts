/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * Each case pins a branch no other fixture told apart from its mutant. The
 * `FP:` cases are wrong verdicts the triage found: they fail on the rule as it
 * was before this file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { requirePostmessageOriginCheck } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const missing = [{ messageId: 'missingOriginCheck' as const }];

ruleTester.run(
  'require-postmessage-origin-check — mutation edges',
  requirePostmessageOriginCheck,
  {
    valid: [
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FP: a WebSocket held in a class field initialiser has no origin to check',
        code: `
          class PriceFeed {
            socket = new WebSocket(url);
            listen() {
              this.socket.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
      },
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FP: a WebSocket held in a private class field has no origin to check',
        code: `
          class PriceFeed {
            #socket = new WebSocket(url);
            listen() {
              this.#socket.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
      },
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FP: a private field assigned a WebSocket in the constructor',
        code: `
          class PriceFeed {
            #socket;
            constructor() {
              this.#socket = new WebSocket(url);
            }
            listen() {
              this.#socket.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
      },
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FP: a private field declared as a WebSocket',
        code: `
          class PriceFeed {
            #socket!: WebSocket;
            listen() {
              this.#socket.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
      },
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FP: a quoted computed class field names the same field as the bare one',
        code: `
          class C {
            ['connection']: WebSocket = new WebSocket('wss://example.test');
            listen() {
              this.connection.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
      },
      {
        name: 'a declared field type alone answers for the receiver',
        code: `
          class PriceFeed {
            socket!: WebSocket;
            listen() {
              this.socket.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
      },
      {
        name: 'an origin comparison with no spaces is still a comparison',
        code: `window.addEventListener('message', (e) => { if (e.origin!=='https://a.example') return; render(e.data); });`,
      },
      {
        name: 'a loose origin comparison with no spaces',
        code: `window.addEventListener('message', (e) => { if (e.origin==TRUSTED) render(e.data); });`,
      },
      {
        name: 'a method other than addEventListener is not a message listener',
        code: `socket.on('message', (msg) => render(msg));`,
      },
      {
        name: 'a global function other than addEventListener is not a message listener',
        code: `subscribe('message', (msg) => render(msg));`,
      },
      {
        name: 'a global listener for another event is not a message listener',
        code: `addEventListener('click', (e) => render(e.data));`,
      },
      {
        name: 'a global listener with a non-literal event name is not analysed',
        code: `addEventListener(eventName, (e) => render(e.data));`,
      },
      {
        name: 'a member listener with a non-literal event name is not analysed',
        code: `window.addEventListener(eventName, (e) => render(e.data));`,
      },
      {
        name: 'a message listener with no handler argument',
        code: `window.addEventListener('message');`,
      },
    ],
    invalid: [
      {
        name: 'a receiver named on another object is a different receiver',
        code: `
          other.connection = new WebSocket(url);
          this.connection.addEventListener('message', (e) => render(e.data));
        `,
        errors: missing,
      },
      {
        name: 'a socket under a nested receiver does not answer for another nested receiver',
        code: `
          a.b.socket = new WebSocket(url);
          c.d.socket.addEventListener('message', (e) => render(e.data));
        `,
        errors: missing,
      },
      {
        name: 'a socket stored under an unnameable key does not exempt a global listener',
        code: `
          sockets[i] = new WebSocket(url);
          addEventListener('message', (e) => render(e.data));
        `,
        errors: missing,
      },
      {
        name: 'a public field does not answer for a private field of the same name',
        code: `
          class PriceFeed {
            socket = new WebSocket(url);
            #socket = getWindow();
            listen() {
              this.#socket.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
        errors: missing,
      },
      {
        name: 'a computed class field names no receiver',
        code: `
          class PriceFeed {
            [key] = new WebSocket(url);
            listen() {
              this.key.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
        errors: missing,
      },
      {
        name: 'an anchored origin test AFTER the handler does not guard it',
        code: `
          window.addEventListener('message', (e) => render(e.data));
          function ok(e) { return /^https:\\/\\/a\\.example$/.test(e.origin); }
        `,
        errors: missing,
      },
      {
        name: 'an anchored origin test BEFORE the handler does not guard it',
        code: `
          function ok(e) { return /^https:\\/\\/a\\.example$/.test(e.origin); }
          window.addEventListener('message', (e) => render(e.data));
        `,
        errors: missing,
      },
      {
        name: 'a function-expression handler is analysed like an arrow',
        code: `window.addEventListener('message', function (e) { render(e.data); });`,
        errors: missing,
      },
    ],
  },
);
