/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { isBrowserModule, noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

/**
 * Found scanning 40 open-source apps: 30 of 82 reports sat in browser code.
 * A socket handler in OpenWA's dashboard compares `event.sessionId` with the
 * session the user picked; it runs in that user's own browser, where no remote
 * attacker can time it. Each skip below has an invalid twin on the server.
 */
const SOCKET_HANDLER = `
  socket.on('message', (event) => {
    if (event.sessionId !== selectedSessionId) return;
  });
`;

ruleTester.run('no-timing-unsafe-compare: browser code has no remote attacker', noTimingUnsafeCompare, {
  valid: [
    {
      name: 'a module importing react (OpenWA dashboard/src/pages/Chats.tsx:984, as .ts)',
      code: `import { useEffect } from 'react';\n${SOCKET_HANDLER}`,
      filename: 'dashboard/src/pages/chats.ts',
    },
    {
      name: 'a react subpath import counts',
      code: `import { jsx } from 'react/jsx-runtime';\n${SOCKET_HANDLER}`,
      filename: 'src/view.js',
    },
    {
      name: 'a scoped framework import (@angular/core)',
      code: `import { Component } from '@angular/core';\n${SOCKET_HANDLER}`,
      filename: 'src/app.component.ts',
    },
    {
      name: "a 'use client' module",
      code: `'use client';\n${SOCKET_HANDLER}`,
      filename: 'app/page.ts',
    },
    {
      name: 'an equality helper call in browser code is skipped too',
      code: `import { useEffect } from 'react';\nsocket.on('m', (event) => { if (isEqual(event.sessionId, selectedSessionId)) return; });`,
      filename: 'src/chats.ts',
    },
    {
      name: 'a .tsx component that renders JSX with no import (automatic runtime; runtipi change-password-form.tsx)',
      code: `${SOCKET_HANDLER}\nexport const Form = () => <form />;`,
      filename: 'src/components/change-password-form.tsx',
    },
    {
      name: 'a .jsx file that renders only a fragment',
      code: `${SOCKET_HANDLER}\nexport const List = () => <></>;`,
      filename: 'src/list.jsx',
    },
  ],
  invalid: [
    {
      name: 'the same handler on the server',
      code: SOCKET_HANDLER,
      filename: 'src/gateway.ts',
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      name: "'use server' in a .tsx file is a server action",
      code: `'use server';\n${SOCKET_HANDLER}`,
      filename: 'app/actions.tsx',
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      name: 'a type-only react import is not browser code',
      code: `import type { FC } from 'react';\n${SOCKET_HANDLER}`,
      filename: 'src/gateway.ts',
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      name: 'a package whose name starts with a framework name is not it',
      code: `import { render } from 'react-email';\n${SOCKET_HANDLER}`,
      filename: 'src/mailer.ts',
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      name: 'includeBrowserCode: true checks browser modules too',
      code: `import { useEffect } from 'react';\n${SOCKET_HANDLER}`,
      filename: 'dashboard/src/pages/chats.ts',
      options: [{ includeBrowserCode: true }],
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      name: 'a .tsx file with no JSX is not a component (case registry ILB-0104)',
      code: `function f(req, apiKey) { if (req.headers.authorization === apiKey) { grant(); } }`,
      filename: 'case.tsx',
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      name: 'a .jsx request handler with no JSX is checked (case registry ILB-0008)',
      code: `import crypto from 'node:crypto';\nfunction check(req, secret) { if (req.headers.authorization === secret) { return true; } return false; }`,
      filename: 'src/check.jsx',
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      name: 'an equality helper call on the server is still checked',
      code: `socket.on('m', (event) => { if (isEqual(event.sessionId, selectedSessionId)) return; });`,
      filename: 'src/gateway.ts',
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
  ],
});

describe('isBrowserModule', () => {
  const parse = (code: string) =>
    parser.parse(code, { sourceType: 'module', ecmaVersion: 2022, range: true, loc: true }) as never;

  it('reads directives only from the prologue', () => {
    expect(isBrowserModule(parse(`foo();\n'use client';`), 'a.ts')).toBe(false);
  });

  it('stops the prologue at the first non-directive expression', () => {
    expect(isBrowserModule(parse(`(0);\n'use client';`), 'a.ts')).toBe(false);
  });

  it('lets use server win over use client', () => {
    expect(isBrowserModule(parse(`'use client';\n'use server';`), 'a.tsx')).toBe(false);
  });

  it('needs JSX before a .tsx or .jsx filename counts', () => {
    const parseJsx = (code: string) =>
      parser.parse(code, {
        sourceType: 'module',
        ecmaVersion: 2022,
        range: true,
        loc: true,
        ecmaFeatures: { jsx: true },
      }) as never;
    expect(isBrowserModule(parseJsx(''), 'a.tsx')).toBe(false);
    expect(isBrowserModule(parseJsx('const x = [1, { y: null }];'), 'a.jsx')).toBe(false);
    expect(isBrowserModule(parseJsx('const x = [<a />];'), 'a.tsx')).toBe(true);
    expect(isBrowserModule(parseJsx('const x = <a />;'), 'a.ts')).toBe(false);
  });

  it('treats a .vue or .svelte filename as browser code', () => {
    expect(isBrowserModule(parse(''), 'a.vue')).toBe(true);
    expect(isBrowserModule(parse(''), 'a.svelte')).toBe(true);
    expect(isBrowserModule(parse(''), 'a.ts')).toBe(false);
  });
});
