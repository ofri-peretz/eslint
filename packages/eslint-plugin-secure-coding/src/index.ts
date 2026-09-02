/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-secure-coding
 *
 * A comprehensive security-focused ESLint plugin restricted to "pure coding security rules"
 * (logic, AST patterns, and generic vulnerabilities independent of environment).
 *
 * Rules focus on:
 * - Language-level logic flaws
 * - AST pattern risks
 * - Generic injection patterns
 * - Cryptographic logic (logic level)
 *
 * @see https://github.com/ofri-peretz/eslint#readme
 */

// Security rules - Injection
import { noGraphqlInjection } from './rules/no-graphql-injection';
import { noBidiCharacters } from './rules/no-bidi-characters';
import { noXxeInjection } from './rules/no-xxe-injection';
import { noXpathInjection } from './rules/no-xpath-injection';
import { noLdapInjection } from './rules/no-ldap-injection';
import { noDirectiveInjection } from './rules/no-directive-injection';
import { noFormatStringInjection } from './rules/no-format-string-injection';
import { noTemplateInjection } from './rules/no-template-injection';
import { noSqlInjection } from './rules/no-sql-injection';
import { noLogInjection } from './rules/no-log-injection';

// Security rules - Fail-safe behaviour
import { noFailOpenAuth } from './rules/no-fail-open-auth';

// Security rules - Source-text deception
import { noHomoglyphIdentifiers } from './rules/no-homoglyph-identifiers';

// Security rules - Regex
import { detectNonLiteralRegexp } from './rules/detect-non-literal-regexp';
import { noRedosVulnerableRegex } from './rules/no-redos-vulnerable-regex';
import { noUnsafeRegexConstruction } from './rules/no-unsafe-regex-construction';

// Security rules - Object & Prototype
import { detectObjectInjection } from './rules/detect-object-injection';
import { noUnsafeDeserialization } from './rules/no-unsafe-deserialization';

// Security rules - Credentials & Crypto
import { noHardcodedCredentials } from './rules/no-hardcoded-credentials';
import { noInsecureComparison } from './rules/no-insecure-comparison';

// Security rules - Input Validation
import { noImproperSanitization } from './rules/no-improper-sanitization';
import { noImproperTypeValidation } from './rules/no-improper-type-validation';

// Security rules - Authentication & Authorization
import { noMissingAuthentication } from './rules/no-missing-authentication';
import { noPrivilegeEscalation } from './rules/no-privilege-escalation';
import { noWeakPasswordRecovery } from './rules/no-weak-password-recovery';
import { requireBackendAuthorization } from './rules/require-backend-authorization';

// Security rules - Data Exposure
import { noSensitiveDataExposure } from './rules/no-sensitive-data-exposure';
import { noPiiInLogs } from './rules/no-pii-in-logs';

// Security rules - Resource & DoS
import { noUnlimitedResourceAllocation } from './rules/no-unlimited-resource-allocation';
import { noUncheckedLoopCondition } from './rules/no-unchecked-loop-condition';

// Security rules - Auth & runtime hardening (wired 2026-05-09 — implementations existed but were unregistered)
import { detectWeakPasswordValidation } from './rules/detect-weak-password-validation';
import { noElectronSecurityIssues } from './rules/no-electron-security-issues';
import { noHardcodedSessionTokens } from './rules/no-hardcoded-session-tokens';
import { requireSecureDefaults } from './rules/require-secure-defaults';

import { TSESLint, withCanonicalDocsUrls } from '@interlace/eslint-devkit';

