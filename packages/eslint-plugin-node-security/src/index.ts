/**
 * eslint-plugin-node-security
 *
 * Security rules for Node.js built-in modules (fs, child_process, vm, path, etc.)
 */

import { detectChildProcess } from './rules/detect-child-process';
import { detectEvalWithExpression } from './rules/detect-eval-with-expression';
import { detectNonLiteralFsFilename } from './rules/detect-non-literal-fs-filename';
import { noUnsafeDynamicRequire } from './rules/no-unsafe-dynamic-require';
import { noBufferOverread } from './rules/no-buffer-overread';
import { noDeprecatedBuffer } from './rules/no-deprecated-buffer';
import { noUnsafeBufferAlloc } from './rules/no-unsafe-buffer-alloc';
import { noToctouVulnerability } from './rules/no-toctou-vulnerability';
import { noZipSlip } from './rules/no-zip-slip';
import { noArbitraryFileAccess } from './rules/no-arbitrary-file-access';
import { noDataInTempStorage } from './rules/no-data-in-temp-storage';
import { noSsrf } from './rules/no-ssrf';
import { noShellInjection } from './rules/no-shell-injection';
import { noDynamicCommandString } from './rules/no-dynamic-command-string';
import { noEnvInjection } from './rules/no-env-injection';
import { noDynamicAlgorithmSelection } from './rules/no-dynamic-algorithm-selection';

// Migrated rules from secure-coding
import { detectSuspiciousDependencies } from './rules/detect-suspicious-dependencies';
import { lockFile } from './rules/lock-file';
import { noDynamicDependencyLoading } from './rules/no-dynamic-dependency-loading';
import { requireDependencyIntegrity } from './rules/require-dependency-integrity';
import { requireSecureCredentialStorage } from './rules/require-secure-credential-storage';
import { requireSecureDeletion } from './rules/require-secure-deletion';
import { requireStorageEncryption } from './rules/require-storage-encryption';
import { noDynamicRequire } from './rules/no-dynamic-require';

// Migrated rules from crypto
import { noCryptojs } from './rules/no-cryptojs';
import { noCryptojsWeakRandom } from './rules/no-cryptojs-weak-random';
import { noDeprecatedCipherMethod } from './rules/no-deprecated-cipher-method';
import { noEcbMode } from './rules/no-ecb-mode';
import { noInsecureKeyDerivation } from './rules/no-insecure-key-derivation';
import { noMathRandomCrypto } from './rules/no-math-random-crypto';
import { noInsecureRsaPadding } from './rules/no-insecure-rsa-padding';
import { noSelfSignedCerts } from './rules/no-self-signed-certs';
import { noSha1Hash } from './rules/no-sha1-hash';
import { noStaticIv } from './rules/no-static-iv';
import { noTimingUnsafeCompare } from './rules/no-timing-unsafe-compare';
import { noWeakCipherAlgorithm } from './rules/no-weak-cipher-algorithm';
import { noWeakHashAlgorithm } from './rules/no-weak-hash-algorithm';
import { preferNativeCrypto } from './rules/prefer-native-crypto';
import { requireAeadTagVerification } from './rules/require-aead-tag-verification';

// Protocol-level rules
import { noUnboundedDecompression } from './rules/no-unbounded-decompression';
import { noInsecureHttpParser } from './rules/no-insecure-http-parser';
import { requireStreamErrorHandler } from './rules/require-stream-error-handler';

import { TSESLint, withCanonicalDocsUrls } from '@interlace/eslint-devkit';

