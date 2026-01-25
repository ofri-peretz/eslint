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
import { noToctouVulnerability } from './rules/no-toctou-vulnerability';
import { noZipSlip } from './rules/no-zip-slip';
import { noArbitraryFileAccess } from './rules/no-arbitrary-file-access';
import { noDataInTempStorage } from './rules/no-data-in-temp-storage';

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
import { noInsecureRsaPadding } from './rules/no-insecure-rsa-padding';
import { noSelfSignedCerts } from './rules/no-self-signed-certs';
import { noSha1Hash } from './rules/no-sha1-hash';
import { noStaticIv } from './rules/no-static-iv';
import { noTimingUnsafeCompare } from './rules/no-timing-unsafe-compare';
import { noWeakCipherAlgorithm } from './rules/no-weak-cipher-algorithm';
import { noWeakHashAlgorithm } from './rules/no-weak-hash-algorithm';
import { preferNativeCrypto } from './rules/prefer-native-crypto';

import { TSESLint } from '@interlace/eslint-devkit';

export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'detect-child-process': detectChildProcess,
  'detect-eval-with-expression': detectEvalWithExpression,
  'detect-non-literal-fs-filename': detectNonLiteralFsFilename,
  'no-unsafe-dynamic-require': noUnsafeDynamicRequire,
  'no-buffer-overread': noBufferOverread,
  'no-toctou-vulnerability': noToctouVulnerability,
  'no-zip-slip': noZipSlip,
  'no-arbitrary-file-access': noArbitraryFileAccess,
  'no-data-in-temp-storage': noDataInTempStorage,

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
    version: '1.0.0',
  },
  rules,
};

const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  'node-security/detect-child-process': 'error',
  'node-security/detect-eval-with-expression': 'error',
  'node-security/detect-non-literal-fs-filename': 'error',
  'node-security/no-unsafe-dynamic-require': 'error',
  'node-security/no-buffer-overread': 'error',
  'node-security/no-toctou-vulnerability': 'error',
  'node-security/no-zip-slip': 'error',
  'node-security/no-arbitrary-file-access': 'error',
  'node-security/no-data-in-temp-storage': 'error',

  // Migrated Rules
  'node-security/detect-suspicious-dependencies': 'warn',
  'node-security/lock-file': 'error',
  'node-security/require-dependency-integrity': 'error',

  // Crypto rules in recommended
  'node-security/no-weak-hash-algorithm': 'error',
  'node-security/no-weak-cipher-algorithm': 'error',
  'node-security/no-static-iv': 'error',
  'node-security/no-ecb-mode': 'error',
  'node-security/no-cryptojs': 'warn',
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
      Object.keys(rules).map(ruleName => [`node-security/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,
};


export default plugin;