/**
 * Collection of all core security ESLint rules
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // Fundamental Injection (6 rules)
  'no-graphql-injection': noGraphqlInjection,
  'no-xxe-injection': noXxeInjection,
  'no-xpath-injection': noXpathInjection,
  'no-ldap-injection': noLdapInjection,
  'no-directive-injection': noDirectiveInjection,
  'no-format-string-injection': noFormatStringInjection,
  'no-template-injection': noTemplateInjection,
  // Driver-agnostic CWE-89. Owns `db.query('SELECT … ' + req.params.id)` in
  // files importing no SQL driver — the complement of the driver-scoped rules'
  // gate, so exactly one rule reports any query site.
  'no-sql-injection': noSqlInjection,
  // CWE-117 — untrusted text concatenated into a log LINE (not a field).
  'no-log-injection': noLogInjection,

  // Fail-safe behaviour (1 rule)
  //
  // An unhandled stream `'error'` is CWE-248 and was briefly a rule here too,
  // but `.pipe()` is a Node API and this plugin is environment-agnostic by
  // contract — the scope lock rejects a `node` rule in it. `node-security`'s
  // `require-stream-error-handler` owns those sites and scores CWE-248 2/2, so
  // a second rule here would only have double-reported them.
  'no-fail-open-auth': noFailOpenAuth,

  // Source-text deception (1 rule)
  'no-homoglyph-identifiers': noHomoglyphIdentifiers,

  // Regex Safety & Stability (3 rules)
  'detect-non-literal-regexp': detectNonLiteralRegexp,
  'no-redos-vulnerable-regex': noRedosVulnerableRegex,
  'no-unsafe-regex-construction': noUnsafeRegexConstruction,

  // Data & Logic Integrity (5 rules)
  'detect-object-injection': detectObjectInjection,
  'no-unsafe-deserialization': noUnsafeDeserialization,
  'no-insecure-comparison': noInsecureComparison,
  'no-improper-sanitization': noImproperSanitization,
  'no-improper-type-validation': noImproperTypeValidation,

  // Auth/Access Logic (4 rules)
  'no-missing-authentication': noMissingAuthentication,
  'no-privilege-escalation': noPrivilegeEscalation,
  'no-weak-password-recovery': noWeakPasswordRecovery,
  'require-backend-authorization': requireBackendAuthorization,

  // Secrets & Exposure (3 rules)
  'no-hardcoded-credentials': noHardcodedCredentials,
  'no-sensitive-data-exposure': noSensitiveDataExposure,
  'no-pii-in-logs': noPiiInLogs,

  // Resource Handling (2 rules)
  'no-unlimited-resource-allocation': noUnlimitedResourceAllocation,
  'no-unchecked-loop-condition': noUncheckedLoopCondition,

  // Auth & runtime hardening (4 rules — wired 2026-05-09)
  'detect-weak-password-validation': detectWeakPasswordValidation,
  'no-electron-security-issues': noElectronSecurityIssues,
  'no-hardcoded-session-tokens': noHardcodedSessionTokens,
  'require-secure-defaults': requireSecureDefaults,
  'no-bidi-characters': noBidiCharacters,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-secure-coding', rules);

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-secure-coding',
    version: '5.3.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for security rules
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // Critical - Injection vulnerabilities
  // no-graphql-injection demoted to 'warn' 2026-05-09 — `npm run ilb:severity-audit`
  // showed 61% of Wild hits on adversarial Edge code. Fails the README §1
  // ≥ 95% precision floor for `error`-tier severity.
  'secure-coding/no-graphql-injection': 'warn',
  'secure-coding/no-xxe-injection': 'error',
  'secure-coding/no-xpath-injection': 'error',
  'secure-coding/no-ldap-injection': 'error',

  // Critical - SQL injection in a file with no SQL driver in it.
  //
  // Measured before promotion, on the same 8-repo corpus of published code
  // (okta ×2, auth0, stripe, twilio, ioredis, paypal, shopify) used to demote
  // `detect-non-literal-regexp` and `detect-object-injection`: **0 findings**.
  // That zero is not vacuous — those repos hold 23 `.query(` / `.execute(`
  // call sites between them. None builds a SQL *statement* out of a value the
  // rule can attribute to an inbound request, which is the whole contract.
  'secure-coding/no-sql-injection': 'error',

  // High - Log injection (CWE-117). Measured on the same 8-repo corpus before
  // promotion: **0 findings**. It reports only when untrusted text is
  // concatenated into a log *line*; a structured field and a sanitiser call
  // both break attribution, which is what keeps it silent on published code.
  'secure-coding/no-log-injection': 'error',

  // High - Failing open (CWE-636). Measured before promotion: **0 findings**,
  // in a corpus of two Okta SDKs and an Auth0 middleware — i.e. the exact
  // codebases most full of `try { … } catch {}`. Requiring a security-decision
  // call inside the `try` is what separates a swallowed auth check from the
  // hundreds of ordinary swallowed errors around it.
  'secure-coding/no-fail-open-auth': 'error',

  // NOTE: `no-unhandled-stream-error` (CWE-248) is intentionally NOT in
  // `recommended`. It is written and tested, and it is correct — measured on
  // the pinned corpus it reports once, a true positive
  // (`dstImage.pack().pipe(fs.createWriteStream(…))` at
  // okta-signin-widget/vrtUtil/ImageDiff.js:63, no listener on either stream).
  //
  // It is out of the preset because **`node-security/require-stream-error-handler`
  // already owns this site** and ships in that plugin's `recommended`. Two
  // rules reporting one `.pipe()` is the duplicate-finding class #478 was
  // opened to close, and the corpus agrees on who owns it:
  // `benchmarks/corpus/CWE-248/manifest.json` declares
  // `expectedPlugins: ["eslint-plugin-node-security"]`.
  //
  // The rule's whole discriminator is `fs.createReadStream` / `createWriteStream`,
  // so it is a Node-platform rule sitting in the runtime-agnostic plugin —
  // it can never fire for a consumer who installs this package for a browser
  // bundle. Kept exported and opt-in-able rather than deleted, so the coverage
  // survives if the node-security rule is ever withdrawn.

  // Medium - Homoglyph / invisible characters (CWE-1007). Measured before
  // promotion: **0 findings**, including across the i18n bundles in the corpus
  // — visible non-ASCII script text is never reported, only zero-width and
  // bidi-control codepoints and mixed-script identifiers.
  'secure-coding/no-homoglyph-identifiers': 'error',

  // Critical - Deserialization
  // Demoted 2026-05-09 — 76% Edge ratio.
  'secure-coding/no-unsafe-deserialization': 'warn',

  // High - Regex vulnerabilities
  // NOTE: `detect-non-literal-regexp` is intentionally NOT in `recommended`
  // (removed 2026-08-12). Measured over an 8-repo corpus of published code
  // (okta, auth0, stripe, twilio, ioredis, paypal, shopify) it fired 49 times.
  // Fixing two outright defects took that to 34: it was reporting regex
  // *literals* — in a rule whose name is "non-literal" — and it treated every
  // built pattern as attacker-controlled, including `'\\{' + i + '\\}'` over a
  // loop counter and `` `${SUPPORTED_EXTS.join('|')}$` `` over a module constant.
  //
  // The 34 that remain are patterns whose provenance the rule cannot resolve:
  // a function parameter named `pattern`, a `route` from the app's own route
  // table, minified library internals. "I could not prove this is safe" is not
  // a finding — for a library whose API accepts a pattern, it is a description
  // of the API.
  //
  // The decisive number is that the one genuine true positive in that output —
  // `new RegExp(item.value.pattern, item.value.flags)` over a remotely-supplied
  // schema — is already reported at `error` by
  // `secure-coding/no-unsafe-regex-construction`, which attributes the taint
  // rather than guessing. So this rule contributed 33 non-findings and zero
  // unique findings. The two now partition cleanly: the `error` rule reports
  // what it can attribute, and this one reports the rest — which is only worth
  // hearing if you asked for it.
  //
  // Kept exported and opt-in-able for teams that want the paranoid sweep and
  // will triage it.
  //
  // `no-redos-vulnerable-regex` — RESTORED 2026-08-20, having been removed on
  // 2026-08-18 as "roughly 28.6% precision, against a 95% bar".
  //
  // That 28.6% was the INSTRUMENT. The classification came from
  // `scripts/redos-classify.mts`, a hand-rolled attack generator that pumped
  // inputs and timed them: 0 exponential, 6 polynomial, 15 "unreproduced" — and
  // the 15 unreproduced were counted against the rule. Failing to reproduce
  // catastrophic backtracking by guessing at attack strings is not evidence that
  // a pattern is safe; it is evidence that the generator did not find the input.
  //
  // The rule now consults `recheck`, a third-party automaton analysis, and may
  // only ever REMOVE a finding it disproves. Measured 2026-08-20 over the same
  // 20-repository corpus, the oracle's verdict on what the rule reports:
  //
  //   vulnerable    100   84.0%
  //   safe            2    1.7%
  //   unknown         1    0.8%
  //   (16 excerpts too short to extract a literal from)
  //
  // 100 of the 103 patterns that could be extracted cleanly are confirmed
  // vulnerable by an analysis we did not write, and the two "safe" are artefacts
  // of the extractor rather than rule output.
  //
  // What that measurement does NOT establish, stated plainly because the
  // demotion's real argument lives here: the rule consults the same oracle
  // before reporting, so the oracle agreeing afterwards is close to guaranteed.
  // It is strong evidence of CORRECTNESS and none at all of ACTIONABILITY — the
  // 2026-08-18 note observed that the genuine findings are polynomial and need a
  // 20,000-character input to bite, and `effectiveFp` remains unmet in this
  // rule's seal record. A consumer who considers a polynomial ReDoS not worth
  // fixing should turn it off; that is a different judgement from the one the
  // removal was made on, and it was never measured.
  //
  // It is restored because the stated reason for removing it is refuted, the
  // corpus manifest names this plugin as the owner of CWE-1333, and the recall
  // gate has been red since — the ecosystem shipping no ReDoS coverage while
  // eslint-plugin-sonarjs detects all three corpus fixtures.
  'secure-coding/no-redos-vulnerable-regex': 'error',

  'secure-coding/no-unsafe-regex-construction': 'error',

  // Critical - Credentials
  'secure-coding/no-hardcoded-credentials': 'error',

  // NOTE: `no-unchecked-loop-condition` is intentionally NOT in `recommended`
  // (removed 2026-08-09). Measured over express + axios + sequelize it fired
  // 39 times and 38 of them were bounded loops: 24 `for (const x of coll)`,
  // 7 classic `for (i = 0; i < len; i++)`, 6 `for (const k in obj)`. The one
  // structurally-unbounded hit (`for (;;)` in axios trackStream) breaks out on
  // stream end, so it is not a DoS either.
  //
  // Iterating a collection is not a CWE-400 finding, and the rule cannot tell
  // a bounded loop from an unbounded one — which is the whole job. A precise
  // version would flag only `while (true)` / `for (;;)` with no reachable
  // exit, and that is an unreachable-code correctness check, not a security
  // rule; core and `unicorn` already cover that ground.
  //
  // Kept exported and opt-in-able for teams that want to sweep for runaway
  // loops and will triage the output.

  // NOTE: `detect-object-injection` is intentionally NOT in `recommended`
  // (removed 2026-08-04). Measured over express + axios + sequelize it fired
  // 535 times — 85% of everything `recommended` reported on those three
  // repos (632 total). 528 of the 535 had no taint indicator anywhere on the
  // line: `this.dataValues[attrName]`, `where[field] = insertValues[field]`,
  // `Axios.prototype[method]`. Ordinary internal object manipulation.
  //
  // This is a design limit, not a tuning gap. The rule flags every computed
  // key that does not match one of its hand-maintained "safe" heuristics, so
  // the default answer on real code is "report". Making it precise needs the
  // opposite contract — report only when the key is reachable from a taint
  // source — which is dataflow analysis the rule does not do, and which its
  // own fixtures contradict (`obj[config.key]` is asserted as a violation,
  // and that is exactly the axios false positive).
  //
  // The rule stays exported and documented for teams that want the paranoid
  // sweep and will triage it. It is not something to hand a new consumer as a
  // default: at this precision it does not protect anyone, it just teaches
  // them to disable the plugin.

  // NOTE: `no-insecure-comparison` is intentionally NOT in `recommended`
  // (removed 2026-07-31). It is `deprecated` in favour of
  // `node-security/no-timing-unsafe-compare`, and what it actually reports on
  // ordinary code is every `==` / `!=` — 876 findings on a 1,470-file corpus
  // (webpack, lodash, eslint-plugin-import, two NestJS boilerplates), 100% of
  // them already covered by core `eqeqeq`. Re-reporting another rule's
  // findings under a CWE-697 security banner is noise, not signal, and no
  // narrowing fixes that: the loose-equality half of this rule is a style
  // check wearing a security hat.
  //
  // The timing-attack half (a secret compared with `===`) is the part worth
  // keeping, and `node-security/no-timing-unsafe-compare` is where it lives —
  // in that plugin's `recommended` preset since 2026-08-02, so consumers on
  // presets keep CWE-697 coverage. It does mean the coverage now lives in a
  // different package: a project that installs only `eslint-plugin-secure-coding`
  // needs `eslint-plugin-node-security` as well to keep it.
  // The rule remains exported and available via `strict` / explicit opt-in.

  // Critical - Template injection
  'secure-coding/no-template-injection': 'error',

  // Critical - Data integrity
  'secure-coding/no-improper-sanitization': 'error',

  // High - Logic
  // NOTE: no-missing-authentication and require-backend-authorization are deprecated in
  // secure-coding — they assume Express route handler context and belong in express-security.
  // Kept in the rules registry for backwards compat; removed from flagship config.
  'secure-coding/no-privilege-escalation': 'warn',
  'secure-coding/no-weak-password-recovery': 'warn', // naming heuristic — demoted

  // High - Exposure
  'secure-coding/no-sensitive-data-exposure': 'warn',

  // Medium - Resource & DoS
  // Demoted 2026-05-09 — both rules fail the volume-error-risk gate
  // (firing ≥ 100 times on Wild without sufficient fixture coverage to
  // guarantee precision). Rules were also flagged for ≥ 76% Edge ratio.
  'secure-coding/no-unlimited-resource-allocation': 'warn',
};

export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Flagship preset — the two rules from this plugin in the ecosystem-wide
   * flagship list (`.agent/flagship-rules.md`). Use this when you want the
   * highest-signal security subset shippable in CI gates without the noise
   * of `recommended`.
   */
  flagship: {
    plugins: {
      'secure-coding': plugin,
    },
    rules: {
      'secure-coding/no-hardcoded-credentials': 'error',
      // Restored 2026-08-20. It left flagship and `recommended` on 2026-08-18 on
      // a measurement of ~28.6% precision, and that measurement was the
      // instrument, not the rule — see the note on `recommendedRules`.
      'secure-coding/no-redos-vulnerable-regex': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Recommended security configuration
   *
   * Enables all core security rules with sensible severity levels.
   */
  recommended: {
    plugins: {
      'secure-coding': plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Recommended-strict configuration
   *
   * Same rule set as `recommended` but every rule is promoted to `'error'`.
   * Use this when you want CI to block on all security findings rather than
   * only warning on lower-confidence rules.
   *
   * This is the configuration independently chosen by production teams who
   * audit `recommended` and decide they want zero tolerance on all 16 rules.
   */
  'recommended-strict': {
    plugins: {
      'secure-coding': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(recommendedRules).map((rule) => [rule, 'error']),
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict security configuration
   *
   * ALL rules (including experimental and opinionated ones) set to 'error'.
   * Prefer `recommended-strict` unless you specifically need full coverage.
   */
  strict: {
    plugins: {
      'secure-coding': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map((ruleName) => [
        `secure-coding/${ruleName}`,
        'error',
      ]),
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * OWASP Top 10 focused configuration
   *
   * Rules mapped to OWASP Top 10 2021 categories.
   */
  'owasp-top-10': {
    plugins: {
      'secure-coding': plugin,
    },
    rules: {
      // A01:2021 – Broken Access Control
      // no-missing-authentication removed: Express-specific, use express-security plugin instead
      'secure-coding/no-privilege-escalation': 'warn',

      // A02:2021 – Cryptographic Failures
      'secure-coding/no-hardcoded-credentials': 'error',
      // Demoted from 'error': naming-heuristic detection (fires on variable names
      // that sound sensitive). Cannot be enforcement-grade per I3 invariant.
      'secure-coding/no-sensitive-data-exposure': 'warn',

      // A03:2021 – Injection
      'secure-coding/no-graphql-injection': 'error',
      'secure-coding/no-xxe-injection': 'error',
      'secure-coding/no-xpath-injection': 'error',
      'secure-coding/no-ldap-injection': 'error',

      // A04:2021 – Insecure Design
      'secure-coding/no-weak-password-recovery': 'error',
      // no-improper-type-validation removed for the same reason as
      // no-insecure-comparison below: its loose-equality arm re-reports `eqeqeq`
      // under a security banner. Measured 2026-08-22 over 78 KLOC of well-maintained
      // repositories, that arm was 126 findings — including
      // `typeof x == 'object' && x !== null`, the correct null-safe idiom. It cannot
      // be narrowed structurally: separating `req.body.otp == storedOtp` from
      // `config.port != 636` requires knowing where the value came from, and this
      // plugin does not do data-flow.
      //
      // `owasp-top-10` is enabled deliberately, for compliance, by exactly the
      // security-literate maintainers least willing to forgive noise. The rule keeps
      // its place in `strict`, where breadth is the contract, and its structural
      // arms remain available via `checkLooseEquality: false`.

      // A07:2021 – Identification and Authentication Failures
      // no-insecure-comparison removed for the same reason as in
      // `recommended`: it re-reports `eqeqeq` under a security banner. Use
      // `node-security/no-timing-unsafe-compare` for the timing-attack half.

      // A08:2021 – Software and Data Integrity Failures
      'secure-coding/no-unsafe-deserialization': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

/**
 * Re-export all types from the types barrel
 */
export type { AllSecurityRulesOptions } from './types/index';
