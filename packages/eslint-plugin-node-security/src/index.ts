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

import { TSESLint } from '@interlace/eslint-devkit';

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
};

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-node-security',
    version: '4.7.1',
  },
  rules,
};

const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  'node-security/detect-child-process': 'error',
  'node-security/detect-eval-with-expression': 'error',
  'node-security/detect-non-literal-fs-filename': 'error',
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
  'node-security/lock-file': 'warn', // filesystem check — not pure AST; CI enforces this better
  'node-security/require-dependency-integrity': 'error',

  // Crypto rules in recommended
  'node-security/no-weak-hash-algorithm': 'error',
  'node-security/no-weak-cipher-algorithm': 'error',
  'node-security/no-static-iv': 'error',
  'node-security/no-ecb-mode': 'error',
  'node-security/no-math-random-crypto': 'error',
  'node-security/no-cryptojs': 'error',
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
