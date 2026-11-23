/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A liveness or readiness probe is a path, not a debug endpoint. Found linting
 * popular Express and NestJS starters: `app.use('/health-check', router)` was
 * reported because `/health-check` contains `/health`.
 *
 * Every spelling in the probe table has its own valid case, so removing one
 * from the rule fails a test. `/health` itself and the segments around a probe
 * name still report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { noExposedDebugEndpoints } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const report = [{ messageId: 'violationDetected' as const }];

describe('no-exposed-debug-endpoints — health probe segments', () => {
  ruleTester.run('health-probe-segments', noExposedDebugEndpoints, {
    valid: [
      {
        // @source edwinhern/express-typescript src/server.ts:30
        // @found linting popular Node.js packages and Express/NestJS starters
        name: 'FP: a router mounted at /health-check',
        code: `
          import express from 'express';
          const app = express();
          app.use('/health-check', healthCheckRouter);
        `,
      },
      {
        name: 'a probe spelled /healthcheck',
        code: "import 'express'; app.get('/healthcheck', probe);",
      },
      {
        name: 'a probe spelled /health_check',
        code: "import 'express'; app.get('/health_check', probe);",
      },
      {
        name: 'a probe spelled /healthz',
        code: "import 'express'; app.get('/healthz', probe);",
      },
      {
        name: 'a probe under a version prefix',
        code: "import 'express'; app.get('/api/v1/health-check', probe);",
      },
      {
        name: 'the probe spelling is case-insensitive',
        code: "import 'express'; app.get('/Health-Check', probe);",
      },
    ],
    invalid: [
      {
        name: 'a plain /health route still reports',
        code: "import 'express'; app.get('/health', probe);",
        errors: report,
      },
      {
        name: 'a debug path under a probe segment still reports',
        code: "import 'express'; app.get('/health-check/debug', probe);",
        errors: report,
      },
      {
        name: 'a probe-looking segment that is not a probe spelling still reports',
        code: "import 'express'; app.get('/health-details', probe);",
        errors: report,
      },
      {
        name: 'an admin path next to a probe still reports',
        code: "import 'express'; app.use('/admin/healthz', adminRouter);",
        errors: report,
      },
    ],
  });
});
