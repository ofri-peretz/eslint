/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * "Self or holder of the right": `req.params.userId !== user.id`, where `user`
 * is what `passport.authenticate` handed its callback and the same callback
 * stores it as `req.user`. The id on the right is the server's, so the check
 * does not pass "for anyone who sets the field". Found linting popular Express
 * starters.
 *
 * The evidence is a binding, resolved through scope and the module graph: a
 * parameter (never reassigned, no property written) of the callback that
 * `passport.authenticate` (with `passport` resolved to the module) invokes,
 * stored on the same request binding the client value was read from. A
 * parameter of any other function, a local copy of client input, a parameter
 * stored on another request, or a principal whose properties are overwritten
 * still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { noClientControlledAuthorization } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const report = { messageId: 'clientControlledAuthorization' as const };

const withPassport = (body: string) =>
  `const express = require('express');\nconst passport = require('passport');\n${body}`;

describe('no-client-controlled-authorization — self or right', () => {
  ruleTester.run('self-or-right-check', noClientControlledAuthorization, {
    valid: [
      {
        // @source hagopj13/node-express-boilerplate src/middlewares/auth.js:15
        // @found linting popular Express and NestJS starters
        name: 'FP: the id is compared to the principal passport handed the callback, stored on this request',
        code: withPassport(`
          const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
            if (err || info || !user) return reject(new Error('Please authenticate'));
            req.user = user;
            if (requiredRights.length) {
              const hasRequiredRights = requiredRights.every((r) => user.rights.includes(r));
              if (!hasRequiredRights && req.params.userId !== user.id) {
                return reject(new Error('Forbidden'));
              }
            }
            resolve();
          };
          const auth = (...requiredRights) => async (req, res, next) => {
            return new Promise((resolve, reject) => {
              passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
            });
          };
        `),
      },
      {
        name: 'the callback is written inline in the authenticate call',
        code: withPassport(`
          function handler(req, res, next) {
            passport.authenticate('jwt', (err, user) => {
              req.user = user;
              if (req.params.userId !== user.id) return res.sendStatus(403);
              next();
            })(req, res, next);
          }
        `),
      },
      {
        name: 'the factory is a function declaration that returns the callback',
        code: withPassport(`
          function makeVerify(req) {
            return (err, user) => {
              req.user = user;
              if (req.params.userId === user.id) return;
            };
          }
          passport.authenticate('jwt', makeVerify(req));
        `),
      },
      {
        name: 'the factory returns from inside a block',
        code: withPassport(`
          function makeVerify(req, strict) {
            if (strict) {
              return (err, user) => {
                req.user = user;
                if (req.params.userId === user.id) return;
              };
            }
          }
          passport.authenticate('jwt', makeVerify(req, true));
        `),
      },
      {
        name: 'the principal is stored after the comparison, in the same callback',
        code: withPassport(`
          function handler(req) {
            passport.authenticate('jwt', (err, user) => {
              if (req.params.userId !== user.id) return;
              req.user = user;
            });
          
          }
        `),
      },
      {
        name: 'the principal is stored under req.auth',
        code: withPassport(`
          function handler(req) {
            passport.authenticate('jwt', (err, claims) => {
              req.auth = claims;
              if (req.params.userId === claims.sub) return;
            });
          
          }
        `),
      },
      {
        name: 'a property of the principal that is only read does not invalidate it',
        code: withPassport(`
          function handler(req) {
            passport.authenticate('jwt', (err, user) => {
              req.user = user;
              log(user.id);
              if (req.params.userId === user.id) return;
            });
          
          }
        `),
      },
      {
        name: 'a property of the principal that is read on the right of an assignment or by typeof is not a write',
        code: withPassport(`
          function handler(req) {
            passport.authenticate('jwt', (err, user) => {
              req.user = user;
              req.cache = user.id;
              if (typeof user.id === 'undefined') return;
              if (req.params.userId === user.id) return;
            });
          }
        `),
      },
      {
        name: 'a read through the request slot, and writes elsewhere on the request, do not invalidate the principal',
        code: withPassport(`
          function handler(req, k) {
            passport.authenticate('jwt', (err, user) => {
              req.user = user;
              log(req.user.id);
              req.params.page = 2;
              req[k].flag = true;
              if (req.params.userId === user.id) return;
            });
          }
        `),
      },
    ],
    invalid: [
      {
        name: 'the same comparison with nothing stored on the request still reports',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            if (req.params.userId !== user.id) return;
          });
        `),
        errors: [report],
      },
      {
        // Review: a parameter alone is not evidence of a verifier.
        name: "a parameter of an ordinary function can be handed the client's own object",
        code: withPassport(`
          function check(req, user) {
            req.user = user;
            if (req.params.userId === user.id) grant();
          }
          check(req, req.body);
        `),
        errors: [report],
      },
      {
        // Review: a property write is not a reassignment of the binding.
        name: 'a principal whose compared property is overwritten from the client',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            req.user = user;
            user.id = req.body.userId;
            if (req.params.userId === user.id) grant();
          });
        `),
        errors: [report],
      },
      {
        name: 'a principal whose property is incremented or deleted is not untouched',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            req.user = user;
            user.attempts++;
            delete user.role;
            if (req.params.userId === user.id) grant();
          });
        `),
        errors: [report],
      },
      {
        name: 'authenticate on something that is not the passport module is not a verifier',
        code: `
          const express = require('express');
          const passport = { authenticate: (s, cb) => cb };
          passport.authenticate('jwt', (err, user) => {
            req.user = user;
            if (req.params.userId === user.id) grant();
          });
        `,
        errors: [report],
      },
      {
        name: 'a factory that is never passed to passport.authenticate is not a verifier',
        code: withPassport(`
          const verify = (req) => (err, user) => {
            req.user = user;
            if (req.params.userId === user.id) grant();
          };
          verify(req);
        `),
        errors: [report],
      },
      {
        name: 'a function returned from an anonymous factory has no name to follow',
        code: withPassport(`
          register(function (req) {
            return (err, user) => {
              req.user = user;
              if (req.params.userId === user.id) grant();
            };
          });
        `),
        errors: [report],
      },
      {
        name: 'a factory bound by a destructuring pattern has no name to follow',
        code: withPassport(`
          const [verify] = (req) => (err, user) => {
            req.user = user;
            if (req.params.userId === user.id) grant();
          };
        `),
        errors: [report],
      },
      {
        name: "a local copy of client input stored as req.user is the client's word",
        code: withPassport(`
          passport.authenticate('jwt', () => {
            const user = req.body.user;
            req.user = user;
            if (req.params.userId !== user.id) return;
          });
        `),
        errors: [report],
      },
      {
        name: 'a parameter stored on a different request binding does not vouch for this one',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            other.user = user;
            if (req.params.userId !== user.id) return;
          });
        `),
        errors: [report],
      },
      {
        name: 'a parameter that is rewritten before it is stored is not provably server-side',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            user = JSON.parse(req.headers['x-user']);
            req.user = user;
            if (req.params.userId !== user.id) return;
          });
        `),
        errors: [report],
      },
      {
        name: 'a stored principal compared with a second client value reports both',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            req.user = user;
            if (req.params.userId !== req.body.userId) return;
          });
        `),
        errors: [report, report],
      },
      {
        name: 'a stored principal does not exempt a decision that is not a comparison with it',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            req.user = user;
            if (req.body.role === 'admin') return;
          });
        `),
        errors: [report],
      },
      {
        name: 'a computed slot or a non-identifier value stores nothing',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            req[slot] = user;
            req.user = wrap(user);
            if (req.params.userId !== user.id) return;
          });
        `),
        errors: [report],
      },
      {
        name: 'a request reached through this has no root binding, so nothing is proven',
        code: withPassport(`
          class Guard {
            check(user) {
              if (this.request.params.userId !== user.id) return;
            }
          }
        `),
        errors: [report],
      },
      {
        name: 'a principal side that is not rooted at a binding proves nothing',
        code: withPassport(`
          passport.authenticate('jwt', (err, user) => {
            req.user = user;
            if (req.params.userId !== getUser().id) return;
          });
        `),
        errors: [report],
      },
      {
        name: 'a callback handed to a plain function is not a passport verifier',
        code: withPassport(`
          function handler(req) {
          check((err, user) => {
            req.user = user;
            if (req.params.userId === user.id) grant();
          });
        
          }
        `),
        errors: [report],
      },
      {
        name: 'a callback handed to another method of passport is not the authenticate callback',
        code: withPassport(`
          function handler(req) {
          passport.initialize((err, user) => {
            req.user = user;
            if (req.params.userId === user.id) grant();
          });
        
          }
        `),
        errors: [report],
      },
      {
        // Review: the write goes through the request slot, not the binding.
        name: 'a write through req.user changes the object user.id reads',
        code: withPassport(`
          function handler(req) {
            passport.authenticate('jwt', (err, user) => {
              req.user = user;
              req.user.id = req.body.userId;
              if (req.params.userId === user.id) grant();
            });
          }
        `),
        errors: [report],
      },
      {
        // Review: the write is on a nested property.
        name: 'a write to a nested property of the principal',
        code: withPassport(`
          function handler(req) {
            passport.authenticate('jwt', (err, user) => {
              req.user = user;
              user.profile.id = req.body.id;
              if (req.params.userId === user.profile.id) grant();
            });
          }
        `),
        errors: [report],
      },
      {
        // Review: info is strategy metadata, not the authenticated user.
        name: 'info, the third callback argument, is not the principal',
        code: withPassport(`
          function handler(req) {
            passport.authenticate('jwt', (err, user, info) => {
              req.user = info;
              if (req.params.userId === info.id) grant();
            });
          }
        `),
        errors: [report],
      },
    ],
  });
});
