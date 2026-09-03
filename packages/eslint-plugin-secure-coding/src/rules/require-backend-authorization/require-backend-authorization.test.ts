/**
 * @fileoverview Tests for require-backend-authorization
 *
 * CWE-602 is "client-side enforcement of server-side security", and the suite
 * this file replaces tested only the first half of that. Every one of its
 * `invalid` cases was a bare `if (user.role === 'admin')` with nothing saying
 * where the code ran, and its `valid` list contained no server file at all — so
 * the rule's largest defect, reporting the very remediation it prescribes,
 * could not be observed by it.
 *
 * Measured in `benchmarks/rule-corpus/secure-coding__require-backend-authorization/`:
 * an Express middleware, a NestJS guard and a Next.js route handler were all
 * reported as "Authorization logic in client code". Those three shapes lead the
 * `valid` list below and fail on the unfixed rule.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { requireBackendAuthorization } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('require-backend-authorization', requireBackendAuthorization, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    { name: 'the permission is checked on the server', code: 'const response = await api.checkPermission(userId, resource)' },
    { code: 'const x = 1' },

    // ---- REGRESSION LOCKS: server-side enforcement is the CURE -------------
    // Express middleware refusing the request with a 403. Reporting this tells
    // a developer to delete the code the rule's own fix text asked them to
    // write.
    {
      code: [
        "import express from 'express';",
        'export function requireAdmin(req, res, next) {',
        "  if (req.user.role !== 'admin') { return res.status(403).end(); }",
        '  return next();',
        '}',
      ].join('\n'),
    },
    // A NestJS guard — the framework's canonical authorization point.
    {
      code: [
        "import { Injectable } from '@nestjs/common';",
        'export class AdminGuard {',
        '  canActivate(context) {',
        '    const request = context.switchToHttp().getRequest();',
        "    if (request.user.role !== 'admin') { return false; }",
        '    return true;',
        '  }',
        '}',
      ].join('\n'),
    },
    // A Next.js route handler, which runs on the server.
    {
      code: [
        "import { NextResponse } from 'next/server';",
        'export async function DELETE(request) {',
        '  const session = await getServerSession(request);',
        "  if (session.user.role !== 'owner') { return NextResponse.json({}, { status: 403 }); }",
        '  return new NextResponse(null, { status: 204 });',
        '}',
      ].join('\n'),
    },
    // A bare node:http server.
    {
      code: [
        "import http from 'node:http';",
        'export const server = http.createServer((req, res) => {',
        "  if (req.headers.role !== 'admin') { res.statusCode = 403; }",
        '  res.end();',
        '});',
      ].join('\n'),
    },

    // ---- no evidence the file runs in a browser ---------------------------
    // A DTO serialiser: the branch decides whether an optional field is
    // present, grants nothing and denies nothing.
    {
      code: 'export function toMemberDto(member) { const dto = {}; if (member.role) { dto.role = member.role; } return dto; }',
    },
    // `role` as the ARIA attribute of a DOM node. This is the shape that made
    // the rule fire across accessible design systems.
    {
      code: "export function isMenuItem(element) { if (element.role === 'menuitem') { return true; } return false; }",
    },

    // ---- browser file, but the branch is not an authorization decision -----
    {
      code: "'use client'; export function render(post) { if (post.published) { document.title = post.title; } }",
    },
    // A claim read that never reaches a branch at all.
    {
      code: "'use client'; export function label(user) { document.title = user.role; return user.role; }",
    },
    // A claim read in the CONSEQUENT rather than the test: the walk up from the
    // member access passes the IfStatement without matching its `test`.
    {
      code: "'use client'; export function show(user, ready) { if (ready) { document.title = user.role; } }",
    },
    // A computed access through a variable is not statically knowable.
    {
      code: "'use client'; export function check(user, key) { if (user[key]) { document.title = 'x'; } }",
    },
    // A private field is not a claim arriving from a server.
    {
      code: "'use client'; class Session { #role = 'guest'; render() { if (this.#role) { document.title = 'x'; } } }",
    },

    // ---- binding hop: the initialiser carries no claim ---------------------
    {
      code: "'use client'; export function render(user) { const isEnabled = user.beta === true; if (isEnabled) { document.title = 'beta'; } }",
    },
    // A declaration with no initialiser at all.
    {
      code: "'use client'; export function render() { let pending; if (pending) { document.title = 'x'; } }",
    },
    // A parameter, not a variable declarator.
    {
      code: "'use client'; export function render(allowed) { if (allowed) { document.title = 'x'; } }",
    },
    // An unresolvable identifier in the test.
    {
      code: "'use client'; export function render() { if (WEBPACK_FEATURE_FLAG) { document.title = 'x'; } }",
    },
    // Rebound after the claim was read, so the binding no longer carries it.
    {
      code: [
        "'use client';",
        'export function render(user) {',
        '  let level = user.role;',
        "  level = 'guest';",
        '  if (level) { document.title = level; }',
        '}',
      ].join('\n'),
    },

    // ---- OPTIONS: the default is unchanged --------------------------------
    // An empty option bag must behave exactly like no option bag. The invalid
    // block below carries the matching positive control.
    {
      code: "'use client'; export function render(post) { if (post.published) { document.title = post.title; } }",
      options: [{}],
    },

    // ---- OPTIONS: replacing a default ------------------------------------
    // A design-system codebase where `role` is the ARIA attribute and nothing
    // else. Narrowing the claim vocabulary is the remedy; before the option
    // existed it was disable-the-rule.
    {
      code: "'use client'; export function render(el) { if (el.role === 'button') { focus(el); } }",
      options: [{ authProperties: ['isAdmin'] }],
    },
    // The file's only browser evidence is `document`, which is no longer
    // browser evidence once the list is replaced.
    {
      code: "export function render(user) { if (user.role === 'admin') { document.title = 'x'; } }",
      options: [{ browserGlobals: ['chrome'] }],
    },
    // An in-house server framework, declared server-only. The import proves the
    // file never reaches a browser, so the guard in it IS the server-side
    // enforcement CWE-602 asks for.
    {
      code: "'use client'; import { router } from '@acme/server-kit'; export function h(user) { if (user.role === 'admin') { drop(); } }",
      options: [{ additionalServerModules: ['@acme/server-kit'] }],
    },
    // The same via a full replacement of the module list.
    {
      code: "'use client'; import { router } from '@acme/server-kit'; export function h(user) { if (user.role === 'admin') { drop(); } }",
      options: [{ serverModules: ['@acme/server-kit'] }],
    },
    // Replacing the module list can also REMOVE a built-in: with `express` no
    // longer server-only the express file is judged on browser evidence, and
    // it has none, so it still stays quiet.
    {
      code: "import express from 'express'; export function h(req, res) { if (req.user.role === 'admin') { res.send('ok'); } }",
      options: [{ serverModules: [] }],
    },
  ],

  invalid: [
    // ---- 'use client' as the browser evidence -----------------------------
    {
      name: 'an admin check inside a client component — the browser decides',
      code: "'use client'; export function render(session) { if (session.user.isAdmin) { impersonate(); } }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Optional chaining, which is how every React codebase written after 2020
    // reads a session that may not have loaded.
    {
      code: "'use client'; export function render(user) { if (user?.role === 'admin') { openDangerZone(); } }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A membership test against a permissions array — the shape CASL, Casbin,
    // Auth0 and Clerk all produce in the browser.
    {
      code: "'use client'; export function render(currentUser) { if (currentUser.permissions.includes('billing:write')) { changePlan(); } }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Bracket notation is the same read as dot notation.
    {
      code: "'use client'; export function render(user) { if (user['role'] === 'admin') { showAdmin(); } }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // `switch`, not `if`: the normal way to fan a role out to more than two
    // destinations.
    {
      code: "'use client'; export function home(user) { switch (user.role) { case 'admin': return adminHome(); default: return memberHome(); } }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // One binding hop.
    {
      code: "'use client'; export function render(user) { const canExport = user.role === 'owner'; if (canExport) { exportMembers(); } }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A `switch` on a hoisted claim.
    {
      code: "'use client'; export function home(user) { const level = user.roles[0]; switch (level) { case 'admin': return adminHome(); default: return memberHome(); } }",
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- JSX as the browser evidence --------------------------------------
    {
      code: 'export function AdminRoute({ user }) { if (user.role === "admin") { return <AdminPanel />; } return null; }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'export function Gate({ user, children }) { if (user.isAdmin) { return <>{children}</>; } return null; }',
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- a browser global as the evidence ---------------------------------
    // The claim is decoded from a JWT in the browser. Decoding is not
    // verifying, so the caller can mint any claim they like.
    {
      code: "const claims = jwtDecode(token); if (claims.admin) { window.location.assign('/admin'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Read straight out of storage the user owns.
    {
      code: "const profile = JSON.parse(localStorage.getItem('profile')); if (profile.permissions) { mountDangerZone(); }",
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- OPTIONS: the default is unchanged --------------------------------
    // Positive control for the `options: [{}]` valid case: an empty bag still
    // reports everything the built-in lists report.
    {
      code: "'use client'; export function render(session) { if (session.user.isAdmin) { impersonate(); } }",
      options: [{}],
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- OPTIONS: extending a default adds coverage -----------------------
    // The corpus's documented false negative — a client-side gate on
    // `user.accessLevel` — now has a remedy that is not "fork the rule".
    {
      code: "'use client'; export function render(user) { if (user.accessLevel > 3) { showAdmin(); } }",
      options: [{ additionalAuthProperties: ['accessLevel'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
    // A browser-extension global as the runtime evidence. `chrome` is not in
    // the built-in list, so this file was previously judged to run nowhere.
    {
      code: "export function render(user) { if (user.role === 'admin') { chrome.tabs.create({ url: '/admin' }); } }",
      options: [{ additionalBrowserGlobals: ['chrome'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
    // Full replacement of the browser-global list, same effect.
    {
      code: "export function render(user) { if (user.role === 'admin') { chrome.tabs.create({ url: '/admin' }); } }",
      options: [{ browserGlobals: ['chrome'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
    // Full replacement of the claim vocabulary, widening rather than narrowing.
    {
      code: "'use client'; export function render(user) { if (user.tier === 'staff') { showAdmin(); } }",
      options: [{ authProperties: ['tier'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
