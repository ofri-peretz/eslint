import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noClientControlledAuthorization } from './index';

/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
const asExpress = (code: string): string => `import express from 'express';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const xp = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string' ? { output: asExpress(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asExpress(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-client-controlled-authorization', () => {
  ruleTester.run(
    'no-client-controlled-authorization',
    noClientControlledAuthorization,
    {
      valid: xp([
        // THE safe pattern — the attribute comes from the verified principal
        { code: `if (req.user.role === 'admin') { grant(); }` },
        {
          code: `if (req.auth.permissions.includes('billing:write')) { grant(); }`,
        },
        { code: `if (req.session.isAdmin) { grant(); }` },
        // Request input used for anything other than an access decision
        { code: `const role = req.body.role;` },
        { code: `logger.info(req.body.role);` },
        { code: `res.json({ role: req.body.role });` },
        { code: `if (flag) { log(req.body.role); }` },
        { code: `if (ready) req.body.role;` },
        // `??` supplies a default — not an access decision
        { code: `const role = req.body.role ?? 'viewer';` },
        // A switch on something other than the discriminant
        { code: `switch (mode) { case req.body.role: run(); break; }` },
        { code: `const label = req.body.role + '!';` },
        { code: `const kind = typeof req.body.role;` },
        { code: `save({ role: req.body.role, id: req.params.id });` },
        // Ordinary (non-authorization) request properties in a decision
        { code: `if (req.body.email === admin.email) { notify(); }` },
        { code: `if (req.query.page === '1') { first(); }` },
        { code: `if (req.headers['x-request-id']) { trace(); }` },
        {
          code: `if (req.headers['content-type'] === 'application/json') { parse(); }`,
        },
        // Not a request container
        { code: `if (req.role === 'admin') { grant(); }` },
        { code: `if (payload.body.role === 'admin') { grant(); }` },
        { code: `if (a.b.body.role === 'admin') { grant(); }` },
        { code: `if (body.role === 'admin') { grant(); }` },
        // Dynamic property name — not analysed
        { code: `if (req.body[field] === 'admin') { grant(); }` },
        { code: `if (req.body[0] === 'admin') { grant(); }` },
      ]),
      invalid: xp([
        // Role straight off the request body
        {
          code: `if (req.body.role === 'admin') { deleteEverything(); }`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // Truthiness check on a client-supplied flag
        {
          code: `if (req.query.isAdmin) { grant(); }`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // Negated guard clause
        {
          code: `if (!req.body.isAdmin) { return res.sendStatus(403); }`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // Permission list membership
        {
          code: `const ok = req.body.permissions.includes('billing:write');`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // The request value as the needle instead of the haystack
        {
          code: `const ok = ADMIN_ROLES.includes(req.body.role);`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        {
          code: `const ok = grants.some(req.query.scope);`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // Identity forwarded in a header the client can set
        {
          code: `if (req.headers['x-user-role'] === 'owner') { grant(); }`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // Ownership decided on a client-supplied id
        {
          code: `if (req.params.userId === record.ownerId) { allow(); }`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        {
          code: `if (req.cookies.tenantId !== record.tenant_id) { deny(); }`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // Ternary and logical decision positions
        {
          code: `const view = req.body.userType === 'admin' ? adminView : userView;`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        {
          code: `const allowed = req.body.isAdmin || isOwner(record);`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // switch on a client-supplied role is the same decision, other syntax
        {
          code: `switch (req.body.role) { case 'admin': adminAccess(); break; }`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // Koa-style nesting still reaches the request
        {
          code: `if (ctx.req.body.role === 'admin') { grant(); }`,
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
        // Project-specific attribute via options
        {
          code: `if (req.body.plan === 'enterprise') { unlock(); }`,
          options: [{ extraProperties: ['plan'] }],
          errors: [{ messageId: 'clientControlledAuthorization' as const }],
        },
      ]),
    },
  );
});
