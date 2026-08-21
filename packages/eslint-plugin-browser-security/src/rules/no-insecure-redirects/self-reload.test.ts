/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A reload is not a redirect.
 *
 * CWE-601 is redirection to an UNTRUSTED SITE. `location.assign(location.href)`
 * navigates to the URL the document is already on — the user cannot end up
 * anywhere new, so there is no site to be untrusted and an attacker gains
 * nothing they do not already have.
 *
 * `location.href` IS an untrusted read everywhere else, because a URL carries
 * attacker-controlled query and hash, and that is why this shape reached the
 * report. Found on the pinned corpus 2026-08-20 in okta-signin-widget's
 * `transformTerminalTransaction.ts`, under a comment that says what it is:
 * "Load the current page URI again to get a new state token".
 *
 * The exemption compares the printed receiver, so it holds only for the SAME
 * Location. `top.location.href` and `window.location.hash` are pinned below
 * because both genuinely move the user.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noInsecureRedirects } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-insecure-redirects — self reload', noInsecureRedirects, {
  valid: [
    {
      name: 'assign to the current href is a reload',
      code: 'export function f(){ window.location.assign(window.location.href); }',
    },
    {
      name: 'the same through the bare global',
      code: 'export function f(){ location.assign(location.href); }',
    },
    {
      name: 'the assignment spelling of the same reload',
      code: 'export function f(){ window.location.href = window.location.href; }',
    },
  ],
  invalid: [
    {
      // FN GUARD: a DIFFERENT window's href really does move the user.
      name: 'another frame href still reports',
      code: 'export function f(){ window.location.assign(top.location.href); }',
      errors: 1,
    },
    {
      // FN GUARD: the hash is attacker-controlled and is not the whole URL,
      // so navigating to it is a real redirect.
      name: 'navigating to the hash still reports',
      code: 'export function f(){ window.location.assign(window.location.hash); }',
      errors: 1,
    },
    {
      // FN GUARD: the canonical open redirect.
      name: 'a query parameter destination still reports',
      code: `export function f(){
               window.location.assign(new URLSearchParams(location.search).get('next'));
             }`,
      errors: 1,
    },
  ],
});
