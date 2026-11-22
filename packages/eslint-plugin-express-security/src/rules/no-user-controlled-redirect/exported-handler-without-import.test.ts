/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An open redirect in a handler that is DEFINED in one module and REGISTERED in
 * another.
 *
 * ```js
 * // core/handlers.js: no express import, no app.get() here
 * module.exports.redirect = function (req, res) { res.redirect(req.query.url) }
 * // routes/app.js: router.get('/redirect', handlers.redirect)
 * ```
 *
 * The file imports nothing and registers nothing, so neither the import arm nor
 * the registered-on-a-path arm of the Express gate sees it. What is left as
 * evidence is the handler itself: exported, `(req, res)`, and driving `res` with a
 * method `node:http` does not have. Fixtures are not given an Express import: the
 * gate is under test.
 *
 * Every lookalike that must stay quiet is here with the one property it lacks.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUserControlledRedirect } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'script' },
});

describe('no-user-controlled-redirect: exported handler with no express import', () => {
  ruleTester.run('no-user-controlled-redirect', noUserControlledRedirect, {
    valid: [
      {
        name: 'Fastify: exported, but (request, reply)',
        code: `module.exports.redirect = function (request, reply) {
          return reply.redirect(request.query.url);
        };`,
      },
      {
        name: 'Koa: exported, but a single ctx parameter',
        code: `exports.redirect = async function (ctx) { ctx.redirect(ctx.query.url); };`,
      },
      {
        name: 'a plain function: (req, res) driving res.redirect, but never exported',
        code: `function redirect(req, res) { res.redirect(req.query.url); }
          redirect(a, b);`,
      },
      {
        name: 'a plain function held in a local, never exported',
        code: `const redirect = (req, res) => { res.redirect(req.query.url); };`,
      },
      {
        name: 'node:http: exported (req, res) that only uses res.writeHead and res.end',
        code: `exports.redirect = function (req, res) {
          res.writeHead(302, { Location: req.query.url });
          res.end();
        };`,
      },
      {
        name: 'exported (req, res) with a response call shared with Next.js only',
        code: `exports.show = function (req, res) { res.status(200).json(req.query); };`,
      },
      {
        name: 'exported, but the parameters are not a request and a response',
        code: `exports.redirect = function (a, b) { b.redirect(a.query.url); };`,
      },
      {
        name: 'exported (req, res) whose redirect call is on some other object',
        code: `exports.redirect = function (req, res) { audit.redirect(req.query.url); };`,
      },
      {
        name: 'a third parameter makes it something else (and `next` alone is the middleware arm)',
        code: `exports.redirect = function (req, res, extra) { res.send(req.query.url); };`,
      },
      {
        name: 'Next.js: a default export is how an API route is written, and its res has redirect',
        code: `export default function handler(req, res) { res.redirect(req.query.url); }`,
        languageOptions: { sourceType: 'module' },
      },
      {
        name: 'the same handler, redirect target a constant',
        code: `module.exports.home = function (req, res) { res.redirect('/home'); };`,
      },
      {
        name: 'the same handler with the documented origin guard',
        code: `module.exports.redirect = function (req, res) {
          if (new URL(req.query.url).host !== 'example.com') return res.sendStatus(400);
          return res.redirect(req.query.url);
        };`,
      },
    ],
    invalid: [
      {
        name: 'module.exports.name = function (req, res), the controller shape',
        code: `module.exports.redirect = function (req, res) {
          if (req.query.url) {
            return res.redirect(req.query.url);
          }
          return res.send('invalid redirect url');
        };`,
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        name: 'exports.name = arrow function',
        code: `exports.redirect = (req, res) => res.redirect(req.query.url);`,
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        name: 'a property of an exported object literal',
        code: `module.exports = {
          redirect: function (req, res) { res.redirect(req.query.url); },
        };`,
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        name: 'the whole module is one handler',
        code: `module.exports = function (req, res) { res.redirect(req.query.url); };`,
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        name: 'ES module named export, function declaration',
        code: `export function redirect(req, res) { res.redirect(req.body.next); }`,
        languageOptions: { sourceType: 'module' },
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        name: 'ES module named export, const arrow',
        code: `export const redirect = (request, response) => response.redirect(request.query.url);`,
        languageOptions: { sourceType: 'module' },
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        name: 'the evidence is render, not redirect: the redirect later in the file is still reported',
        code: `exports.show = function (req, res) { res.render('show'); };
          exports.go = function (req, res) { res.redirect(req.query.url); };`,
        errors: [{ messageId: 'openRedirect' }],
      },
    ],
  });
});
