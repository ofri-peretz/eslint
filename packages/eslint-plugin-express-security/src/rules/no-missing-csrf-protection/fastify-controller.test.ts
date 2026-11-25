/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A Fastify controller is not an Express route module.
 *
 * activepieces registers its API as Fastify plugins:
 * `app.post('/', CreateRequest, async (req, res) => …)` inside a
 * `FastifyPluginAsyncZod`. The handler names (`req`, `res`) and the literal path
 * are exactly the shape the Express evidence probe accepts for route modules
 * that receive `app` from their caller, so ILB-Corpus-Truth run 45474907652
 * counted 25 CSRF findings across nine of these files. Fixtures are not given an
 * Express import: the gate is under test.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingCsrfProtection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

// Reduced from activepieces packages/server/api/src/app/ee/api-keys/api-key-module.ts.
const controller = `
export const apiKeyController: FastifyPluginAsyncZod = async (app) => {
  app.post('/', CreateRequest, async (req, res) => {
    const newApiKey = await apiKeyService.add({ displayName: req.body.displayName });
    return res.status(201).send(newApiKey);
  });
  app.delete('/:id', DeleteRequest, async (req, res) => {
    await apiKeyService.delete({ id: req.params.id });
    return res.status(204).send();
  });
};`;

/** Both routes report, each with the "add csrf() after the path" suggestion. */
const twoReports = (code: string) => [
  {
    messageId: 'missingCsrfProtection' as const,
    suggestions: [
      {
        messageId: 'addCsrfValidation' as const,
        output: code.replace("app.post('/',", "app.post('/', csrf(),"),
      },
    ],
  },
  {
    messageId: 'missingCsrfProtection' as const,
    suggestions: [
      {
        messageId: 'addCsrfValidation' as const,
        output: code.replace(
          "app.delete('/:id',",
          "app.delete('/:id', csrf(),",
        ),
      },
    ],
  },
];
const noOtherFramework = `import { z } from 'zod';\n${controller}`;
const expressAndFastify = `import 'express';\nimport { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';\n${controller}`;

describe('no-missing-csrf-protection: Fastify controller', () => {
  ruleTester.run('no-missing-csrf-protection', noMissingCsrfProtection, {
    valid: [
      {
        name: 'Fastify plugin, type-only import from fastify-type-provider-zod',
        code: `import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';\n${controller}`,
      },
      {
        name: 'Fastify plugin importing fastify itself',
        code: `import type { FastifyInstance } from 'fastify';\n${controller}`,
      },
    ],
    invalid: [
      {
        name: 'the same routes in a file with no other framework still report',
        code: noOtherFramework,
        errors: twoReports(noOtherFramework),
      },
      {
        name: 'an explicit Express import wins over a Fastify import',
        code: expressAndFastify,
        errors: twoReports(expressAndFastify),
      },
    ],
  });
});
