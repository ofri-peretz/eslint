/**
 * Tests for no-env-injection
 * Security: CWE-99 (Resource Injection — environment variable injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noEnvInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-env-injection', () => {
  ruleTester.run('no-env-injection', noEnvInjection, {
    valid: [
      // corpus/CWE-099/safe/env-allowlisted-key.js — the key is the RESULT of
      // a lookup in a closed allowlist, so it can only ever be one of the
      // strings written in the source. This is the accepted fix, and a
      // "the key is not a literal" check would have reported it.
      `const ALLOWED = { locale: 'APP_LOCALE', theme: 'APP_THEME' };
       function setConfig(req, res) {
         const target = ALLOWED[req.body.setting];
         if (!target) return res.status(400).end();
         process.env[target] = String(req.body.value);
         res.status(204).end();
       }`,
      // Constant keys, in both spellings.
      `process.env.NODE_ENV = 'production';`,
      `process.env['NODE_ENV'] = 'production';`,
      // A request-derived VALUE under a key the source names is a different
      // (and far weaker) concern — this rule judges the key.
      `function h(req) { process.env.APP_LOCALE = req.body.locale; }`,
      // Not process.env.
      `function h(req) { config[req.body.key] = req.body.value; }`,
      `function h(req) { process.argv[req.body.key] = 1; }`,
      `function h(req) { other.env[req.body.key] = 1; }`,
      `function h(req) { process['env'][req.body.key] = 1; }`,
      // Assignment target is not a member expression at all.
      `function h(req) { let x; x = req.body.key; }`,
      // A key traced to something that is not request-derived.
      `function h(req) { const k = 'APP_' + suffix; process.env[k] = 1; }`,
      `function h(req) { const k = compute(); process.env[k] = 1; }`,
      `process.env[k] = 1;`,
      // A key whose binding is written more than once cannot be traced, and an
      // unproven binding is not a finding.
      `function h(req) { let k = 'A'; k = req.body.key; process.env[k] = 1; }`,
      // Declared without an initializer.
      `function h(req) { let k; process.env[k] = 1; }`,
      // A parameter binding has no declarator to trace.
      `function h(k) { process.env[k] = 1; }`,
      // A parameter written exactly once still has no declarator to trace.
      `function h(k) { k = 'A'; process.env[k] = 1; }`,
      // A declared global written exactly once resolves to a variable with no
      // definition at all — nothing to trace, so nothing is proven either way.
      {
        name: 'a constant key',
        code: `KEY = 'A'; process.env[KEY] = '1';`,
        languageOptions: { globals: { KEY: 'writable' } },
      },
      // Member chain rooted at something that is not an identifier.
      `function h(req) { process.env[getReq().body.key] = 1; }`,
      // Trace depth: four hops of aliasing is past the budget.
      `function h(req) {
         const a = req.body.key; const b = a; const c = b; const d = c;
         process.env[d] = 1;
       }`,
      // Object.assign shapes that are not a bulk environment overwrite.
      `Object.assign(process.env, { NODE_ENV: 'production' });`,
      `Object.assign(process.env);`,
      `function h(req) { Object.assign(target, req.body); }`,
      `function h(req) { Object.assign(); }`,
      `function h(req) { Object.keys(req.body); }`,
      `function h(req) { Object['assign'](process.env, req.body); }`,
      `function h(req) { helpers.assign(process.env, req.body); }`,
      `function h(req) { assign(process.env, req.body); }`,
      `function h(req) { obj.deep.assign(process.env, req.body); }`,
      // A private method — a non-computed member whose property is not an
      // Identifier.
      `class C { #assign(a, b) { return a + b; } m(req) { return this.#assign(process.env, req.body); } }`,

      // `requestRootNames` REPLACES the default list; `extraRequestRoots`
      // could only grow it, and growth cannot undo a word we guessed wrong.
      {
        name: 'a local named `event` that is not the request, default replaced',
        code: `function setConfig(event) {
                 process.env[event.body.key] = event.body.value;
               }`,
        options: [{ requestRootNames: [] }],
      },
    ],
    invalid: [
      // The two options COMPOSE: `extraRequestRoots` is appended to whatever
      // `requestRootNames` is, so this pair means exactly `inbound`.
      {
        name: 'a replaced root list plus one extra root',
        code: `function setConfig(inbound) {
                 process.env[inbound.body.key] = inbound.body.value;
               }`,
        options: [{ requestRootNames: [], extraRequestRoots: ['inbound'] }],
        errors: [{ messageId: 'envKeyInjection' }],
      },
      // A word the default never contained, reached only by replacing it.
      {
        name: 'a custom request root name',
        code: `function setConfig(payload) {
                 process.env[payload.body.key] = payload.body.value;
               }`,
        options: [{ requestRootNames: ['payload'] }],
        errors: [{ messageId: 'envKeyInjection' }],
      },
      // corpus/CWE-099/vulnerable/env-key-from-user.js — both key and value
      // come from req.body; the key is what makes it a finding.
      {
        name: 'a request key and value written into process.env',
        code: `function setConfig(req, res) {
                 const { key, value } = req.body;
                 process.env[key] = value;
                 res.status(204).end();
               }`,
        errors: [{ messageId: 'envKeyInjection' }],
      },
      // The direct spelling, with no binding in between.
      {
        code: `function h(req) { process.env[req.body.key] = req.body.value; }`,
        errors: [{ messageId: 'envKeyInjection' }],
      },
      {
        code: `function h(request) { process.env[request.query.name] = '1'; }`,
        errors: [{ messageId: 'envKeyInjection' }],
      },
      {
        code: `function h(ctx) { process.env[ctx.request.body.name] = '1'; }`,
        errors: [{ messageId: 'envKeyInjection' }],
      },
      {
        code: `function h(event) { process.env[event.queryStringParameters.k] = '1'; }`,
        errors: [{ messageId: 'envKeyInjection' }],
      },
      // The request object itself used as the key.
      {
        code: `function h(req) { process.env[req] = '1'; }`,
        errors: [{ messageId: 'envKeyInjection' }],
      },
      // One alias hop, and two.
      {
        code: `function h(req) { const k = req.body.key; process.env[k] = '1'; }`,
        errors: [{ messageId: 'envKeyInjection' }],
      },
      {
        code: `function h(req) { const a = req.body.key; const b = a; process.env[b] = '1'; }`,
        errors: [{ messageId: 'envKeyInjection' }],
      },
      // A custom request root.
      {
        code: `function h(payload) { process.env[payload.key] = '1'; }`,
        options: [{ extraRequestRoots: ['payload'] }],
        errors: [{ messageId: 'envKeyInjection' }],
      },
      // Bulk overwrite — the caller picks every name at once.
      {
        code: `function h(req) { Object.assign(process.env, req.body); }`,
        errors: [{ messageId: 'envBulkInjection' }],
      },
      // The request-derived source is not the first one.
      {
        code: `function h(req) { Object.assign(process.env, defaults, req.body); }`,
        errors: [{ messageId: 'envBulkInjection' }],
      },
    ],
  });
});
