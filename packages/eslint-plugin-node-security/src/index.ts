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

