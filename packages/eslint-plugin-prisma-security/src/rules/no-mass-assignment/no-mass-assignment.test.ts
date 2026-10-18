/**
 * Tests for prisma-security/no-mass-assignment
 * CWE-915 — the request object written straight to the database.
 *
 * This rule shipped with no invalid case anywhere in the suite, so nothing
 * demonstrated that it ever reported. The factory behind it
 * (`createMassAssignmentRule`) is covered in eslint-devkit; what was missing is
 * proof that THIS plugin's wiring — its methods, receiver pattern and module
 * gate — actually fires on prisma code.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noMassAssignment } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

/**
 * The module gate, and a client. `prisma` used to be left undeclared and
 * recognised by its NAME (`/[Pp]risma$/`); it is now a client because it is
 * constructed from the import — `foo` would do exactly as well.
 */
const DRIVER = `import { PrismaClient } from '@prisma/client';\nconst prisma = new PrismaClient();\n`;

describe('no-mass-assignment', () => {
  ruleTester.run('no-mass-assignment', noMassAssignment, {
    valid: [
      {
        name: 'the fix — every field named explicitly',
        code:
          DRIVER +
          `await prisma.user.create({ data: { name: req.body.name } });`,
      },
      {
        name: 'a value the rule cannot classify is not assumed hostile',
        code: DRIVER + `await prisma.create(validated);`,
      },
      {
        name: 'a spread of something that is not the request',
        code: DRIVER + `await prisma.create({ ...defaults });`,
      },
      {
        // The module gate is the whole reason this plugin exists separately:
        // the same call shape in a file that never imports @prisma/client is
        // somebody else's API, not this one.
        name: 'silent without the driver import',
        code: `await prisma.user.create({ data: req.body });`,
      },
    ],
    invalid: [
      {
        // A third shape rather than a second spelling of the first: the rule's
        // position is 'the request object', and `req.body` is only one door into it.
        name: 'the query string is the request too, not just the body',
        code: DRIVER + `await prisma.user.create({ data: req.query });`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'the request object written straight through',
        code: DRIVER + `await prisma.user.create({ data: req.body });`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spreading the request carries every key it happens to hold',
        code: DRIVER + `await prisma.create({ ...req.body });`,
        errors: [{ messageId: 'untrustedSpread' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-prisma-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-mass-assignment — fp/fn review 2026-10', () => {
  const P =
    "import { PrismaClient, Prisma } from '@prisma/client';\nconst foo = new PrismaClient();\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-ma-'));
  fs.writeFileSync(
    path.join(dir, 'prisma.ts'),
    "import { PrismaClient } from '@prisma/client';\nexport default new PrismaClient();\n",
  );
  fs.writeFileSync(
    path.join(dir, 'prisma.service.ts'),
    "import { Injectable } from '@nestjs/common';\nimport { PrismaClient } from '@prisma/client';\n@Injectable()\nexport class PrismaService extends PrismaClient {}\n",
  );
  const ROUTE = path.join(dir, 'route.ts');
  const CONTROLLER = path.join(dir, 'user.controller.ts');

  ruleTester.run('fp-fn review 2026-10', noMassAssignment, {
    valid: [
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (a hash named like a client)
        name: 'FP: a crypto hash named like a Prisma client',
        code:
          P +
          "import { createHash } from 'node:crypto';\nconst client = createHash('md5');\nexport const h = (req) => client.update(req.body);",
      },
      {
        name: 'a DTO field named explicitly',
        code:
          "import { Body, Controller, Post } from '@nestjs/common';\n" +
          P +
          "@Controller('u')\nexport class C { @Post() h(@Body() bar: { name: string }) { return foo.user.create({ data: { name: bar.name } }); } }",
      },
    ],
    invalid: [
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (renamed client)
        name: 'FN: a client named anything at all',
        code:
          P + 'export const h = (bar) => foo.user.create({ data: bar.body });',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (Next.js route handler)
        name: 'FN: a Next.js route handler body from await request.json()',
        filename: ROUTE,
        code: "import foo from './prisma';\nexport async function POST(bar: Request) { const baz = await bar.json(); return foo.user.create({ data: baz }); }",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (NestJS @Body DTO)
        name: 'FN: a NestJS @Body() DTO written whole through an injected PrismaService',
        filename: CONTROLLER,
        code:
          "import { Body, Controller, Post } from '@nestjs/common';\nimport { PrismaService } from './prisma.service';\n" +
          "@Controller('u')\nexport class C { constructor(private readonly foo: PrismaService) {}\n  @Post() h(@Body() bar: unknown) { return this.foo.user.create({ data: bar }); } }",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found prisma-security FP/FN review 2026-10-12, synthetic probe (interactive transaction)
        name: 'FN: the transaction client Prisma hands its callback, and an extended client',
        code:
          P +
          'const qux = foo.$extends({});\nexport const h = (bar) => foo.$transaction(async (baz) => { await baz.user.create({ data: bar.body }); await qux.user.create({ data: bar.body }); });',
        errors: [
          { messageId: 'untrustedPayload' },
          { messageId: 'untrustedPayload' },
        ],
      },
    ],
  });
});