export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  'detect-child-process': detectChildProcess,
  'detect-eval-with-expression': detectEvalWithExpression,
  'detect-non-literal-fs-filename': detectNonLiteralFsFilename,
  'no-unsafe-dynamic-require': noUnsafeDynamicRequire,
  'no-buffer-overread': noBufferOverread,
  'no-deprecated-buffer': noDeprecatedBuffer,
  'no-unsafe-buffer-alloc': noUnsafeBufferAlloc,
  'no-toctou-vulnerability': noToctouVulnerability,
  'no-zip-slip': noZipSlip,
  'no-arbitrary-file-access': noArbitraryFileAccess,
  'no-data-in-temp-storage': noDataInTempStorage,
  'no-ssrf': noSsrf,
  'no-shell-injection': noShellInjection,
  'no-dynamic-command-string': noDynamicCommandString,
  'no-env-injection': noEnvInjection,
  'no-dynamic-algorithm-selection': noDynamicAlgorithmSelection,

  // Migrated rules
  'detect-suspicious-dependencies': detectSuspiciousDependencies,
  'lock-file': lockFile,
  'no-dynamic-dependency-loading': noDynamicDependencyLoading,
  'require-dependency-integrity': requireDependencyIntegrity,
  'require-secure-credential-storage': requireSecureCredentialStorage,
  'require-secure-deletion': requireSecureDeletion,
  'require-storage-encryption': requireStorageEncryption,
  'no-dynamic-require': noDynamicRequire,

  // Migrated crypto rules
  'no-cryptojs': noCryptojs,
  'no-cryptojs-weak-random': noCryptojsWeakRandom,
  'no-deprecated-cipher-method': noDeprecatedCipherMethod,
  'no-ecb-mode': noEcbMode,
  'no-insecure-key-derivation': noInsecureKeyDerivation,
  'no-insecure-rsa-padding': noInsecureRsaPadding,
  'no-math-random-crypto': noMathRandomCrypto,
  'no-self-signed-certs': noSelfSignedCerts,
  'no-sha1-hash': noSha1Hash,
  'no-static-iv': noStaticIv,
  'no-timing-unsafe-compare': noTimingUnsafeCompare,
  'no-weak-cipher-algorithm': noWeakCipherAlgorithm,
  'no-weak-hash-algorithm': noWeakHashAlgorithm,
  'prefer-native-crypto': preferNativeCrypto,
  'require-aead-tag-verification': requireAeadTagVerification,

  // Protocol-level rules
  'no-unbounded-decompression': noUnboundedDecompression,
  'no-insecure-http-parser': noInsecureHttpParser,
  'require-stream-error-handler': requireStreamErrorHandler,
};

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-node-security', rules);

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-node-security',
    version: '4.12.0',
  },
  rules,
};

