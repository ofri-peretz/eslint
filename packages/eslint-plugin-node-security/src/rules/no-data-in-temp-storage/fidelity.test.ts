/**
 * no-data-in-temp-storage — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_data_in_temp_storage.qnt).
 *
 *   - a bound `path.join(os.tmpdir(), 'const')` that nothing writes through was
 *     reported, against the doc's "something writes through it" condition;
 *   - a write was recognised on any receiver spelled `fs`, so a local object
 *     named `fs` counted as the module.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDataInTempStorage } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-data-in-temp-storage fidelity', () => {
  ruleTester.run('the write condition and fs resolution', noDataInTempStorage, {
    valid: [
      {
        name: 'a tmpdir path that is only logged stores nothing',
        code: `import os from 'node:os'; import path from 'node:path';
export function persist(token: string) {
  const file = path.join(os.tmpdir(), 'report-cache.tmp');
  console.log(\`state lives in \${file}\`);
}`,
      },
      {
        name: 'a write on a local object named fs is not an fs write',
        code: `const fs = { writeFileSync: (p: string, d: string) => [p, d] };
export function persist(token: string) { fs.writeFileSync('/tmp/session.token', token); }`,
      },
    ],
    invalid: [
      {
        name: 'a tmpdir path written through its const reports',
        code: `import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
export function persist(token: string) {
  const file = path.join(os.tmpdir(), 'report-cache.tmp');
  fs.writeFileSync(file, token);
}`,
        errors: [{ messageId: 'predictableTempPath' }],
      },
      {
        name: 'an fs declared nowhere in the file is still the module',
        code: `export function persist(token: string) { fs.writeFileSync('/tmp/session.token', token); }`,
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
