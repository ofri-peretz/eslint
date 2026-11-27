/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-improper-sanitization: a developer-authored literal that reaches the
 * output call only as a value inside `JSON.stringify(...)` is JSON data, not
 * markup the author is composing. From dogfooding: protocol-ctf ws-2
 * (security-research, protocol-ctf/docs/SCANNER-RESULTS.md, run 2) reported
 * `'<redacted>'` in `ws.send(JSON.stringify({ … m.key === 'x' ? '<redacted>'
 * : CONFIG[m.key] }))`. Literals carrying executable markup, and literals
 * that reach a markup sink without the serialiser, still report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperSanitization } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-improper-sanitization — literals serialised by JSON.stringify', () => {
  ruleTester.run('no-improper-sanitization', noImproperSanitization, {
    valid: [
      {
        // @found ofri-peretz/security-research protocol-ctf ws-2 2026-11-26
        name: 'a placeholder literal in a ternary inside JSON.stringify, sent over a socket',
        code: `ws.on('message', (raw) => {
  const m = JSON.parse(raw);
  if (m.cmd === 'get') ws.send(JSON.stringify({ key: m.key, value: m.key === 'vaultToken' ? '<redacted>' : CONFIG[m.key] }));
});`,
      },
      {
        name: 'the same literal through a fallback, serialised',
        code: `ws.send(JSON.stringify({ value: CONFIG[m.key] || '<none>' }));`,
      },
      {
        name: 'the fixed ws-2 server shape',
        code: `if (m.cmd === 'get' && PUBLIC_KEYS.has(m.key)) ws.send(JSON.stringify({ key: m.key, value: CONFIG[m.key] }));`,
      },
    ],
    invalid: [
      {
        name: 'control: the same ternary sent without the serialiser still reports',
        code: `ws.send(m.key === 'vaultToken' ? '<redacted>' : CONFIG[m.key]);`,
        errors: [{ messageId: 'unsafeReplaceSanitization' }],
      },
      {
        name: 'executable markup in a serialised literal still reports',
        code: `res.send(JSON.stringify({ html: ok ? '<img src=x onerror=alert(1)>' : x }));`,
        errors: [{ messageId: 'unsafeReplaceSanitization' }],
      },
      {
        name: 'a DOM sink with a literal in a ternary still reports',
        code: `el.innerHTML = ok ? '<b>' : req.query.name;`,
        errors: [
          { messageId: 'insufficientXssProtection' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
    ],
  });
});
