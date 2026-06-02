#!/usr/bin/env -S npx tsx

/**
 * ILB Stress Test — exercises rules against hand-crafted FP/FN candidates.
 *
 * For each (rule, candidates[]) pair declared in CASES below:
 *   - Lints each `code` snippet with the rule (and only the rule) enabled
 *   - Compares actual fired/silent against expected
 *   - Reports per-case verdict: ✅ matches expectation, ❌ disagreement
 *
 * Disagreements are exactly the FP/FN findings we want to surface.
 *
 * The CASES below are seeded by hand based on the rule's source code +
 * the audit's per-rule findings (severity-audit.json, autofix-bench.json,
 * per-rule observability in scorecard.md). Replace / extend as new rules
 * are stress-tested.
 *
 * Output: benchmark-results/stress-test.json + a console report.
 *
 * Usage:
 *   tsx scripts/ilb-stress-test.ts                 # run all configured cases
 *   tsx scripts/ilb-stress-test.ts --rule=<name>   # one rule only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REPORT_PATH = path.join(ROOT, 'benchmark-results', 'stress-test.json');

const args = process.argv.slice(2);
const opt = (n: string) => {
  const eq = args.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = args.indexOf(`--${n}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const RULE_FILTER = opt('rule');

interface Case {
  label: string;
  code: string;
  expected: 'fire' | 'silent';
  hypothesis: string;
}

interface RuleSpec {
  pluginName: string; // npm package name, e.g. "eslint-plugin-secure-coding"
  pluginEntry: string; // relative path to plugin src
  fullRuleName: string; // e.g. "secure-coding/detect-object-injection"
  shortRuleName: string; // e.g. "detect-object-injection"
  cases: Case[];
}

// ---------------------------------------------------------------------------
// HAND-CRAFTED STRESS-TEST CASES — seeded from audit findings
// ---------------------------------------------------------------------------

const CASES: RuleSpec[] = [
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/detect-object-injection',
    shortRuleName: 'detect-object-injection',
    cases: [
      {
        label: 'FP: typed-array indexing (Three.js render-loop pattern)',
        hypothesis: 'Rule should skip Float32Array/Uint8Array typed-arrays since prototype pollution is impossible',
        expected: 'silent',
        code: `
          const buf = new Float32Array(16);
          const i = computeIndex();
          buf[i] = 0.5;
        `,
      },
      {
        label: 'FP: Object.hasOwn-guarded access',
        hypothesis: 'Bracket access guarded by Object.hasOwn / hasOwnProperty cannot be polluted',
        expected: 'silent',
        code: `
          function read(obj, key) {
            if (Object.hasOwn(obj, key)) {
              return obj[key];
            }
            return null;
          }
        `,
      },
      {
        label: 'FP: AST walker (codemod context)',
        hypothesis: 'When file imports @babel/types, node[name] is AST traversal not user input',
        expected: 'silent',
        code: `
          import { types as t } from '@babel/types';
          function visit(node, name) {
            return node[name];
          }
        `,
      },
      {
        label: 'TP: dynamic key from req.body',
        hypothesis: 'Should fire — classic prototype pollution',
        expected: 'fire',
        code: `
          function setProp(obj, req) {
            obj[req.body.key] = req.body.value;
          }
        `,
      },
      {
        label: 'FN: spread-merge of user input',
        hypothesis: 'Object.assign(target, req.body) is the same vuln as obj[key]=value but bypasses bracket-access detection',
        expected: 'fire',
        code: `
          function merge(target, req) {
            Object.assign(target, req.body);
            return target;
          }
        `,
      },
      {
        label: 'FP: ALLOWED.includes(key) guard before obj[key]',
        hypothesis: 'hasPrecedingValidation() detects allowlist includes() check — should be silent',
        expected: 'silent',
        code: `
          const ALLOWED_KEYS = ['name', 'email', 'age'];
          function setField(obj, key, value) {
            if (!ALLOWED_KEYS.includes(key)) throw new Error('invalid key');
            obj[key] = value;
          }
        `,
      },
      {
        label: 'FP: Set.has(key) guard before obj[key]',
        hypothesis: 'Set membership check before bracket access should be treated as validation',
        expected: 'silent',
        code: `
          const SAFE = new Set(['name', 'email']);
          function read(obj, key) {
            if (!SAFE.has(key)) return undefined;
            return obj[key];
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/no-graphql-injection',
    shortRuleName: 'no-graphql-injection',
    cases: [
      {
        label: 'TP: gql template with variable interpolation',
        hypothesis: 'Should fire — direct string interpolation in gql',
        expected: 'fire',
        code: `
          const gql = require('graphql-tag');
          function fetchUser(id) {
            return gql\`query { user(id: \${id}) { name } }\`;
          }
        `,
      },
      {
        label: 'FP: console.log template literal (not GraphQL)',
        hypothesis: 'Audit fix is supposed to detect console.log context — verify still works',
        expected: 'silent',
        code: `
          function log(name) {
            console.log(\`User logged in: \${name}\`);
          }
        `,
      },
      {
        label: 'FP: URL template (not GraphQL keywords)',
        hypothesis: 'Audit fix should skip https:// templates',
        expected: 'silent',
        code: `
          function makeUrl(host, target) {
            return new URL(target, \`https://\${host}\`);
          }
        `,
      },
      {
        label: 'FN: dynamic field selection in gql',
        hypothesis: 'Variable used as a FIELD name (not just a value) is harder to detect',
        expected: 'fire',
        code: `
          const gql = require('graphql-tag');
          function fetchField(field) {
            return gql\`query { user { \${field} } }\`;
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/no-hardcoded-credentials',
    shortRuleName: 'no-hardcoded-credentials',
    cases: [
      {
        label: 'TP: hardcoded API key',
        hypothesis: 'Should fire — clear hardcoded credential',
        expected: 'fire',
        code: `
          const apiKey = "my_api_key_12345_example";
          fetch('/api', { headers: { Authorization: apiKey } });
        `,
      },
      {
        label: 'FP: variable named password but value is from env',
        hypothesis: 'Audit fix exists; verify',
        expected: 'silent',
        code: `
          const password = process.env.DB_PASSWORD;
          db.connect({ password });
        `,
      },
      {
        label: 'FP: UI label string (i18n key)',
        hypothesis: 'Audit fix landed in iter-2 for label/name/type contexts',
        expected: 'silent',
        code: `
          const labels = { password: 'Enter your password', email: 'Email address' };
          element.setAttribute('type', 'password');
        `,
      },
      {
        label: 'FN: credential in array element',
        hypothesis: 'Credential in array literal may bypass detection',
        expected: 'fire',
        code: `
          const tokens = ['Bearer my_api_key_12345_example_456abcdefg', 'Cookie sid=...'];
          fetch('/api', { headers: { Authorization: tokens[0] } });
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/no-redos-vulnerable-regex',
    shortRuleName: 'no-redos-vulnerable-regex',
    cases: [
      {
        label: 'TP: catastrophic backtracking (a+)+',
        hypothesis: 'Classic ReDoS pattern',
        expected: 'fire',
        code: `
          const re = /^(a+)+$/;
          re.test(input);
        `,
      },
      {
        label: 'FP: linear regex with bounded quantifiers',
        hypothesis: 'Bounded quantifiers cannot cause ReDoS',
        expected: 'silent',
        code: `
          const re = /^[a-z]{1,10}$/;
          re.test(input);
        `,
      },
      {
        label: 'FP: anchored regex with character class',
        hypothesis: 'Atomic character classes are linear',
        expected: 'silent',
        code: `
          const emailLocal = /^[a-zA-Z0-9._%+-]+$/;
          emailLocal.test(input);
        `,
      },
      {
        label: 'FN: ReDoS in dynamically constructed RegExp',
        // eslint-disable-next-line no-template-curly-in-string -- string is a description of buggy code, not an interpolated template
        hypothesis: 'new RegExp(`(${pattern})+`) hides the catastrophic shape',
        expected: 'fire',
        code: `
          function build(pattern) {
            return new RegExp(\`^(\${pattern}+)+$\`);
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/no-unsafe-deserialization',
    shortRuleName: 'no-unsafe-deserialization',
    cases: [
      {
        label: 'TP: JSON.parse on req.body',
        hypothesis: 'User-controlled deserialization',
        expected: 'fire',
        code: `
          function load(req) {
            return JSON.parse(req.body.config);
          }
        `,
      },
      {
        label: 'FP: JSON.parse on a literal',
        hypothesis: 'Static input cannot be exploited',
        expected: 'silent',
        code: `
          const config = JSON.parse('{"timeout": 5000}');
        `,
      },
      {
        label: 'FP: JSON.parse on require()-loaded path',
        hypothesis: 'Internal config from require() is trusted',
        expected: 'silent',
        code: `
          const fs = require('fs');
          const config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf-8'));
        `,
      },
      {
        label: 'FN: JSON.parse(req.cookies.session)',
        hypothesis: 'Cookies are also user-controlled',
        expected: 'fire',
        code: `
          function load(req) {
            const data = JSON.parse(req.cookies.session);
            return data;
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-node-security',
    pluginEntry: 'packages/eslint-plugin-node-security/src/index.ts',
    fullRuleName: 'node-security/no-buffer-overread',
    shortRuleName: 'no-buffer-overread',
    cases: [
      {
        label: 'TP: Buffer.slice with user-controlled length',
        hypothesis: 'Possible overread when length > buffer.length',
        expected: 'fire',
        code: `
          function readChunk(buf, req) {
            return buf.slice(0, req.query.length);
          }
        `,
      },
      {
        label: 'FP: Buffer.slice with length-bounded literal',
        hypothesis: 'Statically-bounded length cannot overread',
        expected: 'silent',
        code: `
          const head = Buffer.alloc(1024);
          const first16 = head.slice(0, 16);
        `,
      },
      {
        label: 'FP: typed-array slice with provably-valid bound',
        hypothesis: 'Three.js render-loop pattern; bound derived from .length',
        expected: 'silent',
        code: `
          const data = new Float32Array(64);
          const half = data.slice(0, data.length / 2);
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/no-unchecked-loop-condition',
    shortRuleName: 'no-unchecked-loop-condition',
    cases: [
      {
        label: 'TP: while loop with no exit',
        hypothesis: 'Genuinely unbounded',
        expected: 'fire',
        code: `
          function poll() {
            while (true) {
              checkSomething();
            }
          }
        `,
      },
      {
        label: 'FP: for loop with literal bound',
        hypothesis: 'Bounded — not unchecked',
        expected: 'silent',
        code: `
          function process(arr) {
            for (let i = 0; i < arr.length; i++) {
              transform(arr[i]);
            }
          }
        `,
      },
      {
        label: 'FP: while loop with break condition',
        hypothesis: 'Has explicit exit',
        expected: 'silent',
        code: `
          function consume(stream) {
            while (true) {
              const chunk = stream.read();
              if (!chunk) break;
              process(chunk);
            }
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/no-insecure-comparison',
    shortRuleName: 'no-insecure-comparison',
    cases: [
      {
        label: 'TP: == on credentials',
        hypothesis: 'Timing-unsafe comparison on secrets',
        expected: 'fire',
        code: `
          function authenticate(token, expected) {
            if (token == expected) return true;
            return false;
          }
        `,
      },
      {
        label: 'FP: === on AST node types (codemod context)',
        hypothesis: 'Audit fix detects @babel/types imports → skip',
        expected: 'silent',
        code: `
          import * as t from '@babel/types';
          function isLiteral(node) {
            return node.type === 'Literal';
          }
        `,
      },
      {
        label: 'FP: .length comparison before timingSafeEqual',
        hypothesis: 'Standard pattern, addressed by audit',
        expected: 'silent',
        code: `
          const crypto = require('crypto');
          function safeCompare(a, b) {
            if (a.length !== b.length) return false;
            return crypto.timingSafeEqual(a, b);
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-node-security',
    pluginEntry: 'packages/eslint-plugin-node-security/src/index.ts',
    fullRuleName: 'node-security/detect-child-process',
    shortRuleName: 'detect-child-process',
    cases: [
      {
        label: 'TP: exec with user input',
        hypothesis: 'Classic command injection',
        expected: 'fire',
        code: `
          const { exec } = require('child_process');
          function run(cmd) { exec('ls ' + cmd); }
        `,
      },
      {
        label: 'FP: exec with literal command (audit iter-2 fix)',
        hypothesis: 'Fully literal command should be safe',
        expected: 'silent',
        code: `
          const { execSync } = require('child_process');
          execSync('git rev-parse HEAD');
        `,
      },
      {
        label: 'FN: spawn with user-controlled args array',
        hypothesis: 'spawn(cmd, [userArg]) — args from req still risky if cmd is shell',
        expected: 'fire',
        code: `
          const { spawn } = require('child_process');
          function run(req) {
            spawn('sh', ['-c', req.body.script]);
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-node-security',
    pluginEntry: 'packages/eslint-plugin-node-security/src/index.ts',
    fullRuleName: 'node-security/detect-non-literal-fs-filename',
    shortRuleName: 'detect-non-literal-fs-filename',
    cases: [
      {
        label: 'TP: fs.readFile with req param',
        hypothesis: 'Path traversal',
        expected: 'fire',
        code: `
          const fs = require('fs');
          function read(req) { return fs.readFileSync(req.params.path); }
        `,
      },
      {
        label: 'FP: path.resolve(__dirname, literal)',
        hypothesis: 'Module-relative path is safe',
        expected: 'silent',
        code: `
          const fs = require('fs');
          const path = require('path');
          const cfg = fs.readFileSync(path.resolve(__dirname, 'config.json'));
        `,
      },
      {
        label: 'FP: validated via allowlist (audit fix)',
        hypothesis: 'Audit added .includes() validation detection',
        expected: 'silent',
        code: `
          const fs = require('fs');
          const path = require('path');
          const ALLOWED = ['config.json', 'readme.txt'];
          function read(name) {
            if (!ALLOWED.includes(name)) throw new Error('bad');
            return fs.readFileSync(path.join('./conf', name));
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-node-security',
    pluginEntry: 'packages/eslint-plugin-node-security/src/index.ts',
    fullRuleName: 'node-security/no-ssrf',
    shortRuleName: 'no-ssrf',
    cases: [
      {
        label: 'TP: fetch with user-controlled URL parameter',
        hypothesis: 'Function param named "url" with URL substring → fire',
        expected: 'fire',
        code: `
          async function fetchData(url) {
            const res = await fetch(url);
            return res.json();
          }
        `,
      },
      {
        label: 'TP: axios.get with endpoint param',
        hypothesis: 'Function param named "endpoint" → fire',
        expected: 'fire',
        code: `
          async function proxy(endpoint) {
            return axios.get(endpoint);
          }
        `,
      },
      {
        label: 'FP: fetch with literal URL',
        hypothesis: 'Hardcoded string → safe, should not fire',
        expected: 'silent',
        code: `
          fetch('https://api.stripe.com/v1/charges');
        `,
      },
      {
        label: 'FP: fetch after allowlist validation',
        hypothesis: 'URL validated against ALLOWED_HOSTS → should not fire',
        expected: 'silent',
        code: `
          const ALLOWED_HOSTS = ['api.stripe.com', 'api.twilio.com'];
          const url = new URL(userUrl);
          if (!ALLOWED_HOSTS.includes(url.hostname)) throw new Error('Host not allowed');
          fetch(userUrl);
        `,
      },
      {
        label: 'FP: fetch with config variable (non-user-input name)',
        hypothesis: 'Variable name "config" has no URL substring → skip',
        expected: 'silent',
        code: `
          const config = getConfig();
          fetch(config);
        `,
      },
      {
        label: 'TP: http.request with user URL',
        hypothesis: 'http.request(userUrl) — direct SSRF via Node http module',
        expected: 'fire',
        code: `
          const http = require('http');
          function makeRequest(userUrl) {
            http.request(userUrl);
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-node-security',
    pluginEntry: 'packages/eslint-plugin-node-security/src/index.ts',
    fullRuleName: 'node-security/no-shell-injection',
    shortRuleName: 'no-shell-injection',
    cases: [
      {
        label: 'TP: exec with template literal expression',
        // eslint-disable-next-line no-template-curly-in-string -- string is a description of buggy code, not an interpolated template
        hypothesis: 'exec(`git clone ${userRepo}`) — template expression in command → fire',
        expected: 'fire',
        code: `
          const { exec } = require('child_process');
          function cloneRepo(userRepo) {
            exec(\`git clone \${userRepo}\`);
          }
        `,
      },
      {
        label: 'TP: execSync with string concatenation',
        hypothesis: 'execSync("rm -rf " + path) — concat in command → fire',
        expected: 'fire',
        code: `
          const { execSync } = require('child_process');
          function cleanup(path) {
            execSync('rm -rf ' + path);
          }
        `,
      },
      {
        label: 'FP: exec with literal string',
        hypothesis: 'exec("ls -la") — literal command, no injection surface',
        expected: 'silent',
        code: `
          const { exec } = require('child_process');
          exec('ls -la /tmp');
        `,
      },
      {
        label: 'FP: spawn with args array',
        hypothesis: 'spawn("git", [userRepo]) — args array is the safe parameterized form',
        expected: 'silent',
        code: `
          const { spawn } = require('child_process');
          function cloneRepo(userRepo) {
            spawn('git', ['clone', userRepo]);
          }
        `,
      },
      {
        label: 'FP: exec with plain variable — indirect, no visible concat',
        hypothesis: 'exec(command) — indirect variable reference, data-flow out of scope',
        expected: 'silent',
        code: `
          const { exec } = require('child_process');
          const command = buildSafeCommand(input);
          exec(command);
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-jwt',
    pluginEntry: 'packages/eslint-plugin-jwt/src/index.ts',
    fullRuleName: 'jwt/no-algorithm-none',
    shortRuleName: 'no-algorithm-none',
    cases: [
      {
        label: 'TP: jwt.verify with algorithms: ["none"]',
        hypothesis: 'Critical — accepts unsigned tokens',
        expected: 'fire',
        code: `
          const jwt = require('jsonwebtoken');
          function verify(token) {
            return jwt.verify(token, secret, { algorithms: ['none'] });
          }
        `,
      },
      {
        label: 'FP: jwt.verify with algorithms: ["HS256"]',
        hypothesis: 'Explicit good algorithm',
        expected: 'silent',
        code: `
          const jwt = require('jsonwebtoken');
          function verify(token) {
            return jwt.verify(token, secret, { algorithms: ['HS256'] });
          }
        `,
      },
      {
        label: 'FN: jwt.decode with no verification at all',
        hypothesis: 'Same outcome as algorithm: none — token bypasses signature',
        expected: 'fire',
        code: `
          const jwt = require('jsonwebtoken');
          function getUser(token) {
            const decoded = jwt.decode(token);
            return decoded.userId;
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-jwt',
    pluginEntry: 'packages/eslint-plugin-jwt/src/index.ts',
    fullRuleName: 'jwt/no-hardcoded-secret',
    shortRuleName: 'no-hardcoded-secret',
    cases: [
      {
        label: 'TP: jwt.sign with literal secret',
        hypothesis: 'Hardcoded secret',
        expected: 'fire',
        code: `
          const jwt = require('jsonwebtoken');
          jwt.sign({ id: 1 }, 'super-secret-key-12345', { expiresIn: '1h' });
        `,
      },
      {
        label: 'FP: jwt.sign with process.env',
        hypothesis: 'Env-sourced secret',
        expected: 'silent',
        code: `
          const jwt = require('jsonwebtoken');
          jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
        `,
      },
      {
        label: 'FN: secret stored in const then used',
        hypothesis: 'Indirection through a variable should still be flagged',
        expected: 'fire',
        code: `
          const jwt = require('jsonwebtoken');
          const SECRET = 'super-secret-key-12345';
          jwt.sign({ id: 1 }, SECRET, { expiresIn: '1h' });
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-browser-security',
    pluginEntry: 'packages/eslint-plugin-browser-security/src/index.ts',
    fullRuleName: 'browser-security/no-eval',
    shortRuleName: 'no-eval',
    cases: [
      {
        label: 'TP: direct eval call',
        hypothesis: 'Classic XSS sink',
        expected: 'fire',
        code: `function run(code) { eval(code); }`,
      },
      {
        label: 'TP: indirect eval via window["eval"]',
        hypothesis: 'Common bypass',
        expected: 'fire',
        code: `function run(code) { window['eval'](code); }`,
      },
      {
        label: 'FN: eval via Function constructor',
        hypothesis: 'new Function(code) is equivalent to eval but bypasses name match',
        expected: 'fire',
        code: `
          function run(code) {
            const fn = new Function(code);
            return fn();
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-browser-security',
    pluginEntry: 'packages/eslint-plugin-browser-security/src/index.ts',
    fullRuleName: 'browser-security/no-innerhtml',
    shortRuleName: 'no-innerhtml',
    cases: [
      {
        label: 'TP: el.innerHTML = userInput',
        hypothesis: 'Direct DOM XSS',
        expected: 'fire',
        code: `
          function render(el, userInput) {
            el.innerHTML = userInput;
          }
        `,
      },
      {
        label: 'FP: el.innerHTML = literal string',
        hypothesis: 'Static content has no taint source',
        expected: 'silent',
        code: `
          function clear(el) {
            el.innerHTML = '<p>Loading...</p>';
          }
        `,
      },
      {
        label: 'FN: insertAdjacentHTML with user input',
        hypothesis: 'Same XSS class, different sink',
        expected: 'fire',
        code: `
          function render(el, userInput) {
            el.insertAdjacentHTML('beforeend', userInput);
          }
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-express-security',
    pluginEntry: 'packages/eslint-plugin-express-security/src/index.ts',
    fullRuleName: 'express-security/no-user-controlled-redirect',
    shortRuleName: 'no-user-controlled-redirect',
    cases: [
      {
        label: 'TP: res.redirect(req.query.next) — direct user-controlled redirect',
        hypothesis: 'Direct req.query access as redirect target → open redirect, should fire',
        expected: 'fire',
        code: `
          app.get('/login', (req, res) => {
            res.redirect(req.query.next);
          });
        `,
      },
      {
        label: 'TP: res.redirect(req.body.url) — POST body redirect',
        hypothesis: 'req.body access → user-controlled, should fire',
        expected: 'fire',
        code: `
          app.post('/go', (req, res) => {
            res.redirect(req.body.url);
          });
        `,
      },
      {
        label: 'FP: res.redirect("/dashboard") — literal target',
        hypothesis: 'String literal redirect target is always safe',
        expected: 'silent',
        code: `
          app.get('/home', (req, res) => {
            res.redirect('/dashboard');
          });
        `,
      },
      {
        label: 'FP: res.redirect(next) — variable (indirect, not direct req access)',
        hypothesis: 'Indirect variable not detected — conservative to avoid FPs',
        expected: 'silent',
        code: `
          app.get('/go', (req, res) => {
            const next = req.query.next;
            res.redirect(next);
          });
        `,
      },
      {
        label: 'FP: res.redirect(validated) — after allowlist check',
        hypothesis: 'Validated redirect — rule does not fire (indirect assignment)',
        expected: 'silent',
        code: `
          const ALLOWED = ['/home', '/dashboard', '/profile'];
          app.get('/go', (req, res) => {
            const target = req.query.next;
            if (!ALLOWED.includes(target)) return res.redirect('/home');
            res.redirect(target);
          });
        `,
      },
    ],
  },
  {
    pluginName: 'eslint-plugin-pg',
    pluginEntry: 'packages/eslint-plugin-pg/src/index.ts',
    fullRuleName: 'pg/no-unsafe-query',
    shortRuleName: 'no-unsafe-query',
    cases: [
      {
        label: 'TP: SQL string concatenation',
        hypothesis: 'SQL injection',
        expected: 'fire',
        code: `
          const { Pool } = require('pg');
          const pool = new Pool();
          async function getUser(id) {
            return pool.query('SELECT * FROM users WHERE id = ' + id);
          }
        `,
      },
      {
        label: 'FP: parameterized query',
        hypothesis: 'Safe pattern; audit verified',
        expected: 'silent',
        code: `
          const { Pool } = require('pg');
          const pool = new Pool();
          async function getUser(id) {
            return pool.query('SELECT * FROM users WHERE id = $1', [id]);
          }
        `,
      },
      {
        label: 'FN: SQL via template literal interpolation',
        hypothesis: 'Same as concat but with template literal — same vuln',
        expected: 'fire',
        code: `
          const { Pool } = require('pg');
          const pool = new Pool();
          async function getUser(id) {
            return pool.query(\`SELECT * FROM users WHERE id = \${id}\`);
          }
        `,
      },
    ],
  },
  // ── MongoDB Security (zero OSS corpus activation — verifying rules work) ──
  {
    pluginName: 'eslint-plugin-mongodb-security',
    pluginEntry: 'packages/eslint-plugin-mongodb-security/src/index.ts',
    fullRuleName: 'mongodb-security/no-unsafe-query',
    shortRuleName: 'no-unsafe-query',
    cases: [
      {
        label: 'TP: $where with template literal — NoSQL injection',
        hypothesis: '$where with dynamic content fires CWE-943',
        expected: 'fire',
        code: `
          db.collection('users').find({ $where: \`this.age > \${minAge}\` });
        `,
      },
      {
        label: 'TP: $expr with user input',
        hypothesis: '$expr with dynamic value fires',
        expected: 'fire',
        code: `
          db.collection('orders').find({ $expr: { $gt: [userValue, '$total'] } });
        `,
      },
      {
        label: 'FP: static $where with literal string',
        hypothesis: 'Literal $where with no interpolation is safe',
        expected: 'silent',
        code: `
          db.collection('users').find({ $where: 'this.age > 18' });
        `,
      },
    ],
  },
  // ── secure-coding/no-redos extra FP cases (anchored/bounded patterns) ────
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/no-redos-vulnerable-regex',
    shortRuleName: 'no-redos-vulnerable-regex',
    cases: [
      {
        label: 'TP: catastrophic backtracking — (a+)+ pattern',
        hypothesis: 'Nested unbounded quantifier is always a ReDoS risk',
        expected: 'fire',
        code: `const re = /(a+)+$/;`,
      },
      {
        label: 'TP: exponential backtracking — (a|aa)+ pattern',
        hypothesis: 'Alternation with overlap + unbounded quantifier',
        expected: 'fire',
        code: `const re = /(a|aa)+b/;`,
      },
      {
        label: 'FP: simple anchored pattern — safe',
        hypothesis: 'Anchored regex with no unbounded quantifier is safe',
        expected: 'silent',
        code: `const re = /^[a-z]{1,20}$/;`,
      },
      {
        label: 'FP: email regex without backtracking risk',
        hypothesis: 'Character class repetition without nesting is safe',
        expected: 'silent',
        code: `const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.][a-zA-Z]{2,}$/;`,
      },
    ],
  },
  // ── reliability/no-silent-errors (just promoted to error) ────────────────
  {
    pluginName: 'eslint-plugin-reliability',
    pluginEntry: 'packages/eslint-plugin-reliability/src/index.ts',
    fullRuleName: 'reliability/no-silent-errors',
    shortRuleName: 'no-silent-errors',
    cases: [
      {
        label: 'TP: empty catch block — swallows all errors',
        hypothesis: 'catch(e) {} hides bugs in production',
        expected: 'fire',
        code: `
          try {
            riskyOperation();
          } catch (e) {}
        `,
      },
      {
        label: 'TP: catch with only comment — still silent',
        hypothesis: 'Commenting out error handling is still wrong',
        expected: 'fire',
        code: `
          try {
            parse(data);
          } catch (e) {
            // TODO: handle this
          }
        `,
      },
      {
        label: 'FP: catch with actual handler',
        hypothesis: 'Catch that logs and rethrows is correct',
        expected: 'silent',
        code: `
          try {
            riskyOperation();
          } catch (e) {
            logger.error(e);
            throw e;
          }
        `,
      },
    ],
  },
  // ── secure-coding/no-template-injection (new rule, 2026-06) ──────────────
  {
    pluginName: 'eslint-plugin-secure-coding',
    pluginEntry: 'packages/eslint-plugin-secure-coding/src/index.ts',
    fullRuleName: 'secure-coding/no-template-injection',
    shortRuleName: 'no-template-injection',
    cases: [
      {
        label: 'TP: Handlebars.compile(variable) — dynamic template',
        hypothesis: 'User-controlled template string = code injection risk, should fire',
        expected: 'fire',
        code: `Handlebars.compile(userTemplate)`,
      },
      {
        label: 'TP: ejs.render(req.body.template, data) — request body template',
        hypothesis: 'Request body as template argument = server-side template injection',
        expected: 'fire',
        code: `ejs.render(req.body.template, data)`,
      },
      {
        label: 'TP: pug.compile(template literal with expression)',
        hypothesis: 'Template literal with expression = injection surface',
        expected: 'fire',
        code: `pug.compile(\`h1 \${userTitle}\`)`,
      },
      {
        label: 'FP: Handlebars.compile("<h1>{{title}}</h1>") — string literal',
        hypothesis: 'Literal string template has no injection surface, should be silent',
        expected: 'silent',
        code: `Handlebars.compile('<h1>{{title}}</h1>')`,
      },
      {
        label: 'FP: ejs.render literal template with data',
        hypothesis: 'Literal template with dynamic data in second arg is safe pattern',
        expected: 'silent',
        code: `ejs.render('<p><%= name %></p>', { name: user.name })`,
      },
      {
        label: 'FP: Template literal without expressions',
        hypothesis: 'Template literal with no expressions is equivalent to a string literal',
        expected: 'silent',
        code: 'Handlebars.compile(`<h1>Static template</h1>`)',
      },
    ],
  },
  // ── jwt/require-expiration suggestion (verify suggestion is emitted) ──────
  {
    pluginName: 'eslint-plugin-jwt',
    pluginEntry: 'packages/eslint-plugin-jwt/src/index.ts',
    fullRuleName: 'jwt/require-expiration',
    shortRuleName: 'require-expiration',
    cases: [
      {
        label: 'TP: jwt.sign without expiresIn',
        hypothesis: 'Missing expiresIn creates eternal token, should fire',
        expected: 'fire',
        code: `jwt.sign({ userId: 123 }, secret)`,
      },
      {
        label: 'FP: jwt.sign with expiresIn in options',
        hypothesis: 'expiresIn present = safe, should be silent',
        expected: 'silent',
        code: `jwt.sign({ userId: 123 }, secret, { expiresIn: '1h' })`,
      },
      {
        label: 'FP: jwt.sign with exp claim in payload',
        hypothesis: 'exp in payload provides expiration, should be silent',
        expected: 'silent',
        code: `jwt.sign({ userId: 123, exp: Math.floor(Date.now() / 1000) + 3600 }, secret)`,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// HARNESS
// ---------------------------------------------------------------------------

interface CaseResult {
  rule: string;
  label: string;
  hypothesis: string;
  expected: 'fire' | 'silent';
  actual: 'fire' | 'silent' | 'error';
  match: boolean;
  details?: string;
}

const linter = new Linter();
const pluginCache = new Map<string, unknown>();

async function loadPlugin(entry: string): Promise<unknown> {
  if (pluginCache.has(entry)) return pluginCache.get(entry);
  const abs = path.join(ROOT, entry);
  const mod = await import(abs);
  const plugin = (mod.default ?? mod) as { rules?: Record<string, unknown> };
  pluginCache.set(entry, plugin);
  return plugin;
}

async function runCase(spec: RuleSpec, c: Case): Promise<CaseResult> {
  try {
    const plugin = (await loadPlugin(spec.pluginEntry)) as {
      rules?: Record<string, Linter.RuleEntry>;
    };
    const rule = plugin.rules?.[spec.shortRuleName];
    if (!rule) {
      return {
        rule: spec.fullRuleName,
        label: c.label,
        hypothesis: c.hypothesis,
        expected: c.expected,
        actual: 'error',
        match: false,
        details: `Rule not found in plugin: ${spec.shortRuleName}`,
      };
    }
    const messages = linter.verify(
      c.code,
      {
        languageOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          parserOptions: { ecmaFeatures: { jsx: false } },
        },
        plugins: { [spec.fullRuleName.split('/')[0]]: { rules: { [spec.shortRuleName]: rule } } } as never,
        rules: { [spec.fullRuleName]: 'error' } as never,
      } as never,
    );
    const fired = messages.length > 0;
    const actual: 'fire' | 'silent' = fired ? 'fire' : 'silent';
    return {
      rule: spec.fullRuleName,
      label: c.label,
      hypothesis: c.hypothesis,
      expected: c.expected,
      actual,
      match: actual === c.expected,
      details: fired
        ? messages.map((m) => `${m.line}:${m.column} ${m.messageId ?? ''} ${m.message?.slice(0, 120) ?? ''}`).join(' | ')
        : undefined,
    };
  } catch (err) {
    return {
      rule: spec.fullRuleName,
      label: c.label,
      hypothesis: c.hypothesis,
      expected: c.expected,
      actual: 'error',
      match: false,
      details: (err as Error).message?.slice(0, 200),
    };
  }
}

async function main() {
  const results: CaseResult[] = [];
  for (const spec of CASES) {
    if (RULE_FILTER && !spec.fullRuleName.includes(RULE_FILTER)) continue;
    for (const c of spec.cases) {
      results.push(await runCase(spec, c));
    }
  }

  const totals = {
    cases: results.length,
    matched: results.filter((r) => r.match).length,
    disagreement: results.filter((r) => !r.match && r.actual !== 'error').length,
    errors: results.filter((r) => r.actual === 'error').length,
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), totals, results }, null, 2),
  );

  console.log('\nILB Stress Test\n');
  for (const r of results) {
    const icon = r.match ? '✅' : r.actual === 'error' ? '⚠️ ' : '❌';
    const tag =
      r.expected === 'fire' && r.actual === 'silent'
        ? 'FN'
        : r.expected === 'silent' && r.actual === 'fire'
          ? 'FP'
          : '';
    console.log(`${icon} ${r.rule.padEnd(48)} ${tag.padEnd(3)} ${r.label}`);
    if (!r.match && r.details) console.log(`     → ${r.details}`);
  }
  console.log(
    `\n${totals.cases} cases · ${totals.matched} matched · ${totals.disagreement} disagreement · ${totals.errors} error`,
  );
  console.log(`\n✅ ${path.relative(ROOT, REPORT_PATH)}`);
  process.exit(totals.disagreement > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
