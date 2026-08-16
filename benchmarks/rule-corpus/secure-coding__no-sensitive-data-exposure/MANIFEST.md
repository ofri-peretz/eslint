# Rule corpus - `secure-coding/no-sensitive-data-exposure` (CWE-532)

**The question this corpus exists to answer:** does the rule see the shapes real
Node services actually log with?

CWE-532 is exposure of RUNTIME data through a log record. The rule's evidence is
necessarily a name - there is no type information here that could tell a
credential from any other string - so the whole risk sits in two places:

1. **Which calls it treats as a sink.** A logger is `console`, or a bare
   `logger`, or a class field (`this.logger`), or a pino child bound to a local
   (`const log = rootLogger.child(...)`), or `req.log` from pino-http. Miss any
   of those and the rule is silent on most production code.
2. **Which argument shapes it reads.** A cast, a shorthand object property, an
   optional chain, a ternary branch, an alias - none of these change what
   reaches the log file, and every one of them was invisible.

`safe/` is built from the inverse: prose that NAMES a credential without
carrying one (three cases taken from the wild corpus - twilio-node, Shopify CLI,
passport), functions whose names merely contain "log", and metadata about a
secret rather than the secret.

## What the corpus proved

Nine defects. Eight fixed structurally, one documented as the rule's ceiling.

| # | shape | what happened | fix |
|---|---|---|---|
| 1 | `this.logger.debug(x)` / `app.logger.info(x)` / `req.log.info(x)` | receiver had to be a bare Identifier named `console` or `logger`, so every class-held and request-bound logger was silent | one property hop, exact membership on the property name |
| 2 | `const log = rootLogger.child({...}); log.info(x)` | `log` was not in the receiver set | added to the closed set |
| 3 | `payload.apiKey as string` | no `TSAsExpression` arm | `unwrapTypeSyntax` |
| 4 | `logger.error('rejected', { deliveryId, apiKey })` | no `ObjectExpression` arm at all - the entire structured-logging idiom | key names the field, `isStaticExpression` on the value decides whether anything runtime is written |
| 5 | `logger.info('record ' + customer.ssn)` | the `+` right arm only read `Identifier` | reads property accesses, and recurses through nested concatenation |
| 6 | `session?.accessToken` | `ChainExpression` wrapper | unwrapped |
| 7 | `flag ? '[redacted]' : user.password` | no `ConditionalExpression` arm | both branches |
| 8 | `const submitted = account.password; log(submitted)` | the alias names nothing | one binding hop, scope-resolved, single-write only |
| 9 | `throw new Error(`token: ${t}`)` | the `Error` path had drifted behind the logging path (Literal and `+` only) | one shared argument helper for both sinks |

Two false positives, both fixed:

- `logger.debug('token length', token.length)` - the object-name fallback fired
  through a property that cannot carry the value. `.length`, `.size`,
  `.byteLength` are language semantics, not vocabulary.
- `console.log('Reset your password: follow the link we emailed you')` and
  `throw new Error('api_key: required in production')` - the label-and-separator
  test cannot tell a value from a sentence. Every credential the rule is
  asserted to catch is ONE token after the separator; every false positive found
  here is a clause. The one-token test runs on the RAW text, because the
  camelCase normalization that makes `secretKey` match `secret key` shreds
  `token=eyJhbGciOiJIUzI1NiJ9` into `token=ey jhb gci`.

## The one fixture that is still missed, and why it stays

`vulnerable/13-innocuous-column-names.js` logs a real credential read from a
column called `pw`, into a variable called `row`. Nothing in it is spelled like
a credential, and the rule reports on names. This is the rule's ceiling, not a
bug with a fix in reach: closing it needs type information or interprocedural
taint, neither of which exists here. It is left in `vulnerable/` deliberately,
so the published recall figure carries the cost of that ceiling instead of
hiding it.

## A fixture in the rule's own test suite that asserted a defect as correct

```
ruleTester.run('valid - non-Identifier object with a log-like method name is not a logging call', …
  valid: [{ code: `app.logger.info('password: 123456');` }]
```

Written to cover the false branch of `object.type === 'Identifier'`, it pinned
defect #1 as intended behaviour. Flipped to `invalid`, with `this.logger` and
`req.log` alongside it.

## Score

| wave | TP | FP | FN | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| first (8v/7s), before fixes | 4 | 1 | 4 | 80.0% | 50.0% | 61.5% |
| first, after fixes | 8 | 0 | 0 | 100% | 100% | 100% |
| adversarial (14v/13s), before second round of fixes | 10 | 2 | 4 | 83.3% | 71.4% | 76.9% |
| adversarial, final | 13 | 0 | 1 | 100% | 92.9% | 96.3% |

## Unrelated finding, not fixed here

`meta.docs.description` says "logs, responses, or error messages". There is no
API-response path in this rule and never has been - it visits `CallExpression`
for loggers and `NewExpression` for `Error`, and nothing else. The rule's own
header comment already says so. Rewording is a docs-wide change and was left
alone.
