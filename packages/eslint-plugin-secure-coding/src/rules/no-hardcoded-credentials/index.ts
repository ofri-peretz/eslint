/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-credentials
 * Detects hardcoded passwords, API keys, tokens, and other sensitive credentials
 * CWE-798: Use of Hard-coded Credentials
 * 
 * @see https://cwe.mitre.org/data/definitions/798.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons,
  compileUserPatterns,
  type PatternTest,
} from '@interlace/eslint-devkit';
import { createModuleEvidence, createRule, isTestFilePath } from '@interlace/eslint-devkit';

type MessageIds = 'useEnvironmentVariable' | 'useSecretManager';

/**
 * `strategy` used to be declared here and in `meta.schema`, with an enum of
 * `env`/`config`/`vault`/`auto`. `create()` never read it. It selected between
 * the `strategyEnv`/`strategyConfig`/`strategyVault`/`strategyAuto`
 * suggestions, which were themselves never reported and have been removed.
 */
export interface Options {
  /** Patterns to ignore (regex strings). Default: [] */
  ignorePatterns?: string[];

  /**
   * Allow credentials in test files. Default: true
   *
   * Defaulted to `false` until a corpus scan showed 17 of 18 findings on a real
   * repository were fixtures in `integration/auth.test.js`. The exemption
   * existed and worked; nothing ever turned it on, because `configs.recommended`
   * registers this rule as bare `'error'` with no options. The default
   * configuration therefore reported ~94% noise on any repository with tests.
   *
   * A credential in a test fixture is not an exploitable finding for this rule.
   * Committed real secrets are a secret-scanning concern (gitleaks, trufflehog),
   * which scans history and rotates keys — things a linter cannot do. Set
   * `allowInTests: false` to restore the old behaviour.
   */
  allowInTests?: boolean;

  /** Minimum length for credential detection. Default: 8 */
  minLength?: number;

  /** Detect API keys. Default: true */
  detectApiKeys?: boolean;

  /** Detect passwords. Default: true */
  detectPasswords?: boolean;

  /** Detect tokens. Default: true */
  detectTokens?: boolean;

  /** Detect database connection strings. Default: true */
  detectDatabaseStrings?: boolean;

  /** Custom credential patterns. Default: [] */
  customPatterns?: Array<{
    /** The type of credential (e.g., 'API key', 'token', 'password') */
    type: string;
    /** Regex pattern to match */
    pattern: string;
  }>;

  /** Skip self-evident placeholder values (`<your-secret-here>`, `changeme`, `xxxxxxxx`). Default: true */
  allowPlaceholders?: boolean;

  /**
   * Words that mark a value as a self-evident stand-in rather than a secret,
   * matched as a WHOLE token inside the value. REPLACES the built-in list.
   * Default: DEFAULT_PLACEHOLDER_WORDS
   */
  placeholderWords?: string[];

  /** Extra placeholder words, ON TOP of `placeholderWords`. Default: [] */
  additionalPlaceholderWords?: string[];
}

type RuleOptions = [Options?];

/**
 * Common credential patterns
 */
const CREDENTIAL_PATTERNS = {
  // API Keys (typically 32+ character alphanumeric strings)
  apiKey: /^(?:[A-Za-z0-9_-]{32,}|sk_[A-Za-z0-9_-]{32,}|pk_[A-Za-z0-9_-]{32,}|AKIA[0-9A-Z]{16})$/,
  
  // JWT Tokens (three base64 parts separated by dots)
  jwtToken: /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  
  // OAuth tokens
  oauthToken: /^(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36,}$/,
  
  // AWS Access Keys
  awsAccessKey: /^AKIA[0-9A-Z]{16}$/,
  
  // Database connection strings with credentials
  databaseString: /^(?:mysql|postgres|mongodb|redis):\/\/[^:]+:[^@]+@/,
  
  // Generic password patterns (common weak passwords) - no length requirement
  commonPassword: /^(?:password|admin|123456|qwerty|letmein|welcome|monkey|1234567890|12345678|password123|root|test|guest)$/i,
  
  // Secret keys (base64-like or hex strings)
  secretKey: /^(?:[A-Za-z0-9+/]{32,}={0,2}|[A-Fa-f0-9]{32,})$/,
};

/**
 * Identifier names that imply the surrounding string is a credential.
 * Used to require a *credential-typed* context for ambiguous regex matches
 * (generic 32+-char alphanumeric, common passwords) — without this gate the
 * rule fires on TS union-type literals, error class names, and test prompts
 * (verified on vercel/ai: 807 ours-only findings, top samples are
 * `'experimental_onToolExecutionStart'`, `'AI_ToolCallNotFoundForApprovalError'`,
 * `'test'`).
 */
const CREDENTIAL_VARIABLE_NAMES = new Set<string>([
  'apikey', 'api_key', 'apiKey',
  'secret', 'secretkey', 'secret_key', 'secretKey', 'clientsecret', 'client_secret', 'clientSecret',
  'token', 'authtoken', 'auth_token', 'authToken', 'accesstoken', 'access_token', 'accessToken',
  'refreshtoken', 'refresh_token', 'refreshToken', 'idtoken', 'id_token', 'idToken',
  'password', 'passwd', 'pass', 'pwd',
  'privatekey', 'private_key', 'privateKey',
  'credentials', 'creds',
  'authorization', 'auth',
  'connectionstring', 'connection_string', 'connectionString', 'connectionuri', 'connectionURI',
  'dburl', 'db_url', 'dbUrl', 'databaseurl', 'database_url', 'databaseUrl',
]);

/**
 * ---------------------------------------------------------------------------
 * VALUE-SHAPE HEURISTICS
 * ---------------------------------------------------------------------------
 * The rule decides on the *value*, never on the key name alone. A
 * credential-shaped name (`password`, `apiKey`, `secret`) is treated as a
 * necessary-but-not-sufficient signal: it can promote an ambiguous value, but
 * it can never make a message constant into a finding.
 *
 * This exists because name-only matching produced a 50% false-positive rate on
 * a 1,470-file corpus (webpack, lodash, eslint-plugin-import, two NestJS
 * boilerplates): 5 of 10 findings were i18n error constants such as
 * `errors: { password: 'incorrectPassword' }`, while the genuine 50-character
 * committed API secret in the same corpus was found by *shape*, not name.
 */

/** Characters that join words inside an identifier-like string. */
const WORD_SEPARATORS = new Set(['_', '-', '.', ' ']);

