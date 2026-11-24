/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A route registered only outside production is not exposed there. Uptime
 * Kuma `server/server.js:291` mounts `/test-webhook` and
 * `/test-x-www-form-urlencoded` under `if (isDevEnv())`, and `isDevEnv`
 * (`src/util.ts:12`) returns `process.env.NODE_ENV === "development"`.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll } from 'vitest';
import { noExposedDebugEndpoints } from './index';

const root = mkdtempSync(join(tmpdir(), 'debug-endpoints-env-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const write = (name: string, text: string): void => {
  const file = join(root, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
// Plain JavaScript, which every engine's fallback parser reads.
write(
  'src/util.js',
  [
    'export function isDevEnv() { return process.env.NODE_ENV === "development"; }',
    'export function isProd() { return process.env.NODE_ENV === "production"; }',
    'export const isDebug = () => readFlag();',
  ].join('\n'),
);
const server = join(root, 'server/server.js');
const route = (
  test: string,
  extra = '',
): string => `import express from 'express';
${extra}
const app = express();
if (${test}) {
  app.post('/test-webhook', (req, res) => res.send('OK'));
}`;
const exposed = [{ messageId: 'violationDetected' as const }];

new RuleTester().run(
  'no-exposed-debug-endpoints (outside production)',
  noExposedDebugEndpoints,
  {
    valid: [
      {
        // @source uptime-kuma server/server.js:291
        // @found real-source scan
        name: 'FP: a dev-only helper imported from a relative module',
        filename: server,
        code: route('isDevEnv()', "import { isDevEnv } from '../src/util.js';"),
      },
      {
        name: 'a NODE_ENV comparison written inline',
        code: route("process.env.NODE_ENV === 'development'"),
      },
      {
        name: 'the literal on the left, quoted member',
        code: route("'test' == process.env['NODE_ENV']"),
      },
      {
        name: 'anything but production',
        code: route("process.env.NODE_ENV !== 'production'"),
      },
      {
        name: 'one half of an && is enough',
        code: route("enabled && process.env.NODE_ENV != 'production'"),
      },
      {
        name: 'a helper in the same file, nested in a block',
        code: `import express from 'express';
const app = express();
const isDev = () => process.env.NODE_ENV === 'dev';
function mount() {
  if (isDev()) {
    { app.get('/debug', handler); }
  }
}`,
      },
    ],
    invalid: [
      {
        name: 'a production-only branch still ships the route',
        filename: server,
        code: route('isProd()', "import { isProd } from '../src/util.js';"),
        errors: exposed,
      },
      {
        name: 'the else branch of a dev check runs in production',
        code: `import express from 'express';
const app = express();
if (process.env.NODE_ENV === 'development') { noop(); } else { app.get('/debug', handler); }`,
        errors: exposed,
      },
      {
        name: 'an || lets production in',
        code: route("process.env.NODE_ENV === 'development' || flag"),
        errors: exposed,
      },
      {
        name: 'a helper whose answer this cannot read',
        filename: server,
        code: route('isDebug()', "import { isDebug } from '../src/util.js';"),
        errors: exposed,
      },
      {
        name: 'a helper that takes arguments decides from them',
        code: route('isEnv("development")'),
        errors: exposed,
      },
      {
        name: 'a call that is not a function',
        code: route('flags()', 'const flags = 1;'),
        errors: exposed,
      },
      {
        name: 'NODE_ENV against a value this cannot read',
        code: route('process.env.NODE_ENV === mode'),
        errors: exposed,
      },
      {
        name: 'another environment variable says nothing about production',
        code: route("process.env.APP_ENV === 'development'"),
        errors: exposed,
      },
      {
        name: 'a relational operator is not an environment check',
        code: route("process.env.NODE_ENV > 'production'"),
        errors: exposed,
      },
      {
        name: 'a production environment named outright',
        code: route("process.env.NODE_ENV === 'production'"),
        errors: exposed,
      },
      {
        name: 'a helper that calls itself',
        code: route('loop()', 'function loop() { return loop(); }'),
        errors: exposed,
      },
    ],
  },
);
