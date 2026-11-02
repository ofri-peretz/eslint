/**
 * no-ssrf — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_ssrf.qnt): request
 * evidence inside an `https.request` options object was recognised only as a
 * direct member read, so a template over a request value or a destructured
 * request field in `host` was missed.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSsrf } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-ssrf fidelity', () => {
  ruleTester.run('evidence inside an options object', noSsrf, {
    valid: [
      {
        name: 'an options object of helper parameters is still not evidence',
        code: `import https from 'node:https';
export function fetchProfile(host: string, path: string, cb: any) { return https.request({ host, path, method: 'GET' }, cb); }`,
      },
    ],
    invalid: [
      {
        name: 'a template over a request value in host is evidence',
        code: `import https from 'node:https';
const API_BASE = 'https://api.partner.example';
export async function handler(req: any) { return https.request({ host: \`\${API_BASE}\${req.params.path}\`, path: '/', method: 'GET' }); }`,
        errors: 1,
      },
      {
        name: 'a destructured request field in host is evidence',
        code: `import https from 'node:https';
export async function handler(req: any) { const { feedUrl } = req.body; return https.request({ host: feedUrl, path: '/', method: 'GET' }); }`,
        errors: 1,
      },
      {
        name: 'reportUnresolvedUrls covers a user-input-named host field',
        code: `import https from 'node:https';
export async function handler(req: any, userUrl: string) { return https.request({ host: userUrl, path: '/', method: 'GET' }); }`,
        options: [{ reportUnresolvedUrls: true }],
        errors: 1,
      },
    ],
  });
});
