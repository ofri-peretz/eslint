---
'eslint-plugin-lambda-security': patch
---

fix(lambda-security): rule fixes found by the Quint fidelity models.

- The Lambda gate also recognises `aws-cdk-lib` / `@aws-cdk/*` and `@serverless/*` (a `serverless.ts` config).
- `no-env-logging` reads the logged value off the AST: `{ env: process.env }`, `{ ...process.env }` and `console['log']` are reported; `Object.keys(process.env)` and a bare `${process.env}` (prints "[object Object]") are not.
- `no-error-swallowing` reports `return callback(null, ok)` / `return next()` in a catch.
- `no-exposed-debug-endpoints` matches by path segment (`/testimonials` is not `/test`) and reads sub-paths on `rawPath`, `routeKey`, `requestContext.http.path`, subscripts, destructuring, `switch` cases and slash-less Serverless paths.
- `no-exposed-error-details` checks every response object (in a variable, through `callback`), reports `__dirname` / `__filename`, and only the caught error's `stack` — `JSON.stringify(order)` and `deployment.stack` are no longer reported.
- `no-hardcoded-credentials-sdk` checks SDK v2 (`new AWS.S3`, `AWS.config.update`, `new AWS.Credentials`) and renamed / namespace v3 imports, and judges top-level keys like nested ones.
- `no-missing-authorization-check` no longer takes `body.subject` or `pathParameters.userId` for identity, and honours `handlerPatterns`.
- `no-overly-permissive-iam-policy` skips `Deny` statements and reports `Principal: { AWS: '*' }`.
- `no-permissive-cors-middy` recognises `@middy/http-cors` by import under any name (and not a local `cors`), and quoted / template / computed `origin`.
- `no-permissive-cors-response` checks a response in any variable or `callback`, `multiValueHeaders`, and a template `'*'`.
- `no-secrets-in-env` checks CDK / Serverless `environment` and `Environment.Variables`, and allows ARN / SSM-path references.
- `no-unbounded-batch-processing` counts only a bound on the batch itself, honours `maxBatchSize`, and reads a destructured `Records`.
- `no-unvalidated-event-body` treats a required SDK like an imported one and a renamed `@middy/validator`, wherever it is applied.
- `no-user-controlled-requests` follows taint through `JSON.parse(event.body)` and destructuring.
- `require-timeout-handling` counts `axios.get(…)` as an external call and `AbortSignal.timeout(ms)` as timeout handling.
