/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting open-source Node apps: a user-creation endpoint that takes
 * `role` from the body but compares it with the requester's own role first,
 * through the app's own helper.
 *
 *   if (role && !canInteract(req.user.role, role)) throw new ApiError(3008);
 *   await db.insert(users).values({ username, role: role });
 *
 * The evidence is the flow: an early exit whose condition calls something with
 * both the binding being written and a role read of the requester. The helper's
 * name is never read. Every lookalike drops one half of that evidence.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPrivilegeEscalation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const escalation = [{ messageId: 'privilegeEscalation' as const }];

const handler = (guard: string): string => `
  async function handler(req, res) {
    const { username, role } = req.body;
    ${guard}
    await db.insert(users).values({ username, role: role });
  }
`;

ruleTester.run(
  'a role comparison with the requester guards the write',
  noPrivilegeEscalation,
  {
    valid: [
      {
        name: 'a guard clause comparing the requested role with the requester role',
        code: handler(
          'if (role && !canInteract(req.user.role, role)) throw new ApiError(3008);',
        ),
      },
      {
        name: 'the requester role read through a differently named object',
        code: handler(
          'if (!compareRoles(session.userRole, role)) return res.status(403).end();',
        ),
      },
    ],
    invalid: [
      {
        name: 'no guard at all',
        code: handler(''),
        errors: escalation,
      },
      {
        name: 'a guard that only checks the requested role',
        code: handler('if (!isKnown(role)) throw new ApiError(3008);'),
        errors: escalation,
      },
      {
        name: 'a guard whose second role is the request’s own',
        code: handler(
          'if (!canInteract(req.body.role, role)) throw new ApiError(3008);',
        ),
        errors: escalation,
      },
      {
        name: 'a guard whose other argument is not a role read',
        code: handler(
          'if (!canInteract(req.user.name, role)) throw new ApiError(3008);',
        ),
        errors: escalation,
      },
      {
        name: 'a comparison that does not exit',
        code: handler('if (!canInteract(req.user.role, role)) { log(role); }'),
        errors: escalation,
      },
      {
        name: 'a guard on a different binding than the one written',
        code: handler(
          'if (!canInteract(req.user.role, other)) throw new ApiError(3008);',
        ),
        errors: escalation,
      },
      {
        name: 'a guard that follows the write',
        code: `
          async function handler(req, res) {
            const { username, role } = req.body;
            await db.insert(users).values({ username, role: role });
            if (!canInteract(req.user.role, role)) throw new ApiError(3008);
          }
        `,
        errors: escalation,
      },
      {
        name: 'a written value that is not a plain binding',
        code: `
          async function handler(req, res) {
            if (!canInteract(req.user.role, req.body.role)) throw new ApiError(3008);
            await db.insert(users).values({ role: req.body.role });
          }
        `,
        errors: escalation,
      },
    ],
  },
);
