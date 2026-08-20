# Rule corpus — `node-security/require-secure-credential-storage` (CWE-312 / CWE-526)

Written from CWE-312 semantics and real Node / React Native idiom, **not** from
the rule's own test file. The point is independent evidence: a corpus derived
from the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

This is a **require-** rule: it reports the ABSENCE of secure storage. So
`vulnerable/` is a credential coming to rest in a store that keeps it in the
clear (Web Storage, AsyncStorage, `process.env`), and `safe/` is either a store
that encrypts (OS keychain, `react-native-encrypted-storage`, a real
encrypt-then-store) or a value that is not a credential at all. Fake mitigations
— base64, a local no-op `encrypt` — belong in `vulnerable/`.

## vulnerable/

| Fixture | Shape |
|---|---|
| `01-rn-login-asyncstorage.js` | `AsyncStorage.setItem('refresh_token', …)` in an RN sign-in |
| `02-web-session-jwt.js` | `window.localStorage.setItem(SESSION_KEY, jwt)` |
| `03-env-secret-injection.js` | `process.env.STRIPE_SECRET_KEY = <vault read>` |
| `04-env-password-bracket.js` | `process.env['DB_PASSWORD'] = …` |
| `05-base64-not-encryption.js` | `btoa(apiKey)` presented as protection |
| `06-fake-local-encrypt.js` | a LOCAL `const encrypt = (v) => v` |
| `07-session-storage-cast.ts` | TypeScript `ctx.authToken as string` |
| `08-store-alias.js` | `const store = window.localStorage; store.setItem(…)` |
| `09-credentials-object-json.js` | the credential inside `JSON.stringify({ accessToken })` |
| `10-env-through-intermediate.js` | secret reaching `process.env` through one `const` |
| **adversarial wave** | |
| `11-object-assign-env.js` | `Object.assign(process.env, { DATABASE_PASSWORD: … })` |
| `12-env-alias.js` | `const env = process.env; env.SERVICE_API_KEY = …` |
| `13-asyncstorage-multiset.js` | `AsyncStorage.multiSet([['auth.accessToken', …]])` |

## safe/

| Fixture | Shape |
|---|---|
| `01-keytar-keychain.js` | the OS keychain — the remediation |
| `02-secrets-manager-at-point-of-use.js` | fetched at point of use, never persisted |
| `03-env-read-only.js` | READING `process.env` |
| `04-env-nonsecret-writes.js` | `NODE_ENV`, `PORT`, `TZ` |
| `05-ui-prefs-localstorage.js` | theme / locale in Web Storage |
| `06-password-policy-config.js` | `password` only in keys, a docs URL and a comment |
| `07-encrypt-then-store.js` | real AES-GCM before the store |
| `08-env-doc-url.js` | `process.env.PASSWORD_POLICY_URL = 'https://…'` |
| `09-memory-only-credential.js` | in-process cache, nothing at rest |
| **adversarial wave** | |
| `10-encrypted-storage.js` | `react-native-encrypted-storage` — same `setItem`, encrypted store |
| `11-storage-reads-and-removals.js` | `getItem` / `removeItem` on credential keys |
| `12-env-flag-defaults.js` | `TOKEN_TTL_SECONDS`, `SECRET_SCAN_MODE` |

## What this corpus proved

Baseline (wave 1): **TP 6, FP 2, FN 4 — P 0.75, R 0.60, F1 0.667.**
After the adversarial wave: **TP 6, FP 3, FN 7 — P 0.667, R 0.462, F1 0.545.**

Two defects belong to this rule and are fixed here:

1. **`Object.assign(process.env, {…})` was invisible.** The rule had a single
   `AssignmentExpression` handler, and the batch spelling a secrets loader
   actually uses never forms one.
2. **`const env = process.env` defeated the sink.** The write through the alias
   mutates the identical object. Now resolved through `constInitializerOf`
   (`const`, single definition, two hops), not by trusting a variable named
   `env`.

After those two: **TP 8, FP 3, FN 5 — P 0.727, R 0.615, F1 0.667.**

**Every remaining defect is in the shared `src/utils/credential-evidence.ts`,
which this task's boundary forbids editing.** They are listed in the report so
they can be fixed in one pass rather than five. In short:

- `isEncryptedExpression` (l.156-168) judges the callee's NAME and never
  resolves the binding, so a local `const encrypt = (v) => v` is accepted as
  encryption (`vulnerable/06`).
- `nameOf` (l.65-85) does not unwrap `TSAsExpression`, so a required TypeScript
  cast erases the evidence (`vulnerable/07`).
- `isWebStorageWrite` (l.179-195) matches the receiver's spelling, so a `const`
  alias of `window.localStorage` is not a store (`vulnerable/08`), and it knows
  only `setItem`, so `AsyncStorage.multiSet` is not a write (`vulnerable/13`).
- `nameOf` returns `''` for a `CallExpression`, so a credential inside
  `JSON.stringify({ accessToken })` — the commonest real spelling — is no
  evidence (`vulnerable/09`).
- `namesACredential` (l.59-62) is a substring test over a topic vocabulary, so
  `password-strength-meter`, `PASSWORD_POLICY_URL`, `TOKEN_TTL_SECONDS` and
  `SECRET_SCAN_MODE` all read as credentials (`safe/06`, `safe/08`, `safe/12`).
  Note that `nameHasAnyWord` does NOT fix these: `password` is a whole word in
  `password-strength-meter`. The evidence needed is that the value is a
  credential, not that the key mentions one.
