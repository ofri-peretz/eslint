/**
 * Apples-to-apples matchups: which OF OUR RULES compete with which of theirs.
 *
 * Whole-plugin comparison is dishonest in both directions. SonarJS ships 279
 * rules, but the overwhelming majority are code smells and complexity checks —
 * counting those against our 164 security rules would understate us. Equally,
 * counting our full 164 against no-unsanitized's 2 DOM rules would overstate
 * us: those 2 rules do their one job well.
 *
 * So the unit of comparison is a JOB, not a package. Each entry below names a
 * concrete security/module-integrity capability, then lists the specific rules
 * on each side that address it. A reader can check any row by opening the two
 * rule docs.
 *
 * SCOPE: security + module integrity ONLY. We do not compete on code smells,
 * complexity, formatting, or style — SonarJS and others are broader there and
 * that is a fair thing for them to win.
 *
 * Curated by hand and dated. NOT keyword-matched: a regex over rule names
 * pulled in `no-useless-increment` (a smell) and 9 AWS-infrastructure rules
 * that have no counterpart in a lint-the-app-source plugin. Automation here
 * produces a plausible list that is wrong in ways nobody notices.
 */

export type Matchup = {
  /** The capability being compared — the actual unit of comparison. */
  job: string;
  /** Category: what we compete on. */
  category: 'security' | 'modules';
  /** Our rules addressing this job, as `plugin/rule`. */
  ours: string[];
  /** Their rules addressing the SAME job, as `npm-package:rule`. */
  theirs: string[];
  /**
   * Where they are genuinely equal or better. Required — a matchup list with
   * no such notes is a sales sheet, not a comparison.
   */
  note?: string;
};