/** Shannon entropy in bits per character. */
function shannonEntropy(value: string): number {
  const freq = new Map<string, number>();
  for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

interface CharClasses {
  lower: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
}

/**
 * Classify the characters present in a string. Word separators (`_ - . ` and
 * space) are deliberately NOT counted as symbols — `snake_case_names` and
 * `kebab-case-names` are identifiers, not passwords.
 *
 * Callers reject whitespace-bearing strings before reaching here, so no
 * whitespace class is tracked.
 */
function charClasses(value: string): CharClasses {
  const classes: CharClasses = { lower: false, upper: false, digit: false, symbol: false };
  for (const ch of value) {
    if (WORD_SEPARATORS.has(ch)) continue;
    if (ch >= 'a' && ch <= 'z') classes.lower = true;
    else if (ch >= 'A' && ch <= 'Z') classes.upper = true;
    else if (ch >= '0' && ch <= '9') classes.digit = true;
    else classes.symbol = true;
  }
  return classes;
}

function classCount(classes: CharClasses): number {
  return Number(classes.lower) + Number(classes.upper) + Number(classes.digit) + Number(classes.symbol);
}

/** A token is "pronounceable" if it has a vowel and no long consonant run. */
function isPronounceable(token: string): boolean {
  const lower = token.toLowerCase();
  if (!/[aeiouy]/.test(lower)) return false;
  if (/[bcdfghjklmnpqrstvwxz]{4,}/.test(lower)) return false;
  return true;
}

/**
 * True when the string is made purely of dictionary-ish words joined by word
 * separators or camelCase — i.e. an identifier, an i18n key, or an error
 * message constant. No digits, no symbols, every ≥3-character token
 * pronounceable.
 *
 * `incorrectPassword` → true   (the corpus false positive)
 * `SessionCacheProvider` → true
 * `experimental_onToolExecutionStart` → true
 * `authorizedRepresentative1FirstName` → true  (numbered form field)
 * `aaAA@123` → false  (symbols)
 * `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` → false
 *
 * Digits used to disqualify a string outright, which cost 18 of this rule's
 * 21 corpus findings: twilio's compliance API declares form fields like
 * `authorizedRepresentative1FirstName`, and the ordinal that distinguishes
 * representative 1 from representative 2 pushed a 34-character English
 * identifier into the high-entropy tier — reported at CVSS 9.8 as a
 * hardcoded credential. Identifiers are numbered (`address2`, `sha256Hash`,
 * `oauth2Token`); secrets are not numbered, they are dense. So digits are
 * allowed but kept sparse, and every alphabetic token must still read as a
 * word — which is what rejects the random blob above (`qbp` has no vowel).
 */
export function isNaturalWordString(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_\-. ]*$/.test(value)) return false;
  const digits = value.replace(/[^0-9]/g, '').length;
  // Sparse: an ordinal or a well-known numeric suffix, not encoded entropy.
  if (digits > 0 && (digits / value.length > 0.2 || /[0-9]{4,}/.test(value))) return false;
  const tokens = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z]+/)
    .filter(Boolean);
  const meaningful = tokens.filter(t => t.length >= 3);
  if (meaningful.length === 0) return false;
  return meaningful.every(isPronounceable);
}

/**
 * True when the string contains a monotonically ascending run of `min`
 * characters (`abcdef`, `012345`). Charset constants — the alphabets that
 * random-string generators and hash encoders declare inline — have maximal
 * entropy while being the opposite of a secret. webpack's
 * `lib/util/hash/hash-digest.js` and ack-nestjs-boilerplate's
 * `helper.service.ts` each declare several.
 */
function hasSequentialRun(value: string, min = 5): boolean {
  let run = 1;
  for (let i = 1; i < value.length; i++) {
    run = value.charCodeAt(i) === value.charCodeAt(i - 1) + 1 ? run + 1 : 1;
    if (run >= min) return true;
  }
  return false;
}

/**
 * High-confidence random blob: a contiguous alphanumeric token, mixed case,
 * containing digits, high per-character entropy, and not a charset constant.
 * That is the shape of a real committed API secret.
 *
 * The charset is deliberately strict (`[A-Za-z0-9]` only). Every non-secret
 * that reached this tier on the corpus failed exactly here: generated-code
 * strings (`installedChunkData[1](error);`), comma-separated keyword lists,
 * and Postgres constraint names (`PK_b36bcfe02fc8de3c57a8b2391c2`) all carry
 * punctuation that no API key does. JWTs and dotted identifiers are excluded
 * for the same reason and handled by their own, more specific tier.
 */
export function looksRandom(value: string): boolean {
  if (value.length < 20) return false;
  if (!/^[A-Za-z0-9]+$/.test(value)) return false;
  const classes = charClasses(value);
  if (!classes.lower || !classes.upper || !classes.digit) return false;
  if (hasSequentialRun(value)) return false;
  // A string made of English words is not random, whatever its entropy.
  // camelCase identifiers clear every test above — mixed case by construction,
  // alphanumeric, no ascending run — and a long one clears the entropy bar too.
  // `authorizedRepresentative1FirstName` (34 chars, twilio's compliance API)
  // scored as a random blob and was reported at CVSS 9.8: 18 of this rule's 21
  // corpus findings, all one field name.
  if (isNaturalWordString(value)) return false;
  return shannonEntropy(value) >= 3.5;
}

/**
 * Length at which a random-looking blob is reported with NO naming context.
 * Below it the shape is still required, but so is a credential-named slot:
 * `CreateUser1715028537217` (a TypeORM migration class name, 23 chars) passes
 * every shape test there is, and only the absence of a credential-named slot
 * separates it from a 25-character API key.
 */
const CONTEXT_FREE_RANDOM_LENGTH = 32;

/**
 * Shape gate for the "assigned to a credential-named binding" path. The name
 * says *what the slot is for*; this says *whether the value is plausibly a
 * secret rather than a message, label, or identifier*.
 */
export function isSecretShaped(value: string, minLength: number): boolean {
  if (value.length < minLength) return false;
  // Sentences and phrases are messages, never credentials.
  if (/\s/.test(value)) return false;
  // Pure word strings are identifiers / i18n keys / message constants.
  if (isNaturalWordString(value)) return false;
  // A credential mixes at least two character classes, or — for single-charset
  // secrets like a 21-character lowercase blob — is long and high-entropy.
  if (classCount(charClasses(value)) >= 2) return true;
  return value.length >= 20 && shannonEntropy(value) >= 3.0;
}

