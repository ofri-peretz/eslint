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
      {
        name: 'an inline probe handler that only answers a status is excused',
        code: "import 'express'; app.get('/healthz', (req, res) => res.sendStatus(200));",
      },
      {
        name: 'a property or key that is merely named process or os is not the host',
        code: "import 'express'; app.get('/healthz', (req, res) => res.json({ process: 'up', os: ctx.process }));",
      },
      {
        name: 'a process or os binding the handler declares itself is not the global or the module',
        code: `
          import 'express';
          import fs from 'fs';
          app.get('/healthz', function (req, res, process) { res.json(fs && process); });
        `,
      },
      {
        name: 'a probe handler array that only answers a status is excused',
        code: "import 'express'; app.get('/healthz', [(req, res) => res.sendStatus(200)]);",
      },
      {
        name: 'a process property on another object, or a shadowed globalThis, is not the host',
        code: `
          import 'express';
          app.get('/healthz', (req, res) => res.json(ctx.process));
          function f(globalThis) { app.get('/livez', (req, res) => res.json(globalThis.process)); }
        `,
      },
      {
        name: 'a hole in a callback array is skipped',
        code: "import 'express'; app.get('/healthz', [, (req, res) => res.sendStatus(200)]);",
      },
    ],
    invalid: [
      {
        name: 'a probe whose handler sits in a callback array still reads the host',
        code: "import 'express'; app.get('/healthz', [(req, res) => res.json(process.env)]);",
        errors: report,
      },
      {
        name: 'a probe whose handler sits in a nested callback array still reads the host',
        code: "import 'express'; app.get('/healthz', [auth, [(req, res) => res.json(process.env)]]);",
        errors: report,
      },
      {
        name: 'process read through globalThis is the host',
        code: "import 'express'; app.get('/healthz', (req, res) => res.json(globalThis.process.env));",
        errors: report,
      },
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
      {
        // Review: a probe spelling alone must not excuse a handler that leaks the host.
        name: 'a probe path whose inline handler returns process.env still reports',
        code: "import 'express'; app.get('/healthz', (req, res) => res.json(process.env));",
        errors: report,
      },
      {
        name: 'a probe path whose handler reads process.memoryUsage still reports',
        code: "import 'express'; app.get('/health-check', function (req, res) { res.json(process.memoryUsage()); });",
        errors: report,
      },
      {
        name: 'a probe path whose handler reads the os module still reports',
        code: `
          import 'express';
          import os from 'node:os';
          app.get('/healthz', (req, res) => res.json({ cpus: os.cpus() }));
        `,
        errors: report,
      },
      {
        name: 'an endpoints list the user wrote is matched against the route as written',
        code: "import 'express'; app.get('/healthz', (req, res) => res.sendStatus(200));",
        options: [{ endpoints: ['/healthz'] }],
        errors: report,
      },
      {
        // Review: a configured global is not a local declaration that shadows it.
        name: 'process supplied as a configured global is still the host',
        code: "import 'express'; app.get('/healthz', (req, res) => res.json(process.env));",
        languageOptions: { globals: { process: 'readonly' } },
        errors: report,
      },
      {
        // Review: an aliased import of the process module is the host too.
        name: 'an aliased import of node:process is the host',
        code: `
          import 'express';
          import runtime from 'node:process';
          app.get('/healthz', (req, res) => res.json(runtime.env));
        `,
        errors: report,
      },
    ],
  });
});
