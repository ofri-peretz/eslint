/**
 * Tests for no-ssrf rule
 * Security: CWE-918 - Server-Side Request Forgery (SSRF)
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

describe('no-ssrf', () => {
  describe('Valid - Safe Patterns', () => {
    ruleTester.run('valid - safe requests', noSsrf, {
      valid: [
        // Literal URLs — always safe
        { code: 'fetch("https://api.example.com/data");' },
        { code: 'axios.get("https://api.stripe.com/charges");' },
        { code: 'needle.get("https://api.example.com/data");' },
        // Template literal without expressions — safe
        { code: 'fetch(`https://api.example.com/data`);' },
        // Non-HTTP calls — not relevant
        { code: 'console.log(userUrl);' },
        { code: 'db.query(userInput);' },
        // Test files ignored by default
        {
          code: 'fetch(userUrl);',
          filename: 'api.test.ts',
          options: [{ allowInTests: true }],
        },
        // Variable name doesn't suggest user input
        { code: 'const config = getConfig(); fetch(config);' },
      ],
      invalid: [],
    });
  });

  describe('Invalid - SSRF Vulnerabilities', () => {
    ruleTester.run('invalid - unvalidated dynamic URLs', noSsrf, {
      valid: [],
      invalid: [
        // fetch with user-controlled URL
        {
          code: 'fetch(userUrl);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // axios.get with user-controlled endpoint
        {
          code: 'axios.get(endpoint);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // needle.get with user-controlled endpoint
        {
          code: 'needle.get(req.query.url);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // axios.post
        {
          code: 'axios.post(targetUrl, data);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // http.request
        {
          code: 'http.request(userUrl);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // got with user URL
        {
          code: 'got(userUrl);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
      ],
    });
  });

  describe('Benchmark FP/FN Regression', () => {
    ruleTester.run('benchmark regression', noSsrf, {
      valid: [
        // safe_ssrf_allowlist — validated with ALLOWED_HOSTS.includes()
        {
          code: `
            const ALLOWED_HOSTS = ["api.stripe.com", "api.twilio.com"];
            const url = new URL(endpoint);
            if (!ALLOWED_HOSTS.includes(url.host)) {
              throw new Error("Host not allowed");
            }
            fetch(endpoint);
          `,
        },
        // safe_ssrf_block_internal — validated with regex .test()
        {
          code: `
            const url = new URL(userUrl);
            const hostname = url.hostname;
            const internalPatterns = [/^localhost$/i, /^127\\./];
            if (internalPatterns.some((p) => p.test(hostname))) {
              throw new Error("Internal hosts not allowed");
            }
            fetch(userUrl);
          `,
        },
      ],
      invalid: [
        // vuln_ssrf_fetch — fetch with unvalidated user URL
        {
          code: `
            async function vuln_ssrf_fetch(userUrl) {
              const response = await fetch(userUrl);
              return response.json();
            }
          `,
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // vuln_ssrf_axios — axios.get with unvalidated endpoint
        {
          code: `
            async function vuln_ssrf_axios(endpoint) {
              return axios.get(endpoint);
            }
          `,
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
      ],
    });
  });

  /**
   * Confirmed FP, 2026-07-31 — benchmarks/corpus/CWE-444/safe/
   * request-default-parser.js. A Node options object is not a URL, and its
   * fields being plain locals is not evidence of user flow. The old gate only
   * ran for Identifier arguments, so every other shape reported unconditionally.
   */
  describe('Benchmark FP — options object with no user-data flow', () => {
    ruleTester.run('CWE-444 safe corpus fixture', noSsrf, {
      valid: [
        // Verbatim from benchmarks/corpus/CWE-444/safe/request-default-parser.js
        {
          code: `
            const https = require('https');

            function fetchProfile(host, path, cb) {
              const req = https.request({ host, path, method: 'GET' }, (res) => {
                let body = '';
                res.on('data', (c) => (body += c));
                res.on('end', () => cb(null, body));
              });
              req.on('error', cb);
              req.end();
            }

            module.exports = { fetchProfile };
          `,
        },
        // Same shape, no callback — the options object alone is not a URL
        { code: "http.request({ hostname: host, port, path });" },
        // Interpolated path built from locals — no user-input-named identifier
        { code: 'function load(id) { return fetch(`https://api.internal/items/${id}`); }' },
        // Object literal in a non-URL key holding a local
        { code: 'axios.request({ method: "GET", headers: authHeaders });' },
      ],
      invalid: [
        // Still caught: the options object carries a request-sourced URL
        {
          code: "https.request({ host: req.query.host, path: '/' });",
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // Still caught: a url-naming key holding a user-input-named identifier
        {
          code: 'got({ url: targetUrl });',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // Still caught: quoted url key
        {
          code: 'got({ "uri": userEndpoint });',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // Still caught: URL read straight off the request
        {
          code: 'app.get("/p", (req, res) => fetch(req.query.url));',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // Still caught: template literal interpolating a user-input-named id
        {
          code: 'fetch(`https://${userHost}/data`);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // Still caught: concatenation onto a fixed base
        {
          code: 'fetch("https://proxy/" + userUrl);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // Still caught: new URL(...) wrapping user input
        {
          code: 'axios.get(new URL(targetUrl, base));',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        // Still caught: ctx / event roots
        {
          code: 'fetch(ctx.request.body.feed);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
        {
          code: 'fetch(event.queryStringParameters.u);',
          errors: [{ messageId: 'ssrfVulnerability' }],
        },
      ],
    });
  });
});
