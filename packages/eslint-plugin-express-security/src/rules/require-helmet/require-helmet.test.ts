/**
 * Tests for require-helmet rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireHelmet } from './index';
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

ruleTester.run('require-helmet', requireHelmet, {
  valid: [
    // Express with helmet middleware
    {
      code: `
        import express from 'express';
        import helmet from 'helmet';
        const app = express();
        app.use(helmet());
      `,
    },
    // Express with helmet inline
    {
      code: `
        const express = require('express');
        const helmet = require('helmet');
        const app = express();
        app.use(helmet());
      `,
    },
    // Express with specific helmet middleware
    {
      code: `
        import express from 'express';
        import helmet from 'helmet';
        const app = express();
        app.use(helmet.contentSecurityPolicy());
        app.use(helmet.xssFilter());
      `,
    },
    // Alternative middleware accepted
    {
      code: `
        import express from 'express';
        const app = express();
        app.use(secureHeaders());
      `,
      options: [{ alternativeMiddleware: ['secureHeaders'] }],
    },
    // No express app - should not trigger
    {
      code: `
        import fastify from 'fastify';
        const app = fastify();
      `,
    },
    // Test file with allowInTests
    {
      code: `
        import express from 'express';
        const app = express();
      `,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // assumeHelmetMiddleware option (helmet provided by infrastructure)
    {
      code: `
        import express from 'express';
        const app = express();
        app.use(express.json());
      `,
      options: [{ assumeHelmetMiddleware: true }],
    },
  ],
  invalid: [
    // Express without helmet
    {
      code: `
        import express from 'express';
        const app = express();
        app.use(express.json());
      `,
      errors: [
        {
          messageId: 'missingHelmet',
        },
      ],
    },
    // CommonJS require without helmet
    {
      code: `
        const express = require('express');
        const app = express();
      `,
      errors: [
        {
          messageId: 'missingHelmet',
        },
      ],
    },
    // Express with other middleware but not helmet
    {
      code: `
        import express from 'express';
        import cors from 'cors';
        const app = express();
        app.use(cors());
        app.use(express.json());
      `,
      errors: [
        {
          messageId: 'missingHelmet',
        },
      ],
    },
    // Test file without allowInTests
    {
      code: `
        import express from 'express';
        const app = express();
      `,
      options: [{ allowInTests: false }],
      filename: 'app.test.ts',
      errors: [
        {
          messageId: 'missingHelmet',
        },
      ],
    },
  ],
});