/**
 * Words that only ever appear in a value a developer expects to replace.
 * Matched as whole words inside the string, so `changeme`, `change-me`,
 * `YOUR_API_KEY`, and `<your-secret-here>` are all covered.
 *
 * Fifteen English words deciding whether a finding is suppressed, so this is a
 * DEFAULT rather than a fixed surface: a house convention spelled differently
 * (`fillmein`, `nopass`) is added through `additionalPlaceholderWords`, and a
 * codebase where `sample` or `example` names a real value drops it through
 * `placeholderWords`. Neither changes that the comparison is whole-token.
 */
const DEFAULT_PLACEHOLDER_WORDS = [
  'changeme', 'change', 'replaceme', 'replace', 'yours', 'your',
  'placeholder', 'example', 'sample', 'dummy', 'todo', 'tbd',
  'redacted', 'notreal', 'xxx',
];

/**
 * True when the value is a self-evident stand-in rather than a secret.
 *
 * Three shapes, each unambiguous on its own:
 *   1. Bracketed template slots — `<your-secret-here>`, `{{API_KEY}}`,
 *      `${SECRET}`, `[token]`. No real credential is delimited this way, and
 *      the brackets are what push the string past `isSecretShaped`'s
 *      two-character-class gate in the first place.
 *   2. A placeholder word standing as its own token — `changeme`,
 *      `YOUR_API_KEY`, `example.com`. Substring matching is deliberately
 *      avoided: a real key may contain `bar` by chance.
 *   3. One character repeated — `xxxxxxxxxxxx`, `********`, `00000000`.
 *
 * Verified against benchmarks/corpus/CWE-798/safe/test-placeholder-values.js,
 * where `secret: '<your-secret-here>'` was reported at CVSS 9.8.
 */
export function isPlaceholderValue(
  value: string,
  words: ReadonlySet<string>,
): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // 1. Bracketed template slots.
  if (/^(?:<.*>|\{\{.*\}\}|\$\{.*\}|\[.*\])$/.test(trimmed)) return true;

  // 3. One character repeated (4+).
  if (trimmed.length >= 4 && new Set(trimmed).size === 1) return true;

  // 2. Placeholder word as a whole token.
  const tokens = trimmed
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return tokens.some(token => words.has(token));
}

/**
 * ---------------------------------------------------------------------------
 * PUBLISHABLE KEYS — a key that must ship to a browser to work is not a secret
 * ---------------------------------------------------------------------------
 * Some vendor keys are *designed* to be public. A Bugsnag notifier API key, a
 * Sentry DSN, a Stripe `pk_live_`, a PostHog project key: each is compiled into
 * the client bundle of every application that uses it, is served to every
 * visitor, and is documented by its vendor as client-side. They are addresses
 * with write-only, rate-limited ingest behind them — not credentials. Rotating
 * one changes nothing about who can read your data, because nobody could.
 *
 * The pair that made this concrete, both the same 32-hex Bugsnag notifier key:
 *   - Shopify/cli `bin/update-bugsnag.js:15`      (`const apiKey = '…'`)
 *   - Shopify/cli `packages/cli-kit/src/private/node/constants.ts:83`
 *     (`export const bugsnagApiKey = '…'`)
 * The predicate at fault is `CREDENTIAL_PATTERNS.secretKey` — 32+ hex chars —
 * promoted to a finding by the identifier `apiKey`. Both signals are correct;
 * the conclusion is not. That key ships in every published copy of the Shopify
 * CLI, on npm, right now.
 *
 * THE LINE THIS DRAWS, and it is not "keys named apiKey are fine":
 *   - Publishable by VALUE — the prefix is registered to the publishable half
 *     of a key pair (`pk_`, `phc_`, a Sentry DSN). No context needed.
 *   - Publishable by VENDOR + SLOT — the file loads the vendor's SDK, or the
 *     slot names the vendor, AND the slot is the one that holds that vendor's
 *     *publishable* key. `bugsnagApiKey` qualifies; `bugsnagAuthToken` does not.
 *
 * Nothing on the secret side is weakened. `sk_live_`, `rk_live_`, `ghp_`,
 * AWS `AKIA…`, PEM private keys, JWTs and DB connection strings are vetoed by
 * value before either path is consulted, and any slot naming a secret
 * (`…secret`, `…private…`, `…password`) is vetoed by name. A vendor whose
 * publishable key is `apiKey` does not thereby make its `apiSecret` publishable.
 */

/** Value shapes that are publishable by construction — the prefix says so. */
export function isPublishableKeyValue(value: string): boolean {
  // Stripe publishable key. `sk_` (secret) and `rk_` (restricted) are NOT here:
  // https://docs.stripe.com/keys — "Publishable keys ... can be publicly
  // accessible in your web or mobile app's client-side code."
  if (/^pk_(?:live|test)_[A-Za-z0-9_-]{8,}$/.test(value)) return true;
  // PostHog project API key: written into every page that loads posthog-js.
  // `phx_` (personal) and `phs_` (secret) are NOT here.
  if (/^phc_[A-Za-z0-9]{20,}$/.test(value)) return true;
  // A Sentry DSN. The pair used to have a secret half; Sentry removed it in
  // 2016 precisely because the DSN has to reach the browser.
  if (/^https?:\/\/[A-Za-z0-9]+@[A-Za-z0-9.-]+(?::\d+)?\/\d+$/.test(value)) {
    return true;
  }
  return false;
}

/**
 * Values that are secret whatever slot they sit in. Checked before any
 * allowlist path, so no vendor context can ever exempt one.
 */
const SECRET_SIDE_VALUE =
  /^(?:sk|rk)_(?:live|test)_|^sk-[A-Za-z0-9]|^gh[pousr]_|^ph[xs]_|^sntry[su]_|^xox[baprs]-|^AKIA[0-9A-Z]{16}$|^ey[A-Za-z0-9_-]+\.ey|-----BEGIN|^(?:mysql|postgres|mongodb|redis):\/\//;

/** Slot names that name the secret half, and can never be allowlisted. */
const SECRET_SIDE_SLOT =
  /secret|private|signing|password|passwd|serviceaccount|serverkey|adminkey|masterkey/;

/**
 * Vendors whose primary key is designed to ship to a client.
 *
 * `slots` deliberately lists only the *publishable* slot for each vendor. Every
 * one of these vendors also issues a server-side credential — Bugsnag has a
 * personal auth token, Sentry an auth token, PostHog a personal API key — and
 * those live in differently-named slots that these patterns do not match.
 *
 * @protocol-constant Each entry restates one vendor's published contract — the
 * npm specifiers that prove their SDK is loaded, and the slot name that vendor
 * documents as safe to ship to a browser (Sentry's DSN, Segment's write key,
 * Firebase's web API key). It is a set of third-party API facts rather than a
 * word list about a domain, and it exists to close a false positive: these keys
 * ARE hard-coded in client code on purpose. A consumer who could edit it gets
 * both failure directions at once — deleting an entry re-asserts the very false
 * positive it was written to close, and adding one turns the allowlist into a
 * way to name any vendor and have a genuine server-side secret in a
 * `<vendor>Key` slot go unreported. Widening it is a change to the plugin, made
 * against the vendor's own documentation, not a consumer setting.
 */
