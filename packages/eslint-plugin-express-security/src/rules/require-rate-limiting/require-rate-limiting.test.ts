/**
 * Tests for require-rate-limiting rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireRateLimiting } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-rate-limiting', requireRateLimiting, {
  valid: [
    // Express with rate limiting
    {
      code: `
        import express from 'express';
        import rateLimit from 'express-rate-limit';
        const app = express();
        app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
      `,
    },
    // With limiter variable
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(limiter);
      `,
    },
    // Alternative middleware
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(customRateLimiter());
      `,
      options: [{ alternativeMiddleware: ['customRateLimiter'] }],
    },
    // No express app
    {
      code: `
        import fastify from 'fastify';
        const app = fastify();
      `,
    },
    // Test file with allowInTests
    {
      code: `
        const app = express();
      `,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // assumeRateLimiting option (rate limiting provided by API Gateway)
    {
      code: `
        import express from 'express';
        const app = express();
        app.use(express.json());
      `,
      options: [{ assumeRateLimiting: true }],
    },
  ],
  invalid: [
    // Express without rate limiting
    {
      code: `
        import express from 'express';
        const app = express();
        app.use(helmet());
      `,
      errors: [
        {
          messageId: 'missingRateLimiting',
        },
      ],
    },
    // Express with only other middleware
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(cors());
        app.use(express.json());
      `,
      errors: [
        {
          messageId: 'missingRateLimiting',
        },
      ],
    },
  ],
});
