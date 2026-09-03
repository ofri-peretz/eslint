/**
 * eslint-plugin-node-security Type Exports
 * 
 * Barrel file that exports all Node.js security rule Options types.
 */

import type { Options as DetectChildProcessOptions } from '../rules/detect-child-process';
import type { Options as DetectEvalWithExpressionOptions } from '../rules/detect-eval-with-expression';
import type { Options as DetectNonLiteralFsFilenameOptions } from '../rules/detect-non-literal-fs-filename';
import type { Options as NoUnsafeDynamicRequireOptions } from '../rules/no-unsafe-dynamic-require';
import type { Options as NoBufferOverreadOptions } from '../rules/no-buffer-overread';
import type { Options as NoToctouVulnerabilityOptions } from '../rules/no-toctou-vulnerability';
import type { Options as NoZipSlipOptions } from '../rules/no-zip-slip';
import type { Options as NoArbitraryFileAccessOptions } from '../rules/no-arbitrary-file-access';

export type {
  DetectChildProcessOptions,
  DetectEvalWithExpressionOptions,
  DetectNonLiteralFsFilenameOptions,
  NoUnsafeDynamicRequireOptions,
  NoBufferOverreadOptions,
  NoToctouVulnerabilityOptions,
  NoZipSlipOptions,
  NoArbitraryFileAccessOptions,
};

export type AllNodeSecurityRulesOptions = {
  'detect-child-process'?: DetectChildProcessOptions;
  'detect-eval-with-expression'?: DetectEvalWithExpressionOptions;
  'detect-non-literal-fs-filename'?: DetectNonLiteralFsFilenameOptions;
  'no-unsafe-dynamic-require'?: NoUnsafeDynamicRequireOptions;
  'no-buffer-overread'?: NoBufferOverreadOptions;
  'no-toctou-vulnerability'?: NoToctouVulnerabilityOptions;
  'no-zip-slip'?: NoZipSlipOptions;
  'no-arbitrary-file-access'?: NoArbitraryFileAccessOptions;
};