export const MATCHUPS: Matchup[] = [
  // ── Secrets / credentials ────────────────────────────────────────────
  {
    job: 'Hardcoded secrets & credentials',
    category: 'security',
    ours: ['secure-coding/no-hardcoded-credentials', 'secure-coding/no-hardcoded-session-tokens'],
    theirs: [
      'eslint-plugin-no-secrets:no-secrets',
      'eslint-plugin-sonarjs:no-hardcoded-passwords',
      'eslint-plugin-sonarjs:no-hardcoded-secrets',
    ],
    note: 'no-secrets uses entropy scanning, catching high-entropy strings our AST '
      + 'approach misses — at a high false-positive cost (379 findings on vercel-ai, '
      + 'none actionable).',
  },

  // ── Injection ────────────────────────────────────────────────────────
  {
    job: 'Command / shell injection',
    category: 'security',
    ours: ['node-security/detect-child-process', 'node-security/no-shell-injection'],
    theirs: [
      'eslint-plugin-security:detect-child-process',
      'eslint-plugin-security-node:detect-child-process',
      'eslint-plugin-sonarjs:os-command',
    ],
  },
  {
    job: 'Code injection (eval, dynamic require, vm)',
    category: 'security',
    ours: [
      'node-security/detect-eval-with-expression',
      'node-security/no-unsafe-dynamic-require',
      'browser-security/no-eval',
    ],
    theirs: [
      'eslint-plugin-security:detect-eval-with-expression',
      'eslint-plugin-security:detect-non-literal-require',
      'eslint-plugin-security-node:detect-runinthiscontext-method-in-nodes-vm',
      'eslint-plugin-sonarjs:code-eval',
    ],
  },
  {
    job: 'SQL / NoSQL injection',
    category: 'security',
    ours: ['secure-coding/no-graphql-injection', 'secure-coding/no-ldap-injection'],
    theirs: [
      'eslint-plugin-security-node:detect-sql-injection',
      'eslint-plugin-security-node:detect-nosql-injection',
      'eslint-plugin-sonarjs:sql-queries',
    ],
    note: 'security-node covers raw SQL/NoSQL string building, which our SQL story '
      + 'handles in the driver-specific plugins (pg, mongodb-security) excluded from '
      + 'this SDK-agnostic comparison.',
  },
  {
    job: 'Path traversal / non-literal fs access',
    category: 'security',
    ours: [
      'node-security/detect-non-literal-fs-filename',
      'node-security/no-arbitrary-file-access',
      'node-security/no-zip-slip',
    ],
    theirs: ['eslint-plugin-security:detect-non-literal-fs-filename'],
    note: 'eslint-plugin-security flags any non-literal fs path — higher recall, far '
      + 'more false positives on legitimate dynamic paths.',
  },
  {
    job: 'Object injection / prototype pollution',
    category: 'security',
    ours: ['secure-coding/detect-object-injection'],
    theirs: [
      'eslint-plugin-security:detect-object-injection',
      'eslint-plugin-sonarjs:no-angular-bypass-sanitization',
    ],
    note: 'Both flag bracket-notation writes; eslint-plugin-security is notoriously '
      + 'noisy on this rule and most teams disable it.',
  },

  // ── Browser / DOM ────────────────────────────────────────────────────
  {
    job: 'DOM XSS sinks (innerHTML and friends)',
    category: 'security',
    ours: [
      'browser-security/no-innerhtml',
      'browser-security/no-websocket-innerhtml',
      'browser-security/no-filereader-innerhtml',
    ],
    theirs: [
      'eslint-plugin-no-unsanitized:method',
      'eslint-plugin-no-unsanitized:property',
      '@microsoft/eslint-plugin-sdl:no-inner-html',
      '@microsoft/eslint-plugin-sdl:no-document-write',
    ],
    note: "Mozilla's no-unsanitized is only 2 rules but is the most precise DOM sink "
      + 'detector available — the reference implementation for this job.',
  },
  {
    job: 'postMessage origin validation',
    category: 'security',
    ours: [
      'browser-security/no-postmessage-wildcard-origin',
      'browser-security/require-postmessage-origin-check',
      'browser-security/no-postmessage-innerhtml',
    ],
    theirs: ['@microsoft/eslint-plugin-sdl:no-postmessage-star-origin'],
  },
  {
    job: 'Cookie security & token storage',
    category: 'security',
    ours: [
      'browser-security/require-cookie-secure-attrs',
      'browser-security/no-cookie-auth-tokens',
      'browser-security/no-jwt-in-storage',
    ],
    theirs: [
      '@microsoft/eslint-plugin-sdl:no-cookies',
      'eslint-plugin-sonarjs:insecure-cookie',
      'eslint-plugin-sonarjs:cookie-no-httponly',
      'eslint-plugin-security-node:detect-security-missconfiguration-cookie',
    ],
  },
  {
    job: 'CSP / mixed content / clickjacking',
    category: 'security',
    ours: [
      'browser-security/no-unsafe-inline-csp',
      'browser-security/no-unsafe-eval-csp',
      'browser-security/detect-mixed-content',
      'browser-security/no-clickjacking',
    ],
    theirs: ['eslint-plugin-sonarjs:no-referrer-policy', '@microsoft/eslint-plugin-sdl:no-insecure-url'],
    note: 'Closest available; no community plugin implements CSP directive linting.',
  },

  // ── Crypto ───────────────────────────────────────────────────────────
  {
    job: 'Weak crypto: ciphers, hashing, key derivation',
    category: 'security',
    ours: [
      'node-security/no-weak-cipher-algorithm',
      'node-security/no-weak-hash-algorithm',
      'node-security/no-sha1-hash',
      'node-security/no-ecb-mode',
      'node-security/no-insecure-key-derivation',
      'node-security/no-static-iv',
    ],
    theirs: ['eslint-plugin-sonarjs:no-weak-cipher', 'eslint-plugin-sonarjs:hashing', 'eslint-plugin-sonarjs:encryption-secure-mode'],
  },
  {
    job: 'Insecure randomness',
    category: 'security',
    ours: ['node-security/no-math-random-crypto', 'node-security/no-cryptojs-weak-random'],
    theirs: [
      'eslint-plugin-security:detect-pseudoRandomBytes',
      'eslint-plugin-sonarjs:pseudo-random',
      'eslint-plugin-security-node:detect-insecure-randomness',
      '@microsoft/eslint-plugin-sdl:no-insecure-random',
    ],
  },
  {
    job: 'Timing-attack-unsafe comparison',
    category: 'security',
    ours: ['node-security/no-timing-unsafe-compare', 'secure-coding/no-insecure-comparison'],
    theirs: [
      'eslint-plugin-security:detect-possible-timing-attacks',
      'eslint-plugin-security-node:detect-possible-timing-attacks',
    ],
  },
  {
    job: 'TLS / certificate validation',
    category: 'security',
    ours: ['node-security/no-self-signed-certs', 'node-security/no-insecure-rsa-padding'],
    theirs: [
      'eslint-plugin-security-node:detect-option-rejectunauthorized-in-nodejs-httpsrequest',
      'eslint-plugin-security-node:disable-ssl-across-node-server',
      'eslint-plugin-sonarjs:unverified-certificate',
      'eslint-plugin-sonarjs:weak-ssl',
    ],
  },

  // ── ReDoS ────────────────────────────────────────────────────────────
  {
    job: 'ReDoS / catastrophic backtracking',
    category: 'security',
    ours: [
      'secure-coding/no-redos-vulnerable-regex',
      'secure-coding/detect-non-literal-regexp',
      'secure-coding/no-unsafe-regex-construction',
    ],
    theirs: [
      'eslint-plugin-security:detect-unsafe-regex',
      'eslint-plugin-security:detect-non-literal-regexp',
      'eslint-plugin-sonarjs:slow-regex',
      'eslint-plugin-regexp:no-super-linear-backtracking',
    ],
    note: 'eslint-plugin-regexp is the strongest here — full automaton analysis across '
      + '82 regex rules. We target the ReDoS subset only.',
  },

  // ── Module integrity ─────────────────────────────────────────────────
  {
    job: 'Circular dependencies',
    category: 'modules',
    ours: ['import-next/no-cycle'],
    theirs: ['eslint-plugin-import:no-cycle'],
    note: 'Same job; the incumbent has ~30M weekly downloads and far more '
      + 'battle-testing across exotic resolver setups.',
  },
  {
    job: 'Unresolved / invalid imports',
    category: 'modules',
    ours: ['import-next/no-unresolved', 'import-next/named'],
    theirs: ['eslint-plugin-import:no-unresolved', 'eslint-plugin-import:named'],
  },
  {
    job: 'Dependency integrity & supply chain',
    category: 'modules',
    ours: [
      'node-security/detect-suspicious-dependencies',
      'node-security/require-dependency-integrity',
      'node-security/lock-file',
    ],
    theirs: [],
    note: 'No community ESLint plugin lints lockfile integrity or dependency '
      + 'provenance; this is genuinely uncontested rather than a win.',
  },
];

/** Jobs we cover with no comparable community rule. Claimed conservatively. */
export const UNCONTESTED: { job: string; ours: string[]; why: string }[] = [
  {
    job: 'CSP directive linting',
    ours: ['browser-security/no-unsafe-inline-csp', 'browser-security/no-unsafe-eval-csp'],
    why: 'No community ESLint plugin parses CSP directives.',
  },
  {
    job: 'Browser storage hygiene for secrets',
    ours: [
      'browser-security/no-jwt-in-storage',
      'browser-security/no-sensitive-localstorage',
      'browser-security/no-sensitive-indexeddb',
    ],
    why: 'Microsoft SDL has no-cookies but nothing for localStorage/IndexedDB tokens.',
  },
];
