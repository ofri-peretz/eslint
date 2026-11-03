/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What the rule follows to decide a filter or DN is attacker-built — and what it
 * refuses to follow.
 *
 * Every case states one claim. Each one was written against a mutant that survived
 * the suite before it: the code it pins could be removed, inverted or widened and no
 * test noticed. The `FP:` / `FN:` cases are bugs, fixed after the case failed.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noLdapInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** The file gate needs an LDAP client loaded; every case loads ldapjs first. */
const LDAP = "import ldapjs from 'ldapjs';\n";

interface Case {
  name: string;
  code: string;
  options?: [Record<string, unknown>];
}
interface InvalidCase extends Case {
  errors: { messageId: string }[];
}

const valid = (cases: Case[]): Case[] =>
  cases.map((c) => ({ ...c, code: LDAP + c.code }));
const invalid = (cases: InvalidCase[]): InvalidCase[] =>
  cases.map((c) => ({ ...c, code: LDAP + c.code }));

const filterError = [{ messageId: 'unsafeLdapFilter' }];
const requestError = [{ messageId: 'unescapedLdapInput' }];
const dnError = [{ messageId: 'ldapInjection' }];
const dangerousError = [{ messageId: 'dangerousLdapOperation' }];

describe('no-ldap-injection — what reaches the filter', () => {
  ruleTester.run('filter grammar in the static text', noLdapInjection, {
    valid: [],
    invalid: invalid([
      {
        name: 'whitespace after the opening parenthesis is still filter grammar',
        code: "export function f(name) { const filter = '( uid=' + name + ')'; }",
        errors: filterError,
      },
      {
        name: 'whitespace before the operator is still filter grammar',
        code: "export function f(name) { const filter = '(uid =' + name + ')'; }",
        errors: filterError,
      },
      {
        name: 'the approximate-match operator ~= is filter grammar',
        code: "export function f(name) { const filter = '(cn~=' + name + ')'; }",
        errors: filterError,
      },
      {
        name: 'a filter whose opening is held in a constant is still filter grammar',
        code: "export function f(name) { const OPEN = '(uid='; const filter = OPEN + name + ')'; }",
        errors: filterError,
      },
      {
        name: 'a conditional filter is filter grammar through either branch',
        code: "export function f(flag, name) { const filter = flag ? '(uid=admin)' : '(uid=' + name + ')'; }",
        errors: filterError,
      },
    ]),
  });

  ruleTester.run('hardcoded filters that match everything', noLdapInjection, {
    valid: valid([
      {
        name: 'a presence clause ANDed with a pinned equality does not match everything',
        code: "const filter = '(&(uid=admin)(mail=*))';",
      },
      {
        name: 'an absolute-true clause ANDed with an equality is still pinned',
        code: "const filter = '(&(&)(uid=admin))';",
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: the absolute-false filter (|) matches nothing (RFC 4526)',
        code: "export function f(client) { client.search(base, '(|)'); }",
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: an exclamation mark inside an assertion value is a literal character',
        code: "const filter = '(cn=Hello!)';",
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a numeric literal in a concatenation is part of the filter text',
        code: "const filter = '(employeeNumber=*' + 7 + ')';",
      },
      {
        name: 'comparing a value to a filter string builds no filter',
        code: "export function f(current) { const isAll = current === '(objectClass=*)'; return isAll; }",
      },
      {
        name: 'a unary plus initialiser is not a filter',
        code: 'export function f(req) { const n = +req.query.count; return n; }',
      },
    ]),
    invalid: invalid([
      {
        name: 'the absolute-true filter (&) searched for matches everything',
        code: "export function f(client) { client.search(base, '(&)'); }",
        errors: dangerousError,
      },
    ]),
  });

  ruleTester.run('dynamic parts of a concatenation', noLdapInjection, {
    valid: valid([
      {
        name: 'an escaped value concatenated into a filter is not an injection',
        code: "export function f(req) { const filter = '(uid=' + ldapjs.escape.filterValue(req.query.u) + ')'; }",
      },
      {
        name: 'a DN concatenated from constants is not an injection',
        code: "const OU = 'users'; export function f(client) { client.del('cn=admin,ou=' + OU + ',dc=example'); }",
      },
    ]),
    invalid: invalid([
      {
        name: 'a unary plus inside a concatenation is a dynamic part',
        code: "export function f(req) { const filter = '(uidNumber=' + +req.query.n + ')'; }",
        errors: filterError,
      },
      {
        name: 'a template literal is the string part that makes a concatenation a string',
        code: 'export function f(name, suffix) { const filter = `(cn=${name})` + suffix; }',
        errors: filterError,
      },
      {
        name: 'a filter chosen by a conditional is checked through each branch binding',
        code: 'export function f(client, flag, req) { const clause = `uid=${req.query.u}`; client.search(base, flag ? DEFAULT_FILTER : clause); }',
        errors: filterError,
      },
    ]),
  });

  ruleTester.run('escaping', noLdapInjection, {
    valid: valid([
      {
        name: 'a configured validation function clears the value by default',
        code: 'export function f(req) { const filter = `(uid=${validateLdapInput(req.query.u)})`; }',
      },
      {
        name: 'a bare configured escape name matches that method on any receiver',
        code: 'export function f(req, helpers) { const filter = `(uid=${helpers.filterEscape(req.query.u)})`; }',
      },
      {
        name: 'a dotted configured escape name matches by its last segment',
        code: 'export function f(req, ldapEscape) { const filter = `(uid=${ldapEscape.filter(req.query.u)})`; }',
        options: [{ ldapEscapeFunctions: ['ldapEscape.filter'] }],
      },
      {
        name: 'a filter handed whole through an escape function is not request data',
        code: 'export function f(client, req) { client.search(base, ldapjs.escape.filterValue(req.query.f)); }',
      },
    ]),
    invalid: invalid([
      {
        name: 'a binding escaped at its declaration and overwritten later is no longer escaped',
        code: 'export function f(req) { let v = ldapjs.escape.filterValue(req.query.u); v = req.query.u; const filter = `(uid=${v})`; }',
        errors: filterError,
      },
    ]),
  });

  ruleTester.run('request data handed over whole', noLdapInjection, {
    valid: valid([
      {
        name: 'a helper called with only constants is not request data',
        code: "export function f(client) { client.search(base, buildFilter('uid', 'admin')); }",
      },
      {
        name: 'a name destructured from a non-request object is not request data',
        code: 'export function f(client, config) { const { query } = config.http; client.search(base, { filter: query.filter }); }',
      },
      {
        name: 'a computed key is resolved through its binding, not read by its spelling',
        code: "export function f(client, req) { const filter = 'attributes'; client.search(base, { [filter]: req.query.a }); }",
      },
    ]),
    invalid: invalid([
      {
        name: 'an optional chain over the request is the request',
        code: 'export function f(client, req) { client.search(base, { filter: req.query?.filter }); }',
        errors: requestError,
      },
      {
        name: 'a non-null assertion over the request is the request',
        code: 'export function f(client, req) { client.search(base, { filter: req.query.filter! }); }',
        errors: requestError,
      },
      {
        name: 'a satisfies-annotated options object still carries its filter',
        code: 'export function f(client, req) { client.search(base, { filter: req.query.filter } satisfies object); }',
        errors: requestError,
      },
      {
        name: 'request data bound to a name and passed through a helper is still request data',
        code: 'export function f(client, req) { const userFilter = req.query.f; client.search(base, normalise(userFilter)); }',
        errors: requestError,
      },
      {
        name: 'a helper given request data in any argument returns request data',
        code: "export function f(client, req) { client.search(base, buildFilter('uid', req.query.u)); }",
        errors: requestError,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: request data spread into a helper is still request data',
        code: 'export function f(client, req) { client.search(base, buildFilter(...req.query.parts)); }',
        errors: requestError,
      },
      {
        name: 'the filter option is found after other properties',
        code: "export function f(client, req) { client.search(base, { scope: 'sub', filter: req.query.f }); }",
        errors: requestError,
      },
      {
        name: 'a quoted filter key is found after other quoted properties',
        code: "export function f(client, req) { client.search(base, { 'scope': 'sub', 'filter': req.query.f }); }",
        errors: requestError,
      },
      {
        name: 'a computed key bound to the constant filter names the filter option',
        code: "const KEY = 'filter' as const; export function f(client, req) { client.search(base, { [KEY]: req.query.f }); }",
        errors: requestError,
      },
    ]),
  });

  ruleTester.run('which receiver is an LDAP client', noLdapInjection, {
    valid: valid([
      {
        name: 'an import from a non-LDAP package is not an LDAP client',
        code: "import { Queue } from 'bullmq'; const q = new Queue('jobs'); export function f(req) { q.add('(uid=' + req.query.u + ')', {}); }",
      },
      {
        name: 'a receiver built with new from a non-LDAP namespace is not an LDAP client',
        code: "export function f(req, collections) { const q = new collections.Queue(); q.add('cn=' + req.query.u, {}); }",
      },
      {
        name: 'a receiver constructed from a chosen constructor is not an LDAP client',
        code: "export function f(req, weak) { const store = new (weak ? WeakSet : Set)(); store.add('cn=' + req.query.u); }",
      },
      {
        name: 'a receiver returned by a chosen factory is not an LDAP client',
        code: "export function f(req, weak, makeWeak, makeStrong) { const store = (weak ? makeWeak : makeStrong)(); store.add('cn=' + req.query.u); }",
      },
      {
        name: 'an object literal with its own add method is not an LDAP client',
        code: "export function f(req) { const registry = { add() {} }; registry.add('cn=' + req.query.u, {}); }",
      },
      {
        name: 'a class field initialised with a Set is not an LDAP receiver',
        code: "export class Cache { entries = new Set(); keep(req) { this.entries.add('cn=' + req.query.u); } }",
      },
      {
        name: 'a client made from a required non-LDAP package is not an LDAP client',
        code: "const bull = require('bull'); const q = bull.createQueue(); export function f(req) { q.add('cn=' + req.query.u, {}); }",
      },
      {
        name: 'module-level declarations that are not LDAP requires are skipped',
        code: 'let pending; const plugin = require(pluginPath); export { pending, plugin };',
      },
    ]),
    invalid: invalid([
      {
        name: 'a client from a scoped @ldapjs package is an LDAP client',
        code: "import { createClient } from '@ldapjs/client'; const client = createClient({ url }); export function f(req) { client.add('cn=' + req.query.u + ',dc=x', {}); }",
        errors: dnError,
      },
      {
        name: 'a rest element in the require destructure does not stop the client being recognised',
        code: "const { createClient, ...ldapRest } = require('ldapjs'); const client = createClient({}); export function f(req) { client.search(base, '(uid=' + req.query.u + ')'); }",
        errors: filterError,
      },
      {
        name: "another object's field is not this class's field",
        code: "export class Cache { entries = new Set(); keep(other, req) { other.entries.add('cn=' + req.query.u); } }",
        errors: dnError,
      },
      {
        name: 'a class field declared without an initialiser proves nothing about the receiver',
        code: "export class Dir { client; find(req) { return this.client.search(base, '(uid=' + req.query.u + ')'); } }",
        errors: filterError,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a class field holding an injected client is not provably something else',
        code: "export class Dir { client = sharedClient; find(req) { return this.client.search(base, '(uid=' + req.query.u + ')'); } }",
        errors: filterError,
      },
      {
        name: 'a receiver chosen between two clients is not provably something else',
        code: "export function f(req, primary, fallback) { (primary ?? fallback).search(base, '(uid=' + req.query.u + ')'); }",
        errors: filterError,
      },
      {
        name: 'a binding written once with a client and once with a Set may be the client',
        code: "export function f(req) { let c = new Set(); c = ldapjs.createClient({}); c.search(base, '(uid=' + req.query.u + ')'); }",
        errors: filterError,
      },
    ]),
  });
});
