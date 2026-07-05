/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage-completion tests.
 *
 * Layer 1: RuleTester fixtures through the real parser for every branch a
 * real AST can produce (FP/FN edges, options, fix output).
 * Layer 2: raw listener invocation with synthetic AST objects for branches
 * no parser can produce (missing parents, ESLint-9 crash regressions).
 *
 * Layer 2 for `no-unvalidated-event-body` uses a minimal LOCAL mock-context
 * helper instead of `createWithMockContext` from @interlace/eslint-devkit,
 * because that rule reads `context.sourceCode.ast.body` inside `create()`
 * and the devkit mock does not stub `sourceCode.ast`.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';

import indexDefault, { plugin as indexPlugin } from './index';
import oxlintPlugin from './oxlint';

import { noEnvLogging } from './rules/no-env-logging';
import { noErrorSwallowing } from './rules/no-error-swallowing';
import { noExposedDebugEndpoints } from './rules/no-exposed-debug-endpoints';
import { noExposedErrorDetails } from './rules/no-exposed-error-details';
import { noHardcodedCredentialsSdk } from './rules/no-hardcoded-credentials-sdk';
import { noMissingAuthorizationCheck } from './rules/no-missing-authorization-check';
import { noOverlyPermissiveIamPolicy } from './rules/no-overly-permissive-iam-policy';
import { noPermissiveCorsMidly as noPermissiveCorsMiddy } from './rules/no-permissive-cors-middy';
import { noPermissiveCorsResponse } from './rules/no-permissive-cors-response';
import { noSecretsInEnv } from './rules/no-secrets-in-env';
import { noUnboundedBatchProcessing } from './rules/no-unbounded-batch-processing';
import { noUnvalidatedEventBody } from './rules/no-unvalidated-event-body';
import { noUserControlledRequests } from './rules/no-user-controlled-requests';
import { requireTimeoutHandling } from './rules/require-timeout-handling';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

// ---------------------------------------------------------------------------
// Module entry points
// ---------------------------------------------------------------------------

describe('module entry points', () => {
  it('oxlint shim re-exports the exact plugin object from the index barrel', () => {
    expect(oxlintPlugin).toBe(indexPlugin);
    expect(oxlintPlugin).toBe(indexDefault);
    expect(Object.keys(oxlintPlugin.rules ?? {})).toContain('no-env-logging');
  });
});

// ---------------------------------------------------------------------------
// Layer 1 — no-env-logging
// ---------------------------------------------------------------------------

