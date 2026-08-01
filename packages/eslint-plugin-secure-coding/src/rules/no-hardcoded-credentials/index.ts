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
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'useEnvironmentVariable' | 'useSecretManager' | 'strategyEnv' | 'strategyConfig' | 'strategyVault' | 'strategyAuto';

export interface Options {
  /** Patterns to ignore (regex strings). Default: [] */
  ignorePatterns?: string[];

  /** Allow credentials in test files. Default: false */
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

  /** Strategy for fixing hardcoded credentials: 'env', 'config', 'vault', 'auto' */
  strategy?: 'env' | 'config' | 'vault' | 'auto';
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
 * `aaAA@123` → false  (symbols + digits)
 * `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` → false (digits)
 */
export function isNaturalWordString(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z_\-. ]*$/.test(value)) return false;
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
  ignorePatterns: RegExp[]
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
      strategyEnv: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Environment Variable Strategy',
        description: 'Move credentials to environment variables',
        severity: 'MEDIUM',
        fix: 'Store credentials in environment variables (process.env)',
        documentationLink: 'https://12factor.net/config',
      }),
      strategyConfig: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Configuration File Strategy',
        description: 'Store credentials in encrypted configuration files',
        severity: 'MEDIUM',
        fix: 'Use encrypted configuration files with proper access controls',
        documentationLink: 'https://owasp.org/www-project-cheat-sheets/cheatsheets/Configuration_Management_Cheat_Sheet.html',
      }),
      strategyVault: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Secret Vault Strategy',
        cwe: 'CWE-798',
        description: 'Use dedicated secret management system',
        severity: 'HIGH',
        fix: 'Implement HashiCorp Vault, AWS Secrets Manager, or similar secret vault',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
      strategyAuto: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Context-Aware Strategy',
        description: 'Apply context-aware credential management',
        severity: 'MEDIUM',
        fix: 'Choose strategy based on deployment environment and security requirements',
        documentationLink: 'https://owasp.org/www-project-cheat-sheets/cheatsheets/Secrets_Management_Cheat_Sheet.html',
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
            default: false,
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
          strategy: {
            type: 'string',
            enum: ['env', 'config', 'vault', 'auto'],
            default: 'auto',
            description: 'Strategy for fixing hardcoded credentials (auto = smart detection)'
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignorePatterns: [],
      allowInTests: false,
      minLength: 8,
      detectApiKeys: true,
      detectPasswords: true,
      detectTokens: true,
      detectDatabaseStrings: true,
      customPatterns: [],
      strategy: 'auto',
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      ignorePatterns = [],
      allowInTests = false,
      minLength = 8,
      detectApiKeys = true,
      detectPasswords = true,
      detectTokens = true,
      detectDatabaseStrings = true,
      customPatterns = [],
    }: Options = options;

    const filename = context.filename;
    const isTestFile = allowInTests && (
      filename.includes('.test.') ||
      filename.includes('.spec.') ||
      filename.includes('.fixture.') ||
      filename.includes('.mock.') ||
      filename.includes('__tests__') ||
      filename.includes('__mocks__') ||
      filename.includes('/test/') ||
      filename.includes('/tests/') ||
      filename.includes('/fixtures/') ||
      filename.includes('/mocks/')
    );

    // Compile ignore patterns to regex
    const compiledIgnorePatterns = ignorePatterns.map((pattern: string) => new RegExp(pattern));

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
      const name = (() => {
        if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
          return (parent.id as TSESTree.Identifier).name.toLowerCase();
        }
        if (parent.type === 'Property') {
          const key = (parent as TSESTree.Property).key;
          if (key.type === 'Identifier') return (key as TSESTree.Identifier).name.toLowerCase();
          // isCredentialContext's own Property check only returns true for
          // an Identifier key (handled above) or a string-Literal key, so
          // whatever remains here is always the latter.
          return String((key as TSESTree.Literal).value).toLowerCase();
        }
        if (parent.type === 'AssignmentExpression') {
          const left = (parent as TSESTree.AssignmentExpression).left;
          if (left.type === 'MemberExpression' && left.property.type === 'Identifier') {
            return (left.property as TSESTree.Identifier).name.toLowerCase();
          }
        }
        return '';
      })();
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