const PUBLISHABLE_VENDORS: ReadonlyArray<{
  vendor: string;
  packages?: readonly string[];
  scopes?: readonly string[];
  /** The vendor's name as it appears inside an identifier. */
  named: RegExp;
  /** Slot names that hold this vendor's publishable key. */
  slots: RegExp;
}> = [
  {
    vendor: 'Bugsnag',
    packages: [
      'bugsnag',
      'bugsnag-js',
      'bugsnag-build-reporter',
      'bugsnag-sourcemaps',
    ],
    scopes: ['@bugsnag'],
    named: /bugsnag/,
    slots: /^(?:bugsnag)?(?:notifier)?(?:api)?key$/,
  },
  {
    vendor: 'Sentry',
    scopes: ['@sentry'],
    named: /sentry/,
    slots: /^(?:sentry)?dsn$/,
  },
  {
    vendor: 'PostHog',
    packages: ['posthog-js', 'posthog-node'],
    named: /posthog/,
    slots: /^(?:posthog)?(?:project)?(?:api)?key$/,
  },
  {
    vendor: 'Segment',
    packages: ['analytics-node'],
    scopes: ['@segment'],
    named: /segment/,
    slots: /^(?:segment)?write(?:key|token)$/,
  },
  {
    vendor: 'Amplitude',
    packages: ['amplitude-js'],
    scopes: ['@amplitude'],
    named: /amplitude/,
    slots: /^(?:amplitude)?(?:api)?key$/,
  },
  {
    vendor: 'Mixpanel',
    packages: ['mixpanel', 'mixpanel-browser'],
    named: /mixpanel/,
    slots: /^(?:mixpanel)?(?:project)?token$/,
  },
  {
    vendor: 'Firebase',
    packages: ['firebase'],
    scopes: ['@firebase'],
    named: /firebase/,
    slots: /^(?:firebase)?(?:web)?apikey$/,
  },
];

/** One module probe per vendor, built once at module load. */
const VENDOR_PROBES = PUBLISHABLE_VENDORS.map((entry) => ({
  entry,
  loadsSdk: createModuleEvidence({
    packages: entry.packages,
    scopes: entry.scopes,
  }),
}));

/**
 * The identifier a literal is being assigned to, lowercased.
 *
 * Shared by the credential-type inference and the publishable-key allowlist so
 * the two can never disagree about which name they are reading.
 */
function slotNameOf(parent: TSESTree.Node): string {
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name.toLowerCase();
  }
  if (parent.type === 'Property') {
    const key = parent.key;
    if (key.type === 'Identifier') return key.name.toLowerCase();
    // isCredentialContext's own Property check only returns true for an
    // Identifier key (handled above) or a string-Literal key, so whatever
    // remains here is always the latter.
    return String((key as TSESTree.Literal).value).toLowerCase();
  }
  if (parent.type === 'AssignmentExpression') {
    const left = parent.left;
    if (
      left.type === 'MemberExpression' &&
      left.property.type === 'Identifier'
    ) {
      return left.property.name.toLowerCase();
    }
  }
  return '';
}

/**
 * Result of credential pattern matching.
 * - `structural` matches (JWT, OAuth, AWS-key, DB connection string) are
 *   unambiguous — the string's shape only fits one purpose; report immediately.
 * - `ambiguous` matches (32+-char alphanumeric, common-password keywords) need
 *   a credential-named context to avoid firing on identifier-shaped literals.
 */
type CredentialConfidence = 'structural' | 'ambiguous';

/**
 * Check if a string literal looks like a hardcoded credential.
 * Returns `confidence: 'ambiguous'` when only a permissive pattern matched —
 * the caller MUST verify the surrounding identifier is credential-named.
 */