ruleTester.run('no-env-logging (coverage)', noEnvLogging, {
  valid: [
    // Computed logging property → prop is a Literal, not an Identifier
    { code: `console['warn'](process.env.SECRET_KEY);` },
    // Identifier object whose name is neither console nor log-like
    { code: `metrics.error(process.env.SECRET_KEY);` },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-error-swallowing
// ---------------------------------------------------------------------------

ruleTester.run('no-error-swallowing (coverage)', noErrorSwallowing, {
  valid: [
    // Non-empty catch with an "intentional" comment (allowWithComment=true default)
    {
      code: `
        function f() {
          try { risky(); } catch (err) { /* intentionally swallowed */ cleanup(); }
        }
      `,
    },
  ],
  invalid: [
    // Catch whose only return is a bare "return;" — returnStmt.argument is null
    {
      code: `
        function f() {
          try { risky(); } catch (err) { cleanup(); return; }
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-exposed-debug-endpoints
// ---------------------------------------------------------------------------

ruleTester.run('no-exposed-debug-endpoints (coverage)', noExposedDebugEndpoints, {
  valid: [
    // ignoreFiles option matches the filename → rule short-circuits to {}
    {
      code: `const route = '/debug';`,
      options: [{ ignoreFiles: ['debug-routes'] }],
      filename: 'src/debug-routes.ts',
    },
    // Property listener: path value that is NOT a debug path
    { code: `const config = { http: { path: '/users' } };` },
    // Literal includes a debug path but comparison target is a plain identifier
    { code: `const x = pathName === '/debug/x';` },
    // MemberExpression object is not event/evt
    { code: `const x = req.path === '/debug/x';` },
    // Computed event access → property is a Literal, not Identifier
    { code: `const x = event['path'] === '/debug/x';` },
    // Event property outside the checked list
    { code: `const x = event.url === '/debug/x';` },
    // Computed identifier property with non-checked name
    { code: `const x = event[prop] === '/debug/x';` },
  ],
  invalid: [
    // Debug literal on the LEFT of the comparison (checkNode side === node.left)
    {
      code: `if ('/debug' === event.path) { enableDebug(); }`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Exact debug literal compared against a plain identifier → Literal listener reports
    {
      code: `const x = '/debug' == y;`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Exact debug literal vs member expression on non-event object → still reported
    {
      code: `const x = req.path === '/debug';`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Exact debug literal vs member expression whose object is a call → still reported
    {
      code: `const x = getEvent().path === '/debug';`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-exposed-error-details
// ---------------------------------------------------------------------------

ruleTester.run('no-exposed-error-details (coverage)', noExposedErrorDetails, {
  valid: [
    // Computed sensitive access → property is a Literal (documented FN)
    {
      code: `
        function h(err) {
          return { statusCode: 500, body: err['stack'] };
        }
      `,
    },
    // Sensitive member whose parent is a BinaryExpression, not Property/Call (documented FN)
    {
      code: `
        function h(err) {
          return { statusCode: 500, body: err.stack + '' };
        }
      `,
    },
    // CallExpression in response that is NOT JSON.stringify
    {
      code: `
        function h(err) {
          return { statusCode: 500, body: formatBody(err) };
        }
      `,
    },
    // JSON.stringify of a non-error-looking identifier
    {
      code: `
        function h() {
          return { statusCode: 500, body: JSON.stringify(payload) };
        }
      `,
    },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-hardcoded-credentials-sdk
// ---------------------------------------------------------------------------

ruleTester.run('no-hardcoded-credentials-sdk (coverage)', noHardcodedCredentialsSdk, {
  valid: [
    // NewExpression callee is not an Identifier
    { code: `const c = new (getClientCtor())({ credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' } });` },
    // Spread inside config object
    { code: `const c = new S3Client({ ...baseConfig });` },
    // Top-level credential property with a non-string literal
    { code: `const c = new S3Client({ accessKeyId: 12345 });` },
    // Top-level credential property with a non-literal value
    { code: `const c = new S3Client({ secretAccessKey: someVar });` },
    // Spread inside credentials object
    { code: `const c = new S3Client({ credentials: { ...creds } });` },
    // Non-credential property inside credentials object
    { code: `const c = new S3Client({ credentials: { region: 'us-east-1' } });` },
    // secretAccessKey shorter than 20 chars → not flagged
    { code: `const c = new S3Client({ credentials: { secretAccessKey: 'short' } });` },
    // sessionToken shorter than 15 chars → not flagged
    { code: `const c = new S3Client({ credentials: { sessionToken: 'abc' } });` },
    // Credential property that is none of the three length-checked keys
    // inside the nested credentials object (documented FN for aws* aliases)
    { code: `const c = new S3Client({ credentials: { awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE' } });` },
    // No constructor arguments
    { code: `const c = new S3Client();` },
    // First argument is not an object literal
    { code: `const c = new S3Client(config);` },
    // Variable name without "credential"
    { code: `const settings = { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' };` },
    // credential-named variable with no initializer
    { code: `let userCredentials;` },
    // credential-named variable with non-object initializer
    { code: `const credentialsFromVault = getCreds();` },
    // Destructured id → not an Identifier
    { code: `const { credentials } = config;` },
  ],
  invalid: [
    // *Client name matched via the AWS-prefix regex (not the known-client set)
    {
      code: `const c = new BedrockClient({ credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' } });`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Top-level (v2-style) credential property with hardcoded string
    {
      code: `const c = new S3Client({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE' });`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // credential-named variable holding a credentials object literal
    {
      code: `const myCredentials = { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-missing-authorization-check
// ---------------------------------------------------------------------------

ruleTester.run('no-missing-authorization-check (coverage)', noMissingAuthorizationCheck, {
  valid: [
    // Computed callee property (not an Identifier) is not a tracked sensitive op;
    // non-object return exercises the ReturnStatement fallthrough
    {
      code: `
        export const handler = async (event) => {
          await registry['create'](payload);
          return 1;
        };
      `,
    },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-overly-permissive-iam-policy
// ---------------------------------------------------------------------------

ruleTester.run('no-overly-permissive-iam-policy (coverage)', noOverlyPermissiveIamPolicy, {
  valid: [],
  invalid: [
    // Array with non-literal and non-string elements around the wildcard
    {
      code: `const policy = { Effect: 'Allow', Action: [dynamicAction, 42, '*'], Resource: 'arn:aws:s3:::bucket/key' };`,
      errors: [{ messageId: 'permissivePolicy' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-permissive-cors-middy
// ---------------------------------------------------------------------------

ruleTester.run('no-permissive-cors-middy (coverage)', noPermissiveCorsMiddy, {
  valid: [
    // Spread in options object
    { code: `httpCors({ ...defaults });` },
    // String-literal key is skipped (documented FN)
    { code: `httpCors({ 'origin': '*' });` },
    // Non-origin option key
    { code: `httpCors({ credentials: true });` },
    // Non-object argument
    { code: `httpCors(corsOptions);` },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-permissive-cors-response
// ---------------------------------------------------------------------------

ruleTester.run('no-permissive-cors-response (coverage)', noPermissiveCorsResponse, {
  valid: [
    // Spread inside headers object
    { code: `function h() { return { statusCode: 200, headers: { ...baseHeaders } }; }` },
    // Numeric header key → neither Identifier nor string Literal
    { code: `function h() { return { body: 'ok', headers: { 1: 'x' } }; }` },
    // response variable initialized from a call, not an object literal
    { code: `const response = buildResponse();` },
    // response variable with no initializer
    { code: `let response;` },
    // response-named object literal that is NOT a Lambda response shape
    { code: `const response = { headers: { 'Access-Control-Allow-Origin': '*' } };` },
  ],
  invalid: [
    // Identifier header key (Vary) + string-literal response key + wildcard → autofixed
    {
      code: `function h() { return { statusCode: 200, 'x-extra': 1, headers: { Vary: 'Origin', 'Access-Control-Allow-Origin': '*' } }; }`,
      output: `function h() { return { statusCode: 200, 'x-extra': 1, headers: { Vary: 'Origin', 'Access-Control-Allow-Origin': "https://your-domain.com" } }; }`,
      errors: [{ messageId: 'permissiveCors' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-secrets-in-env
// ---------------------------------------------------------------------------

ruleTester.run('no-secrets-in-env (coverage)', noSecretsInEnv, {
  valid: [
    // Assignment whose object chain is not process.env
    { code: `config.env.API_KEY = 'super-secret-value';` },
    { code: `process.argv.SECRET_KEY = 'super-secret-value';` },
    // Computed env key that is neither Identifier nor string Literal
    { code: `process.env[computeKey()] = 'super-secret-value';` },
    // Secret name but non-hardcoded value
    { code: `process.env.DB_PASSWORD = loadFromVault();` },
    // Numeric property key in a config object
    { code: `const settings = { 42: 'some-longer-value' };` },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-unbounded-batch-processing
// ---------------------------------------------------------------------------

ruleTester.run('no-unbounded-batch-processing (coverage)', noUnboundedBatchProcessing, {
  valid: [],
  invalid: [
    // .length on a computed member, non-size binary comparisons — none of them
    // count as a batch-size check, so the unbounded loop still reports
    {
      code: `
        export const handler = async (event) => {
          const meta = tags['prod'].length;
          if (mode === strictMode) { setup(); }
          if (retries < 5) { warmup(); }
          for (const record of event.Records) {
            await processRecord(record);
          }
        };
      `,
      errors: [{ messageId: 'unboundedBatch' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-unvalidated-event-body
// ---------------------------------------------------------------------------

ruleTester.run('no-unvalidated-event-body (coverage)', noUnvalidatedEventBody, {
  valid: [
    // Assignment to a plain identifier is not the exports.handler convention
    { code: `h = function (e) { const x = e.body; };` },
    // Computed exports key → left.property is a Literal
    { code: `exports['handler'] = function (e) { const x = e.body; };` },
    // Exported under a non-handler name
    { code: `exports.notHandler = function (e) { const x = e.body; };` },
    // Destructured first parameter → not an Identifier
    { code: `export const handler = ({ body }, context) => body;` },
    // Express signatures are explicitly rejected
    { code: `const middleware = (req, res) => { const x = req.body; };` },
    { code: `const middleware2 = (request, response) => { const y = request.body; };` },
    // .use() argument whose callee is a MemberExpression (not bare validator())
    { code: `pipeline.use(mod.validator(opts));` },
  ],
  invalid: [
    // FunctionDeclaration named handler with short event param
    {
      code: `function handler(e) { const x = e.body; }`,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // exports.handler assignment convention
    {
      code: `exports.handler = function (e) { const x = e.body; };`,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // (event, callback) sibling — classic AWS signature variant
    {
      code: `const handler = (event, callback) => { const x = event.body; };`,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // Single-arg event + @aws-sdk import marks the file as Lambda
    {
      code: `
        import { S3Client } from '@aws-sdk/client-s3';
        const processEvent = (event) => { const x = event.body; };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 1 — no-user-controlled-requests
// ---------------------------------------------------------------------------

ruleTester.run('no-user-controlled-requests (coverage)', noUserControlledRequests, {
  valid: [
    // Template literal whose expressions are untainted
    { code: `const handler = async (event) => { const id = 5; await fetch(\`https://api.example.com/\${id}\`); };` },
    // Binary concatenation with no tainted operand
    { code: `const handler = async (event) => { await fetch('https://a.example.com' + '/b'); };` },
    // No arguments at all
    { code: `const handler = async (event) => { await fetch(); };` },
    // Config object with spread and non-URL keys
    { code: `const handler = async (event) => { await axios({ method: 'GET', ...rest }); };` },
    // Config object with a safe literal URL
    { code: `const handler = async (event) => { await axios({ url: 'https://safe.example.com' }); };` },
    // Destructured parameter → not an Identifier
    { code: `function destructured({ a }) { return a; }` },
    // Assignment to a member expression is not identifier tainting
    { code: `const handler = async (event) => { const store = {}; store.url = event.rawPath; };` },
    // Assignment from an untainted source
    { code: `const handler = async (event) => { let u; u = 'https://static.example.com'; await fetch(u); };` },
  ],
  invalid: [
    // Computed (non-Identifier) leaf property → source rendered as [...]
    {
      code: `const handler = async (event) => { await fetch(event.queryStringParameters['target']); };`,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
    // Tainted LEFT operand of a concatenation
    {
      code: `const handler = async (event) => { await fetch(event.rawPath + '/x'); };`,
      errors: [{ messageId: 'ssrfVulnerability' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 1 — require-timeout-handling
// ---------------------------------------------------------------------------

ruleTester.run('require-timeout-handling (coverage)', requireTimeoutHandling, {
  valid: [
    // Member/new expressions OUTSIDE any handler hit the early-return guards
    {
      code: `
        const agent = new HttpAgent();
        const region = settings.region;
        export const handler = async (event, context) => {
          if (context.getRemainingTimeInMillis() < 5000) { return; }
          await fetch('https://api.example.com');
        };
      `,
    },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// Layer 2 — synthetic AST listener tests for no-unvalidated-event-body
// ---------------------------------------------------------------------------

type Listener = (node: unknown) => void;

/**
 * Minimal LOCAL mock-context helper (see file header for why devkit's
 * createWithMockContext is not usable for this rule).
 */
function createUnvalidatedEventBodyListeners() {
  const reports: Array<{ messageId: string; data?: Record<string, unknown> }> = [];
  const sourceCode = {
    text: '',
    getText: () => '',
    ast: { body: [] },
  };
  const context = {
    id: 'mock-rule',
    filename: 'handler.ts',
    physicalFilename: 'handler.ts',
    cwd: '/',
    options: [],
    settings: {},
    parserOptions: {},
    languageOptions: {},
    sourceCode,
    getFilename: () => 'handler.ts',
    getSourceCode: () => sourceCode,
    report: (descriptor: { messageId: string; data?: Record<string, unknown> }) => {
      reports.push(descriptor);
    },
  };
  const listeners = (
    noUnvalidatedEventBody as unknown as {
      create(ctx: unknown): Record<string, Listener>;
    }
  ).create(context);
  return { listeners, reports };
}

const FN_LISTENER_KEY =
  'ArrowFunctionExpression, FunctionExpression, FunctionDeclaration';

describe('no-unvalidated-event-body — synthetic AST (Layer 2)', () => {
  it('CallExpression listener ignores a synthetic node that is not a CallExpression', () => {
    const { listeners, reports } = createUnvalidatedEventBodyListeners();
    // isValidationCall must take the `node.type !== CallExpression` branch
    listeners.CallExpression({
      type: 'Identifier',
      callee: { type: 'Identifier', name: 'x' },
      arguments: [],
      parent: null,
    });
    expect(reports).toEqual([]);
  });

  it('isExportedAsHandler returns false for a function node with no parent (ESLint-9 crash guard)', () => {
    const { listeners, reports } = createUnvalidatedEventBodyListeners();
    // FunctionExpression named nothing, param `req`, parent missing entirely:
    // path 3 must bail out at `if (!parent) return false` without crashing.
    listeners[FN_LISTENER_KEY]({
      type: 'FunctionExpression',
      params: [{ type: 'Identifier', name: 'req' }],
      parent: undefined,
    });
    // `req` was NOT registered as an event parameter → no report on req.body
    listeners.MemberExpression({
      type: 'MemberExpression',
      optional: false,
      object: { type: 'Identifier', name: 'req' },
      property: { type: 'Identifier', name: 'body' },
      parent: { type: 'ExpressionStatement' },
    });
    expect(reports).toEqual([]);
  });

  it('a direct ChainExpression parent suppresses the report; a plain parent reports', () => {
    const { listeners, reports } = createUnvalidatedEventBodyListeners();
    // Register `event` via the classic (event, context) signature.
    listeners[FN_LISTENER_KEY]({
      type: 'ArrowFunctionExpression',
      params: [
        { type: 'Identifier', name: 'event' },
        { type: 'Identifier', name: 'context' },
      ],
      parent: null,
    });

    const eventBody = (parent: unknown) => ({
      type: 'MemberExpression',
      optional: false,
      object: { type: 'Identifier', name: 'event' },
      property: { type: 'Identifier', name: 'body' },
      parent,
    });

    // Parser can never place event.body directly under ChainExpression without
    // node.optional being true first — synthetic-only branch.
    listeners.MemberExpression(eventBody({ type: 'ChainExpression' }));
    expect(reports).toEqual([]);

    // Control: identical node with a mundane parent DOES report.
    listeners.MemberExpression(eventBody({ type: 'ExpressionStatement' }));
    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('unvalidatedInput');
    expect(reports[0].data).toEqual({ property: 'event.body' });
  });
});
