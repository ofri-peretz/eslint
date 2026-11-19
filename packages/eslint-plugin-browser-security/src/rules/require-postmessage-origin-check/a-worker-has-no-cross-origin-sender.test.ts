/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A worker's global scope cannot receive a cross-origin message.
 *
 * `self.onmessage` in a WINDOW is the cross-window `postMessage` sink this rule
 * exists for. In a dedicated worker the same spelling receives only what the
 * page that constructed it posts; a service worker's `message` event comes
 * only from same-origin clients it controls. Neither has a foreign sender to
 * check the origin of.
 *
 * The rule decides the global is a worker on two kinds of evidence:
 *
 *   - the file is a worker entry by the bundler convention — `*.worker.ts`
 *     (Vite's `?worker` and `new Worker(new URL('./x.worker.ts', …))`,
 *     webpack's worker-loader);
 *   - the same receiver registers a service-worker lifecycle event
 *     (`install`, `activate`, `fetch`, …), which only a
 *     `ServiceWorkerGlobalScope` is ever dispatched.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requirePostmessageOriginCheck } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const missing = [{ messageId: 'missingOriginCheck' as const }];

describe('require-postmessage-origin-check — worker globals', () => {
  ruleTester.run('worker-globals', requirePostmessageOriginCheck, {
    valid: [
      {
        // @source refactoringhq/tolaria src/hooks/editorFastMarkdownBlocks.worker.ts:3
        // @found real-source scan
        name: 'FP: self.onmessage in a dedicated worker entry',
        filename: 'src/hooks/editorFastMarkdownBlocks.worker.ts',
        code: `
          import { tryParseFastMarkdownBlocks } from './editorFastMarkdownBlocks';
          self.onmessage = (event: MessageEvent<string>) => {
            self.postMessage(tryParseFastMarkdownBlocks(event.data));
          };
        `,
      },
      {
        // @source refactoringhq/tolaria src/lib/offline/serviceWorkerRuntime.ts:228
        // @found real-source scan
        name: 'FP: a service worker scope, known by its install/activate/fetch listeners',
        filename: 'src/lib/offline/serviceWorkerRuntime.ts',
        code: `
          export function installOfflineServiceWorker(scope, options) {
            scope.addEventListener('install', (event) => { event.waitUntil(precache(scope)); });
            scope.addEventListener('activate', (event) => { event.waitUntil(scope.clients.claim()); });
            scope.addEventListener('fetch', (event) => { event.respondWith(respondTo(scope, event)); });
            scope.addEventListener('message', (event) => handleMessage(scope, event));
          }
        `,
      },
      {
        name: 'a classic service worker on self: the lifecycle listener can come after',
        filename: 'public/sw.js',
        code: `
          self.addEventListener('message', (event) => { cache(event.data); });
          self.addEventListener('fetch', (event) => { event.respondWith(fetch(event.request)); });
        `,
      },
      {
        name: 'a bare addEventListener in a worker entry is the worker global',
        filename: 'src/parse.worker.js',
        code: `addEventListener('message', (e) => { postMessage(parse(e.data)); });`,
      },
      {
        name: 'a bare service-worker listener marks the bare global',
        filename: 'public/sw.js',
        code: `
          addEventListener('install', (event) => { event.waitUntil(precache()); });
          addEventListener('message', (event) => { cache(event.data); });
        `,
      },
      {
        name: 'a bare onmessage in a worker entry is the worker global',
        filename: 'src/parse.worker.mts',
        code: `onmessage = (e) => { postMessage(parse(e.data)); };`,
      },
      {
        // Raised by CodeRabbit on #1581: a LOCAL named self is not the global.
        name: 'a local named self that holds a Worker keeps its own receiver',
        filename: 'src/app.ts',
        code: `
          const self = new Worker('parse.js');
          self.addEventListener('message', (e) => render(e.data));
        `,
      },
      {
        name: 'a configured global self (no declaration) is still the worker global',
        filename: 'src/parse.worker.ts',
        languageOptions: { globals: { self: 'readonly' } },
        code: `self.onmessage = (event) => { self.postMessage(event.data); };`,
      },
    ],
    invalid: [
      {
        // Raised by CodeRabbit on #1581.
        name: 'a local alias of window is the window, whatever it listens to',
        filename: 'src/app.ts',
        code: `
          const scope = window;
          scope.addEventListener('fetch', () => {});
          scope.addEventListener('message', (e) => render(e.data));
        `,
        errors: missing,
      },
      {
        // Raised by CodeRabbit on #1581.
        name: 'lifecycle evidence about one parameter says nothing of another with the same name',
        filename: 'src/app.ts',
        code: `
          export function install(scope) {
            scope.addEventListener('fetch', (event) => event.respondWith(fetch(event.request)));
          }
          export function connect(scope) {
            scope.addEventListener('message', (e) => render(e.data));
          }
        `,
        errors: missing,
      },
      {
        name: 'a lifecycle listener on a member receiver is not tracked',
        filename: 'src/app.ts',
        code: `
          this.scope.addEventListener('fetch', () => {});
          this.scope.addEventListener('message', (e) => render(e.data));
        `,
        errors: missing,
      },
      {
        name: 'the same self.onmessage in an ordinary module is a window listener',
        filename: 'src/hooks/editorFastMarkdownBlocks.ts',
        code: `self.onmessage = (event) => { render(event.data); };`,
        errors: missing,
      },
      {
        name: 'a worker file name does not make window a worker',
        filename: 'src/parse.worker.ts',
        code: `window.addEventListener('message', (event) => { render(event.data); });`,
        errors: missing,
      },
      {
        name: 'a lifecycle event on ANOTHER receiver proves nothing about this one',
        filename: 'src/app.ts',
        code: `
          scope.addEventListener('fetch', (event) => { event.respondWith(fetch(event.request)); });
          window.addEventListener('message', (event) => { render(event.data); });
        `,
        errors: missing,
      },
      {
        name: 'a lifecycle event on window proves nothing: a window is never a service worker',
        filename: 'src/app.ts',
        code: `
          window.addEventListener('fetch', () => {});
          window.addEventListener('message', (event) => { render(event.data); });
        `,
        errors: missing,
      },
      {
        name: 'a non-lifecycle event on the receiver proves nothing',
        filename: 'src/app.ts',
        code: `
          self.addEventListener('load', () => {});
          self.addEventListener('message', (event) => { render(event.data); });
        `,
        errors: missing,
      },
      {
        name: 'a bare non-lifecycle listener proves nothing about the global',
        filename: 'src/app.ts',
        code: `
          addEventListener('load', () => {});
          addEventListener('message', (event) => { render(event.data); });
        `,
        errors: missing,
      },
      {
        name: '"worker" elsewhere in the path is not the entry convention',
        filename: 'src/worker/bridge.ts',
        code: `self.onmessage = (event) => { render(event.data); };`,
        errors: missing,
      },
    ],
  });
});