const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  'node-security/detect-child-process': 'error',
  'node-security/detect-eval-with-expression': 'error',
  // Demoted 2026-08-05, in the same change that widened its detection. The
  // rule used to gate on the receiver being literally `fs`, so a named import
  // from `node:fs/promises`, a renamed default, a namespace import and
  // `fs.promises.*` were all silently unchecked. Resolving the binding is the
  // correct fix, but it multiplies findings: measured on this repo, 854 (555
  // outside test files) where the old gate saw a fraction of that. The rule
  // has no notion of a trust boundary, so a build script reading its own repo
  // reports identically to a request handler reading user input. Shipping
  // that at 'error' would break every adopter's CI on a minor.
  // Promote back to 'error' once W6's corpus run measures the FP profile.
  'node-security/detect-non-literal-fs-filename': 'warn',
  'node-security/no-unsafe-dynamic-require': 'error',
  // no-buffer-overread demoted 2026-05-09 — 95% of Wild hits on adversarial
  // Edge corpus + insufficient fixture coverage for the README §1 promotion
  // gate. Per `npm run ilb:severity-audit` it's both edge-error AND
  // volume-error risk. Promote back to 'error' once Edge ratio drops to
  // ≤ 50% (see `benchmarks/AUDIT_PATTERNS.md` §3.6 — needs typed-array
  // detection like `detect-object-injection` got in audit iter-1).
  'node-security/no-buffer-overread': 'warn',
  // Added in 4.1.0. Set to 'warn' in `recommended` to avoid breaking
  // adopters who already use the preset and have legacy `Buffer()` calls.
  // Promote to 'error' on the next major bump.
  'node-security/no-deprecated-buffer': 'error',
  // Added in 4.5.0. Unconditional flag on `Buffer.allocUnsafe()` — a real but
  // legitimate performance API — so it ships as 'warn', not 'error'. The rule
  // does no dataflow, so a correctly-overwritten buffer still reports.
  // Upstream `security-node/detect-buffer-unsafe-allocation` ships this off by
  // default; 'warn' is the middle ground.
  'node-security/no-unsafe-buffer-alloc': 'warn',
  'node-security/no-toctou-vulnerability': 'error',
  'node-security/no-zip-slip': 'error',
  'node-security/no-arbitrary-file-access': 'error',
  'node-security/no-data-in-temp-storage': 'error',
  'node-security/no-ssrf': 'warn',
  'node-security/no-shell-injection': 'error',
  'node-security/no-dynamic-command-string': 'error',
  // Added 2026-08-12 with the rule. Judges the KEY of a `process.env[…]` write
  // by tracing it to the request, so the allowlist pattern
  // (`ALLOWED[req.body.setting]`) — the documented fix — stays silent. Enters
  // at 'error' because a request-named environment variable is a direct
  // PATH/NODE_OPTIONS/LD_PRELOAD overwrite, and the shape has no legitimate
  // form: nothing in a request should choose which env var is written.
  'node-security/no-env-injection': 'error',
  'node-security/no-dynamic-algorithm-selection': 'error',
  // Added to `recommended` 2026-08-02. `secure-coding/no-insecure-comparison`
  // was removed from every `secure-coding` preset in favour of this rule, but
  // this rule was not in any `recommended` preset — so CWE-697 timing-unsafe
  // comparison had no preset coverage anywhere in the ecosystem, and the
  // migration note pointed at a rule users would have had to enable by hand.
  // Enters at 'warn' rather than 'error' for the same reason as
  // `no-deprecated-buffer` above: adopters already on this preset shouldn't
  // have CI turn red on a version bump. Promote on the next major.
  'node-security/no-timing-unsafe-compare': 'warn',

  // Migrated Rules
  'node-security/detect-suspicious-dependencies': 'warn',

  // NOTE: `lock-file` is intentionally NOT in `recommended` (removed
  // 2026-08-12). It is not a statement about any line of code — it asserts one
  // project-level fact ("this repo commits no lock file"), and ESLint has no
  // way to say that. Every report therefore lands on line 1 of whichever
  // source file the linter happened to reach, which is not a place the reader
  // can act and not a place a suppression comment belongs.
  //
  // The dedup that keeps it to one report per project is a module-scope `Set`
  // that outlives the per-file rule context, so WHICH file carries the finding
  // depends on traversal order — it moves between runs, between shards, and
  // under `--cache`. A finding whose location is nondeterministic cannot be
  // baselined or code-reviewed.
  //
  // Measured over the 8-repo corpus it fired 3 times. One
  // (Shopify/cli `packages/app/src/cli/.../hooks/usePollAppLogs.ts:1`) was an
  // outright defect: the ancestor walk stopped after ten levels and never
  // reached the `pnpm-lock.yaml` at the repo root — fixed in this change, so
  // the rule no longer lies. The other two (auth0/express-openid-connect,
  // paypal/paypal-checkout-components) are published libraries that
  // deliberately do not commit a lock file, which is the normal convention for
  // a library: the lock file governs the app that installs it, not the package.
  // Reporting that as CWE-829 at HIGH tells a correct project it is wrong.
  //
  // The rule stays exported and opt-in-able for teams that DO require a
  // committed lock file. For most projects the honest enforcement point is CI
  // (`npm ci` fails without one) or a repo policy check — not a per-file lint
  // pass, which is what the previous `warn` entry's own comment already said.
  'node-security/require-dependency-integrity': 'error',

  // Crypto rules in recommended
  'node-security/no-weak-hash-algorithm': 'error',
  'node-security/no-weak-cipher-algorithm': 'error',
  'node-security/no-static-iv': 'error',
  'node-security/no-ecb-mode': 'error',
  'node-security/no-math-random-crypto': 'error',
  'node-security/no-cryptojs': 'error',

  // Added to `recommended` 2026-08-09. `rejectUnauthorized: false` accepts any
  // certificate, including a MITM's self-signed one, and is the most-cited
  // Node TLS mistake there is — yet ILB-CWE-Corpus scored CWE-295 as a miss
  // for the ecosystem. The rule was never the problem: it fires on the
  // fixture exactly as intended, it simply was not in any preset, so nobody
  // running `recommended` ever had it on.
  //
  // Measured before promoting, over the 13-repo wild corpus (~1,900 files of
  // real Express and NestJS code): **0 findings**. Pure recall, no FP cost.
  //
  // PARTITION NOTE — updated 2026-08-13, and currently UNRESOLVED.
  //
  // This entry used to say that `browser-security/no-disabled-certificate-validation`
  // was deliberately kept out of that plugin's preset so `rejectUnauthorized:
  // false` had exactly one owner. That is no longer true: the rule was promoted
  // into `browser-security`'s `recommended` on 2026-08-13 because it is the
  // only rule that reads a no-op `checkServerIdentity`, which the CWE-295
  // corpus fixture needs. A consumer on both presets therefore now gets two
  // reports for one `rejectUnauthorized: false`.
  //
  // Measured cost today is zero: neither rule fires on the 8-repo real-code
  // corpus, and the CWE corpus scores CWE-295 at TP=2 FP=0. So this is a latent
  // duplicate rather than an observed one, left in place rather than fixed
  // blind at the end of a sweep.
  //
  // The clean resolution, for whoever picks this up: give
  // `browser-security/no-disabled-certificate-validation` the
  // `checkServerIdentity` half only and leave `rejectUnauthorized` /
  // `strictSSL` / `verify` here, since those are Node TLS options with no
  // browser equivalent. That costs `rejectUnauthorized` coverage for anyone
  // installing browser-security alone — the same package-boundary trade already
  // documented for `no-insecure-comparison` in secure-coding — and it must be
  // written down in both plugins' READMEs if taken.
  'node-security/no-self-signed-certs': 'error',

  // Added 2026-08-12 with the rules themselves. All three closed a corpus miss
  // where NO rule in the ecosystem owned the shape (ILB-CWE-Corpus scored
  // CWE-327 AEAD misuse, CWE-409 and CWE-444 as 0/N for Interlace), and each
  // predicate is anchored on an API whose only meaning is the defect:
  //
  //  - `require-aead-tag-verification` reports a `createDecipheriv` with a
  //    literal AEAD algorithm whose local never calls `setAuthTag`, or calls it
  //    and never `final()`. Any escape of the decipher (passed to `pipeline`,
  //    returned, computed member access) bails rather than guesses.
  //  - `no-unbounded-decompression` reports zlib's buffer-at-once
  //    decompressors with no `maxOutputLength`. The streaming factories stay
  //    with `secure-coding/no-unlimited-resource-allocation` so one site has
  //    exactly one owner.
  //  - `no-insecure-http-parser` reports a literal `insecureHTTPParser: true`.
  //    The option name is Node-specific and has one meaning.
  //
  // Measured over the 8-repo false-positive corpus before promotion: 0
  // findings each.
  'node-security/require-aead-tag-verification': 'error',
  'node-security/no-unbounded-decompression': 'error',
  'node-security/no-insecure-http-parser': 'error',

  // Added 2026-08-13. CWE-248 was scored 2/2 before this sweep, but the
  // detector was `detect-non-literal-fs-filename` firing on the non-literal
  // path inside each fixture — it hit all FOUR fixtures, so it also produced
  // 2 false positives and scored BAS 0. Inverting that rule to a taint model
  // correctly removed all four, and left a labelled vulnerability class with
  // no owner. This rule reads what the fixtures are actually about: `.pipe()`
  // forwards data but not errors, so a stream that emits `'error'` with no
  // listener is an uncaught exception and the process exits.
  //
  // The predicate is provable rather than heuristic — a stream constructed
  // INLINE in the pipe expression has no name, so no listener can ever have
  // been attached to it — plus a named stream whose binding is a stream
  // constructor and which never appears with an `'error'` listener in the
  // file. `pipeline()` is never reported: it is the recommended fix.
  // Measured over the 8-repo false-positive corpus before promotion: 0 findings.
  'node-security/require-stream-error-handler': 'error',
};

export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  recommended: {
    plugins: {
      'node-security': plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,
  strict: {
    plugins: {
      'node-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map((ruleName) => [
        `node-security/${ruleName}`,
        'error',
      ]),
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

export default plugin;