function looksLikeCredential(
  value: string,
  options: Required<Pick<Options, 'minLength' | 'detectApiKeys' | 'detectPasswords' | 'detectTokens' | 'detectDatabaseStrings' | 'customPatterns'>>,
  ignorePatterns: readonly PatternTest[]
): { isCredential: boolean; type: string; confidence: CredentialConfidence } {
  const NONE = { isCredential: false, type: '', confidence: 'ambiguous' as const };

  // Check ignore patterns first
  if (ignorePatterns.some(pattern => pattern.test(value))) return NONE;

  // Custom patterns are user-defined → trust them, treat as structural
  for (const customPattern of options.customPatterns) {
    try {
      const regex = new RegExp(customPattern.pattern);
      if (regex.test(value)) {
        return { isCredential: true, type: customPattern.type, confidence: 'structural' };
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      continue;
    }
  }

  // Common-password keyword match — AMBIGUOUS. Strings like "test", "admin",
  // "guest" appear in test fixtures, error messages, and identifiers all the
  // time. The caller must verify a credential-named context.
  if (options.detectPasswords && CREDENTIAL_PATTERNS.commonPassword.test(value)) {
    return { isCredential: true, type: 'Common password', confidence: 'ambiguous' };
  }

  // Structural: DB connection strings have unambiguous shape
  // `protocol://user:pass@host` — no FP risk.
  if (options.detectDatabaseStrings && CREDENTIAL_PATTERNS.databaseString.test(value)) {
    return { isCredential: true, type: 'Database connection string', confidence: 'structural' };
  }

  if (value.length < options.minLength) return NONE;

  // Structural: JWT format (3 base64 parts dot-separated)
  if (options.detectTokens && CREDENTIAL_PATTERNS.jwtToken.test(value)) {
    return { isCredential: true, type: 'JWT token', confidence: 'structural' };
  }
  // Structural: OAuth tokens have provider prefixes (ghp_, gho_, ...)
  if (options.detectTokens && CREDENTIAL_PATTERNS.oauthToken.test(value)) {
    return { isCredential: true, type: 'OAuth token', confidence: 'structural' };
  }

  // Secret keys (base64/hex 32+) — context-required. Long base64 / hex
  // strings appear in source maps, generated IDs, hash digests; without
  // a credential-named context they're FPs. Word-shaped strings are excluded
  // outright: `experimental_onToolExecutionStart` is 33 chars of [A-Za-z_]
  // and matches the charset, but it is an identifier, not a key.
  // Structural: AWS access key has a fixed prefix
  if (options.detectApiKeys && CREDENTIAL_PATTERNS.awsAccessKey.test(value)) {
    return { isCredential: true, type: 'AWS access key', confidence: 'structural' };
  }

  // Structural: Stripe-style keys (sk_live_, sk_test_, pk_live_, pk_test_,
  // rk_live_, rk_test_) are unambiguous — the prefix is registered to
  // Stripe and never appears in unrelated contexts. Type label is kept
  // as the generic 'API key' to match existing test expectations and
  // ensure the suggestion templates remain stable for callers.
  if (
    options.detectApiKeys &&
    /^(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_-]{16,}$/.test(value)
  ) {
    return { isCredential: true, type: 'API key', confidence: 'structural' };
  }

  // Structural by SHAPE, not by name: a long, mixed-case, digit-bearing,
  // high-entropy blob with no separators is a random secret whatever the
  // slot it sits in. This is the tier that finds the genuine 50-character
  // API secret committed in ack-nestjs-boilerplate's migration seed data —
  // and it also finds the 25-character `key:` next to it, which the old
  // name-driven logic missed because `key` was not on the allowlist.
  if (options.detectApiKeys && looksRandom(value)) {
    return {
      isCredential: true,
      type: 'Secret key',
      confidence: value.length >= CONTEXT_FREE_RANDOM_LENGTH ? 'structural' : 'ambiguous',
    };
  }

  if (value.length >= 32 && CREDENTIAL_PATTERNS.secretKey.test(value) && !isNaturalWordString(value)) {
    return { isCredential: true, type: 'Secret key', confidence: 'ambiguous' };
  }

  // Generic 32+-char alphanumeric — AMBIGUOUS. This is the FP source on
  // vercel/ai's TS union types and error class names. Caller must verify
  // a credential-named context, and the value must not be word-shaped.
  if (options.detectApiKeys && /^[A-Za-z0-9_-]{32,}$/.test(value) && !isNaturalWordString(value)) {
    return { isCredential: true, type: 'API key', confidence: 'ambiguous' };
  }

  return NONE;
}

// Note: isCredentialVariableName is reserved for future use when we want to
// check variable names in addition to values
// @coverage-note: Not currently used, reserved for future enhancement

export const noHardcodedCredentials = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-credentials',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-hardcoded-credentials.md',
      description: 'Detects hardcoded passwords, API keys, tokens, and other sensitive credentials',
      cwe: 'CWE-798',
      cvss: 9.8,
      confidence: 'medium',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      useEnvironmentVariable: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hard-coded Credential',
        cwe: 'CWE-798',
        description: 'Hard-coded {{credentialType}} detected',
        severity: 'CRITICAL',
        fix: 'Use environment variable: process.env.{{envVarName}} or secret management service',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
      useSecretManager: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Use Secret Manager',
        cwe: 'CWE-798',
        description: 'Use secure secret management service',
        severity: 'HIGH',
        fix: 'Use AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, or similar',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Regex patterns to ignore',
          },
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow credentials in test files',
          },
          minLength: {
            type: 'number',
            default: 8,
            description: 'Minimum length for credential detection',
          },
          detectApiKeys: {
            type: 'boolean',
            default: true,
            description: 'Detect API keys',
          },
          detectPasswords: {
            type: 'boolean',
            default: true,
            description: 'Detect passwords',
          },
          detectTokens: {
            type: 'boolean',
            default: true,
            description: 'Detect tokens',
          },
          detectDatabaseStrings: {
            type: 'boolean',
            default: true,
            description: 'Detect database connection strings',
          },
          customPatterns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'The type of credential (e.g., "API key", "token")',
                },
                pattern: {
                  type: 'string',
                  description: 'Regex pattern to match',
                },
              },
              required: ['type', 'pattern'],
              additionalProperties: false,
            },
            default: [],
            description: 'Custom credential patterns to detect',
          },
          allowPlaceholders: {
            type: 'boolean',
            default: true,
            description:
              'Skip self-evident placeholder values (`<your-secret-here>`, `changeme`, `xxxxxxxx`)',
          },
          placeholderWords: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_PLACEHOLDER_WORDS,
            description:
              'Words that mark a value as a self-evident stand-in rather than a secret, matched as a WHOLE token inside the value and never as a substring. Replaces the built-in list. Read only when `allowPlaceholders` is true.',
          },
          additionalPlaceholderWords: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra placeholder words, on top of `placeholderWords`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignorePatterns: [],
      allowInTests: true,
      minLength: 8,
      detectApiKeys: true,
      detectPasswords: true,
      detectTokens: true,
      detectDatabaseStrings: true,
      customPatterns: [],
      allowPlaceholders: true,
      placeholderWords: DEFAULT_PLACEHOLDER_WORDS,
      additionalPlaceholderWords: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      ignorePatterns = [],
      allowInTests = true,
      minLength = 8,
      detectApiKeys = true,
      detectPasswords = true,
      detectTokens = true,
      detectDatabaseStrings = true,
      customPatterns = [],
      allowPlaceholders = true,
      placeholderWords = DEFAULT_PLACEHOLDER_WORDS,
      additionalPlaceholderWords = [],
    }: Options = options;

    const placeholderWordSet: ReadonlySet<string> = new Set([
      ...placeholderWords,
      ...additionalPlaceholderWords,
    ]);

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

    // Compile ignore patterns to regex
    // Guarded: a user pattern reaches `new RegExp` here. Measured before this
    // change: `(a+)+$` took 45-58s on a single file, and `[` threw
    // "Invalid regular expression" out of create(), killing the whole lint
    // run rather than just this rule. compileUserPattern degrades both to a
    // substring match.
    const compiledIgnorePatterns = compileUserPatterns(ignorePatterns as string[]);

    const detectionOptions = {
      minLength,
      detectApiKeys,
      detectPasswords,
      detectTokens,
      detectDatabaseStrings,
      customPatterns,
    };

    /**
     * Variable / property names that hold UI labels and HTML attribute
     * values, not secrets. When a literal containing the word "password"
     * (or other credential-like text) lives in one of these contexts, it's
     * a label or form-field metadata, not a hardcoded credential.
     */
    const LABEL_CONTEXT_NAMES = new Set<string>([
      // HTML form attributes
      'type', 'name', 'id', 'placeholder', 'label', 'title', 'role',
      'autocomplete', 'autoFocus', 'autocapitalize', 'inputmode',
      // ARIA
      'aria-label', 'aria-labelledby', 'aria-describedby',
      // Common semantic UI fields
      'fieldName', 'fieldType', 'fieldLabel', 'inputType', 'inputName',
      'displayName', 'columnName', 'paramName',
      // i18n keys / translation lookup. NOTE: bare `'key'` is intentionally
      // omitted — `const key = '...'` is the canonical name for actual API
      // keys (e.g. AWS, Stripe), so exempting it would mask real secrets.
      // The specific i18n names below cover translation lookups without
      // that false-negative.
      'i18nKey', 'translationKey', 'messageKey',
    ]);

    /**
     * Returns true if the literal is being used as a UI label or HTML
     * attribute value rather than as a secret. Examples:
     *   const label = 'password';                        // variable named `label`
     *   input.type = 'password';                          // assigning to .type
     *   input.name = 'userPassword';                      // assigning to .name
     *   <input type="password" />                         // JSX attribute
     *   { type: 'password', name: 'pw' }                  // object literal property
     *   setAttribute('placeholder', 'Enter password')     // setAttribute call
     */
    function isLabelContext(node: TSESTree.Literal | TSESTree.TemplateLiteral, parent?: TSESTree.Node): boolean {
      if (!parent) return false;

      // Object-literal entries: walk up through the ObjectExpression →
      // its Property → its enclosing VariableDeclarator. Closes the
      // regression where `const labels = { password: 'Enter password' }`
      // was firing because the property key 'password' is in
      // CREDENTIAL_VARIABLE_NAMES even though the surrounding `labels`
      // var indicates the whole object is UI text.
      if (parent.type === 'ObjectExpression') {
        const grand = (parent as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (grand) return isLabelContext(node, grand);
        return false;
      }

      // Array elements: walk up so `const labels = ['Enter password']`
      // is treated as label context if `labels` is label-named.
      if (parent.type === 'ArrayExpression') {
        const grand = (parent as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (grand) return isLabelContext(node, grand);
        return false;
      }

      // const label = 'password' / let label = 'password' / `labels` /
      // any var ending in `label`/`name`/`placeholder`.
      if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        const n = (parent.id as TSESTree.Identifier).name.toLowerCase();
        if (LABEL_CONTEXT_NAMES.has(n) || n === 'labels' || n.endsWith('label') || n.endsWith('labels') || n.endsWith('name') || n.endsWith('placeholder')) return true;
      }

      // input.type = 'password' / input.name = 'userPassword'
      if (parent.type === 'AssignmentExpression' && (parent as TSESTree.AssignmentExpression).right === node) {
        const left = (parent as TSESTree.AssignmentExpression).left;
        if (left.type === 'MemberExpression' && left.property.type === 'Identifier') {
          if (LABEL_CONTEXT_NAMES.has((left.property as TSESTree.Identifier).name)) return true;
        }
      }

      // { type: 'password', name: 'foo' } — direct property key is label-typed
      if (parent.type === 'Property' && (parent as TSESTree.Property).value === node) {
        const key = (parent as TSESTree.Property).key;
        // `RECOVERY_TYPE_PASSWORD: 'PASSWORD'` — an enum whose value restates a
        // word of its own key is a label for a kind of thing, not an instance
        // of one. A real secret never spells out the name of its slot.
        const keyText =
          key.type === 'Identifier'
            ? key.name
            : key.type === 'Literal' && typeof key.value === 'string'
              ? key.value
              : null;
        if (keyText !== null && node.type === 'Literal' && typeof node.value === 'string') {
          const keyTokens = keyText
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .toUpperCase()
            .split(/[^A-Z0-9]+/)
            .filter(Boolean);
          if (keyTokens.includes(node.value.toUpperCase())) return true;
        }
        if (key.type === 'Identifier' && LABEL_CONTEXT_NAMES.has((key as TSESTree.Identifier).name)) return true;
        if (key.type === 'Literal' && typeof (key as TSESTree.Literal).value === 'string') {
          if (LABEL_CONTEXT_NAMES.has((key as TSESTree.Literal).value as string)) return true;
        }
        // Otherwise, walk up: the property may not have a label-typed
        // key but the enclosing variable might be `labels` /
        // `i18nStrings` / `messages` / etc., signalling that the
        // whole object is UI text. Closes the FP regression where
        // `const labels = { password: 'Enter password' }` fired
        // because `password` is in CREDENTIAL_VARIABLE_NAMES.
        const obj = (parent as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (obj?.type === 'ObjectExpression') {
          const grand = (obj as TSESTree.Node & { parent?: TSESTree.Node }).parent;
          if (grand) return isLabelContext(node, grand);
        }
      }

      // setAttribute('type', 'password') — second arg is the value
      if (
        parent.type === 'CallExpression' &&
        (parent as TSESTree.CallExpression).callee.type === 'MemberExpression' &&
        ((parent as TSESTree.CallExpression).callee as TSESTree.MemberExpression).property.type === 'Identifier'
      ) {
        const callee = (parent as TSESTree.CallExpression).callee as TSESTree.MemberExpression;
        const methodName = (callee.property as TSESTree.Identifier).name;
        if (methodName === 'setAttribute' || methodName === 'getAttribute') {
          const args = (parent as TSESTree.CallExpression).arguments;
          if (args[1] === node) return true;
        }
      }

      // JSX: <input type="password" />
      if (parent.type === 'JSXAttribute' as unknown as string) return true;

      return false;
    }

    /**
     * Map a credential-context to its category so the detection-disable
     * options can gate the context-positive code path. `password` covers
     * password-like names, `token` covers JWT / OAuth / session tokens,
     * `database` covers DB connection strings, `apikey` covers API key /
     * secret-key style names. Anything else falls back to `other`, which
     * the options never gate (e.g. `credentials`, `auth`).
     */
    function inferCredentialTypeFromContext(
      // Non-optional: the sole caller only reaches here after
      // isCredentialContext(node, parent) has already returned true, which
      // requires a truthy parent.
      parent: TSESTree.Node,
    ): 'password' | 'token' | 'database' | 'apikey' | 'other' {
      const name = slotNameOf(parent);
      if (/(?:^|[_-])(password|passwd|pass|pwd)$/.test(name)) return 'password';
      if (/(?:^|[_-])(token|authtoken|auth_token|accesstoken|access_token|refreshtoken|refresh_token|idtoken|id_token)$/.test(name)) return 'token';
      if (/(?:^|[_-])(dburl|db_url|databaseurl|database_url|connectionstring|connection_string|connectionuri)$/.test(name)) return 'database';
      if (/(?:^|[_-])(apikey|api_key|secretkey|secret_key|privatekey|private_key|secret|key|clientsecret|client_secret)$/.test(name)) return 'apikey';
      return 'other';
    }

    /**
     * Returns true when the string is in a context that names credentials —
     * assigned to a credential-typed variable, property, parameter, or used
     * as the second argument to common credential APIs. Required for
     * ambiguous matches (generic 32+-char alphanumeric, common-password
     * keywords) which would otherwise fire on identifier-shaped literals
     * (TS union types, error class names, test prompts).
     */
    function isCredentialContext(node: TSESTree.Literal | TSESTree.TemplateLiteral, parent?: TSESTree.Node): boolean {
      if (!parent) return false;

      const matches = (name: string): boolean => {
        const lower = name.toLowerCase();

        // Bare `key` / `keys` is a WEAK credential name: it labels cache keys,
        // map keys, i18n keys and object keys far more often than API keys
        // (`const key = "memCache2"` in webpack's Compilation.js). It counts as
        // credential context only when the value is already a random blob by
        // shape — which is what makes `{ key: 'fyFGb7ywyM37TqDY8nuhAmGW5' }`
        // (ack-nestjs-boilerplate's seeded API key) reportable.
        if (lower === 'key' || lower === 'keys') {
          return node.type === 'Literal' && typeof node.value === 'string' && looksRandom(node.value);
        }

        // Try the literal name AND its singular form (drop trailing 's')
        // so collections like `tokens`, `apiKeys`, `secrets`, `passwords`
        // are recognised. Closes the audit FN where
        // `const tokens = ['Bearer sk_live_...']` bypassed credential
        // detection because `tokens` (plural) wasn't in the allowlist.
        const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
        if (CREDENTIAL_VARIABLE_NAMES.has(lower) || CREDENTIAL_VARIABLE_NAMES.has(singular)) return true;
        return lower.endsWith('apikey') || lower.endsWith('apikeys') ||
               lower.endsWith('secret') || lower.endsWith('secrets') ||
               lower.endsWith('token') || lower.endsWith('tokens') ||
               lower.endsWith('password') || lower.endsWith('passwords') ||
               lower.endsWith('passwd') || lower.endsWith('credential') ||
               lower.endsWith('credentials');
      };

      // Array elements: walk up through the ArrayExpression to its
      // enclosing variable / property. Closes the audit FN where
      // `const tokens = ['Bearer sk_live_...']` was bypassing the
      // credential-name check because the literal's immediate parent is
      // the ArrayExpression rather than the VariableDeclarator.
      if (parent.type === 'ArrayExpression') {
        const grand = (parent as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (grand) return isCredentialContext(node, grand);
        return false;
      }

      // const apiKey = '...' / let secret = '...'
      if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        if (matches((parent.id as TSESTree.Identifier).name)) return true;
      }

      // obj.apiKey = '...' / this.password = '...'
      if (parent.type === 'AssignmentExpression' &&
          (parent as TSESTree.AssignmentExpression).right === node) {
        const left = (parent as TSESTree.AssignmentExpression).left;
        if (left.type === 'MemberExpression' && left.property.type === 'Identifier') {
          if (matches((left.property as TSESTree.Identifier).name)) return true;
        }
        if (left.type === 'Identifier') {
          if (matches((left as TSESTree.Identifier).name)) return true;
        }
      }

      // { apiKey: '...', secret: '...' }
      if (parent.type === 'Property' && (parent as TSESTree.Property).value === node) {
        const key = (parent as TSESTree.Property).key;
        if (key.type === 'Identifier' && matches((key as TSESTree.Identifier).name)) return true;
        if (key.type === 'Literal' && typeof (key as TSESTree.Literal).value === 'string') {
          if (matches((key as TSESTree.Literal).value as string)) return true;
        }
      }

      return false;
    }

    /**
     * The publishable-key vendors this file loads an SDK for. Computed at most
     * once per file, and only if something already looked like a credential —
     * seven tree walks are not worth doing for a file with no findings.
     */
    let loadedVendors: ReadonlySet<string> | null = null;
    function vendorsInFile(): ReadonlySet<string> {
      if (loadedVendors === null) {
        const found = new Set<string>();
        for (const { entry, loadsSdk } of VENDOR_PROBES) {
          if (loadsSdk(context.sourceCode.ast)) found.add(entry.vendor);
        }
        loadedVendors = found;
      }
      return loadedVendors;
    }

    /**
     * Is this value a key its vendor intends to publish?
     *
     * Two independent paths, and a veto in front of both — see the PUBLISHABLE
     * KEYS note at the top of this file.
     */
    function isPublishableKey(value: string, parent: TSESTree.Node): boolean {
      // Secret-side by value: no vendor context can exempt these.
      if (SECRET_SIDE_VALUE.test(value)) return false;
      if (isPublishableKeyValue(value)) return true;

      const slot = slotNameOf(parent);
      // Secret-side by name: `stripeSecretKey`, `bugsnagPrivateToken`.
      if (slot === '' || SECRET_SIDE_SLOT.test(slot)) return false;

      for (const { entry } of VENDOR_PROBES) {
        // The vendor is identified either by the slot naming it
        // (`bugsnagApiKey`, constants.ts:83) or by the file loading its SDK
        // (`const apiKey = …` in bin/update-bugsnag.js, which imports
        // `@bugsnag/source-maps` and `bugsnag-build-reporter`).
        if (!entry.named.test(slot) && !vendorsInFile().has(entry.vendor)) {
          continue;
        }
        if (entry.slots.test(slot)) return true;
      }
      return false;
    }

    /**
     * Check a string literal node
     */
    function checkStringLiteral(node: TSESTree.Literal, parent?: TSESTree.Node): void {
      if (typeof node.value !== 'string') {
        return;
      }

      const value = node.value;

      // Skip if in test files and allowed
      if (isTestFile) {
        return;
      }

      // Skip fallback in `process.env.X || 'value'` — the string is only
      // used when the env var is absent (dev-mode default). The real secret
      // lives in the environment, not the source file.
      if (
        parent?.type === 'LogicalExpression' &&
        (parent as TSESTree.LogicalExpression).operator === '||' &&
        (parent as TSESTree.LogicalExpression).right === node
      ) {
        const left = (parent as TSESTree.LogicalExpression).left;
        if (
          left.type === 'MemberExpression' &&
          left.object.type === 'MemberExpression' &&
          left.object.object.type === 'Identifier' &&
          left.object.object.name === 'process' &&
          left.object.property.type === 'Identifier' &&
          left.object.property.name === 'env'
        ) {
          return; // safe — fallback to process.env value
        }
      }

      // Skip if used as a UI label / HTML attribute value (form-field name,
      // type tag, ARIA label, i18n key) — these aren't credentials.
      if (isLabelContext(node, parent)) {
        return;
      }

      // Check if it looks like a credential
      const { isCredential, type, confidence } = looksLikeCredential(
        value,
        detectionOptions,
        compiledIgnorePatterns
      );

      // Ambiguous matches require a credential-named context to fire.
      // Without this gate the rule reports type literals, error class
      // names, and test prompts as credentials (vercel/ai had 807 such
      // FPs before the gate landed).
      let finalIsCredential = isCredential;
      let finalType = type;
      if (isCredential && confidence === 'ambiguous' && !isCredentialContext(node, parent)) {
        finalIsCredential = false;
      }

      // Self-evident placeholders are not secrets. Gated to non-structural
      // findings only: a JWT, an `sk_live_` key, or a DB connection string
      // keeps its shape whatever words it contains, so those still report.
      const isPlaceholder = allowPlaceholders && isPlaceholderValue(value, placeholderWordSet);
      if (isPlaceholder && confidence !== 'structural') {
        finalIsCredential = false;
      }

      // Context-positive: a *secret-shaped* string assigned to a
      // credential-named variable/property is a credential, even when no
      // structural pattern matches. Catches passwords like 'aaAA@123' that
      // don't fit any known key format but are clearly secrets.
      //
      // `isSecretShaped` is the load-bearing half of this condition. Without
      // it the rule fires on every string ≥ minLength that happens to sit in
      // a credential-named slot — which is how `errors: { password:
      // 'incorrectPassword' }` (an i18n error key, 5 of 10 corpus findings)
      // got reported at CVSS 9.8. The name says what the slot is for; the
      // shape says whether the value is a secret.
      //
      // The detection-disable options (detectApiKeys / detectPasswords /
      // detectTokens / detectDatabaseStrings) MUST gate this path too —
      // otherwise `{ detectPasswords: false }` silently fires on
      // `const password = "..."` because the var-name match alone
      // bypasses the option. Map the var name back to its category and
      // honour the option.
      if (!finalIsCredential &&
          !isPlaceholder &&
          !compiledIgnorePatterns.some((pattern) => pattern.test(value)) &&
          isSecretShaped(value, detectionOptions.minLength) &&
          isCredentialContext(node, parent)) {
        // isCredentialContext(node, parent) just returned true, which
        // requires a truthy parent.
        const ctxType = inferCredentialTypeFromContext(parent!);
        const optionAllows =
          (ctxType === 'password' && detectionOptions.detectPasswords) ||
          (ctxType === 'token' && detectionOptions.detectTokens) ||
          (ctxType === 'database' && detectionOptions.detectDatabaseStrings) ||
          (ctxType === 'apikey' && detectionOptions.detectApiKeys) ||
          ctxType === 'other'; // "other" credential names always honoured
        if (optionAllows) {
          finalIsCredential = true;
          finalType = type || 'Credential value';
        }
      }

      if (!finalIsCredential) {
        return;
      }

      // A key that must ship to a browser to work is not a secret. See the
      // PUBLISHABLE KEYS note above — this runs last, so the value has already
      // been judged credential-shaped and credential-named, and all this can
      // do is say "…and that is by design for this vendor".
      //
      // `parent` is optional on this signature but ESLint always sets it on a
      // Literal, so the assertion is honest and an unreachable guard would not
      // be — see the same call shape on `inferCredentialTypeFromContext`.
      if (isPublishableKey(value, parent!)) {
        return;
      }

      // Generate environment variable name suggestion
      let envVarName = 'API_KEY';
      if (parent && parent.type === 'Property' && parent.key.type === 'Identifier') {
        const keyName = parent.key.name;
        envVarName = keyName
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_');
      } else if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        const varName = parent.id.name;
        envVarName = varName
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_');
      }

      context.report({
        node,
        messageId: 'useEnvironmentVariable',
        data: {
          credentialType: finalType,
          envVarName,
        },
        suggest: [
          {
            messageId: 'useEnvironmentVariable',
            data: { envVarName, credentialType: finalType },
            fix: (fixer: TSESLint.RuleFixer) => {
              return fixer.replaceText(node, `process.env.${envVarName} || '${value}'`);
            },
          },
          {
            messageId: 'useSecretManager',
            data: { credentialType: finalType },
            fix: (fixer: TSESLint.RuleFixer) => {
              return fixer.replaceText(node, `await getSecret('${envVarName.toLowerCase()}')`);
            },
          },
        ],
      });
    }

    return {
      Literal(node: TSESTree.Literal) {
        checkStringLiteral(node, node.parent);
      },
      
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // Check template literal parts for credentials
        // Only check if there are no interpolations (static template literal)
        if (node.expressions.length === 0) {
          const fullText = node.quasis.map((q: TSESTree.TemplateElement) => q.value.raw).join('');
          const { isCredential, type, confidence } = looksLikeCredential(
            fullText,
            detectionOptions,
            compiledIgnorePatterns
          );

          // For template literals we don't have a Literal node to pass to
          // `isCredentialContext`. Skip ambiguous matches entirely — if the
          // user really has a credential in a template literal they should
          // use a regular string anyway.
          if (isCredential && !isTestFile && confidence === 'structural') {
            context.report({
              node,
              messageId: 'useEnvironmentVariable',
              data: {
                credentialType: type,
                envVarName: 'API_KEY',
              },
              suggest: [
                {
                  messageId: 'useEnvironmentVariable',
                  data: { envVarName: 'API_KEY', credentialType: type },
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(node, `process.env.API_KEY || \`${fullText}\``);
                  },
                },
                {
                  messageId: 'useSecretManager',
                  data: { credentialType: type },
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(node, `await getSecret('api_key')`);
                  },
                },
              ],
            });
          }
        } else {
          // For template literals with interpolations, check each quasi part
          for (const quasi of node.quasis) {
            if (quasi.value.raw) {
              const { isCredential, type, confidence } = looksLikeCredential(
                quasi.value.raw,
                detectionOptions,
                compiledIgnorePatterns
              );

              if (isCredential && !isTestFile && confidence === 'structural') {
                // Note: Template literals with interpolations are complex to fix automatically
                // So we report the error without suggestions
                context.report({
                  node: quasi,
                  messageId: 'useEnvironmentVariable',
                  data: {
                    credentialType: type,
                    envVarName: 'API_KEY',
                  },
                });
              }
            }
          }
        }
      },
    };
  },
});

