/**
 * Tests for require-postmessage-origin-check rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requirePostmessageOriginCheck } from './index';
import * as vitest from 'vitest';

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

ruleTester.run(
  'require-postmessage-origin-check',
  requirePostmessageOriginCheck,
  {
    valid: [
      // Has origin check with strict equality
      {
        name: 'the origin is checked first',
        code: `
        window.addEventListener('message', (event) => {
          if (event.origin !== 'https://trusted.com') return;
          handleMessage(event.data);
        });
      `,
      },
      // Has origin check with loose equality
      {
        code: `
        window.addEventListener('message', (e) => {
          if (e.origin != 'https://example.com') return;
          processData(e.data);
        });
      `,
      },
      // Uses allowedOrigins array check
      {
        code: `
        window.addEventListener('message', (event) => {
          if (!allowedOrigins.includes(event.origin)) return;
          doSomething(event.data);
        });
      `,
      },
      // Uses custom validation function
      {
        code: `
        window.addEventListener('message', (event) => {
          if (!isAllowedOrigin(event.origin)) return;
          processMessage(event.data);
        });
      `,
      },
      // Function reference (can't analyze, so we allow)
      {
        code: `
        window.addEventListener('message', messageHandler);
      `,
      },
      // Test file with allowInTests
      {
        code: `
        window.addEventListener('message', (event) => {
          handleMessage(event.data);
        });
      `,
        options: [{ allowInTests: true }],
        filename: 'app.test.ts',
      },
      // Not a message event
      {
        code: `
        window.addEventListener('click', (event) => {
          handleClick(event);
        });
      `,
      },
    ],
    invalid: [
      // No origin check
      {
        name: 'a message listener that trusts every sender',
        code: `
        window.addEventListener('message', (event) => {
          handleMessage(event.data);
        });
      `,
        errors: [
          {
            messageId: 'missingOriginCheck',
          },
        ],
      },
      // Arrow function without origin check
      {
        code: `
        addEventListener('message', (e) => processData(e.data));
      `,
        errors: [
          {
            messageId: 'missingOriginCheck',
          },
        ],
      },
      // Function expression without origin check
      {
        code: `
        window.addEventListener('message', function(event) {
          document.body.innerHTML = event.data;
        });
      `,
        errors: [
          {
            messageId: 'missingOriginCheck',
          },
        ],
      },
    ],
  },
);

// ── Regexp origin checks (utils/regexp-anchoring.ts) ──────────────────────
//
// `ALLOWED_ORIGIN.test(event.origin)` spells "origin" only as a property read,
// so none of the `origin ===` text patterns above match it — every listener
// guarded by a regexp was reported, anchored or not. The two CWE-020 corpus
// fixtures below differ only in whether that regexp is anchored.
ruleTester.run(
  'require-postmessage-origin-check — regexp guards',
  requirePostmessageOriginCheck,
  {
    valid: [
      // Was pinned as INVALID under "a computed read is not provably
      // `.origin`" — a false positive, not a miss. `event['origin']` is the
      // same anchored check the dotted twin below performs, so warning here
      // told a developer their working guard did not exist.
      {
        code: `
          const ALLOWED = /^https:\\/\\/app\\.example\\.com$/;
          window.addEventListener('message', (event) => {
            if (!ALLOWED.test(event['origin'])) { return; }
            applySettings(event.data);
          });
        `,
      },
      // benchmarks/corpus/CWE-020/safe/anchored-origin-regexp.js
      {
        code: `
          const ALLOWED = /^https:\\/\\/app\\.example\\.com$/;
          window.addEventListener('message', (event) => {
            if (!ALLOWED.test(event.origin)) {
              return;
            }
            applySettings(event.data);
          });
        `,
      },
    ],
    invalid: [
      // benchmarks/corpus/CWE-020/vulnerable/missing-regexp-anchor.js
      {
        code: `
          const ALLOWED = /https:\\/\\/app\\.example\\.com/;
          window.addEventListener('message', (event) => {
            if (!ALLOWED.test(event.origin)) {
              return;
            }
            applySettings(event.data);
          });
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // Anchored, but testing something that is not the origin.
      {
        code: `
          const ALLOWED = /^https:\\/\\/app\\.example\\.com$/;
          window.addEventListener('message', (event) => {
            if (!ALLOWED.test(event.data)) { return; }
            applySettings(event.data);
          });
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // Not a member read at all.
      {
        code: `
          const ALLOWED = /^https:\\/\\/app\\.example\\.com$/;
          window.addEventListener('message', (event) => {
            if (!ALLOWED.test(someValue)) { return; }
            applySettings(event.data);
          });
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // Wrong arity.
      {
        code: `
          const ALLOWED = /^https:\\/\\/app\\.example\\.com$/;
          window.addEventListener('message', (event) => {
            if (!ALLOWED.test()) { return; }
            applySettings(event.data);
          });
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // The anchored check exists, but not inside this handler.
      {
        code: `
          const ALLOWED = /^https:\\/\\/app\\.example\\.com$/;
          ALLOWED.test(window.origin);
          window.addEventListener('message', (event) => {
            applySettings(event.data);
          });
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
    ],
  },
);

// ── Receiver-type analysis ────────────────────────────────────────────────
//
// CWE-346 is about `window.postMessage`, where any frame can address any
// other. A `MessageEvent` delivered by a WebSocket, an EventSource, a Worker
// or a BroadcastChannel has no `origin` property at all — the channel is the
// peer identity — so demanding a check there asks for code that cannot be
// written. `no-innerhtml` gates `write`/`writeln` on a document receiver for
// the same reason.
ruleTester.run(
  'require-postmessage-origin-check — receiver types',
  requirePostmessageOriginCheck,
  {
    valid: [
      // Corpus: Shopify/cli
      // packages/ui-extensions-server-kit/src/ExtensionServerClient/
      //   ExtensionServerClient.ts:163
      // The declared type answers for the receiver, and the `new WebSocket`
      // that backs it sits 39 lines BELOW the listener.
      {
        code: `
          class ExtensionServerClient {
            public connection!: WebSocket

            protected initializeConnection() {
              this.connection?.addEventListener('message', (message) => {
                const {event, data} = JSON.parse(message.data);
                this.listeners[event]?.forEach((listener) => listener(data));
              });
            }

            protected setupConnection() {
              this.connection = new WebSocket(this.options.connection.url);
            }
          }
        `,
      },
      // A local binding, resolved from its constructor.
      {
        code: `
          const socket = new WebSocket('wss://example.test');
          socket.addEventListener('message', (event) => render(event.data));
        `,
      },
      // Declared, not constructed, in this file.
      {
        code: `
          let stream: EventSource;
          stream.addEventListener('message', (event) => render(event.data));
        `,
      },
      // Constructed and subscribed in one expression.
      {
        code: `new BroadcastChannel('sync').addEventListener('message', (event) => apply(event.data));`,
      },
      // The remaining receiver kinds, one apiece.
      {
        code: `
          const w = new Worker('/worker.js');
          w.addEventListener('message', (event) => apply(event.data));
        `,
      },
      {
        code: `
          const sw = new SharedWorker('/worker.js');
          sw.addEventListener('message', (event) => apply(event.data));
        `,
      },
      {
        code: `
          const port = new MessagePort();
          port.addEventListener('message', (event) => apply(event.data));
        `,
      },
      // Assigned through a named object rather than `this`.
      {
        code: `
          client.socket = new WebSocket('wss://example.test');
          client.socket.addEventListener('message', (event) => apply(event.data));
        `,
      },
    ],
    invalid: [
      // A window listener in a file that ALSO opens a WebSocket must still
      // report — the receiver set is keyed by name, not merely by presence.
      {
        code: `
          const socket = new WebSocket('wss://example.test');
          window.addEventListener('message', (event) => render(event.data));
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // A constructor we make no claim about.
      {
        code: `
          const bus = new EventEmitter();
          bus.addEventListener('message', (event) => render(event.data));
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      {
        code: `new EventEmitter().addEventListener('message', (event) => render(event.data));`,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // An unnameable receiver proves nothing.
      {
        code: `
          const sockets = [new WebSocket('wss://example.test')];
          sockets[0].addEventListener('message', (event) => render(event.data));
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      {
        code: `getSocket().addEventListener('message', (event) => render(event.data));`,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // Nested receiver, no single name.
      {
        code: `a.b.c.addEventListener('message', (event) => render(event.data));`,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // Declared with a type that is not a message-channel type.
      {
        code: `
          let frame: HTMLIFrameElement;
          frame.addEventListener('message', (event) => render(event.data));
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // Non-identifier declaration and class-key shapes must not crash, and
      // must not exempt anything.
      {
        code: `
          const {socket} = openChannel();
          socket.addEventListener('message', (event) => render(event.data));
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      {
        code: `
          class C {
            ['connection']: WebSocket = new WebSocket('wss://example.test');
            listen() {
              this.connection.addEventListener('message', (e) => render(e.data));
            }
          }
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // A `new` expression in neither a declarator initialiser nor an
      // assignment right-hand side.
      {
        code: `
          register(new WebSocket('wss://example.test'));
          window.addEventListener('message', (event) => render(event.data));
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // Constructed via a member callee — no plain type name.
      {
        code: `
          const socket = new global.WebSocket('wss://example.test');
          socket.addEventListener('message', (event) => render(event.data));
        `,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
      // `addEventListener` at global scope has no receiver expression at all.
      {
        code: `addEventListener('message', (event) => render(event.data));`,
        errors: [{ messageId: 'missingOriginCheck' }],
      },
    ],
  },
);
