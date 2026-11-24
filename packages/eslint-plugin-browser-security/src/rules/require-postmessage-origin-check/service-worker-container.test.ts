/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
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

/**
 * `navigator.serviceWorker` is the page's ServiceWorkerContainer. Its `message`
 * event is dispatched by the same-origin worker controlling the page, so there
 * is no foreign window whose origin could be checked. Found linting an
 * open-source web client that opens a channel when its worker posts `open`.
 */
ruleTester.run(
  'require-postmessage-origin-check (service worker container)',
  requirePostmessageOriginCheck,
  {
    valid: [
      {
        name: 'a page listening to its own service worker',
        code: `
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'open') {
              openChannel(event.data.channel);
            }
          });
        }
      `,
      },
    ],
    invalid: [
      {
        name: 'the same listener on window still reports',
        code: `window.addEventListener('message', (event) => { openChannel(event.data.channel); });`,
        errors: missing,
      },
      {
        name: 'a local named navigator is not the platform object',
        code: `
        function f(navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => { openChannel(event.data.channel); });
        }
      `,
        errors: missing,
      },
      {
        name: 'a different property of navigator is not the container',
        code: `navigator.frames.addEventListener('message', (event) => { openChannel(event.data.channel); });`,
        errors: missing,
      },
      {
        name: 'serviceWorker read off another object is not the container',
        code: `popup.serviceWorker.addEventListener('message', (event) => { openChannel(event.data.channel); });`,
        errors: missing,
      },
    ],
  },
);
