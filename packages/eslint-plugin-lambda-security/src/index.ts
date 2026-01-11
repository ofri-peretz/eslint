/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-lambda-security
 * Security-focused ESLint rules for AWS Lambda and Middy applications
 *
 * Detects insecure API Gateway responses, missing security headers,
 * CORS misconfigurations, input validation issues, authorization gaps,
 * SSRF vulnerabilities, and more.
 *
 * OWASP Serverless Top 10 Coverage:
 * - SAS-1: Injection ✅ (no-unvalidated-event-body)
 * - SAS-2: Broken Authentication ✅ (no-hardcoded-credentials-sdk)
 * - SAS-3: Sensitive Data Exposure ✅ (no-env-logging, no-secrets-in-env)
 * - SAS-4: Security Misconfiguration ✅ (no-permissive-cors-*)
 * - SAS-5: Broken Access Control ✅ (no-missing-authorization-check, no-overly-permissive-iam-policy)
 * - SAS-6: Insufficient Logging ✅ (no-error-swallowing)
 * - SAS-7: Denial of Service ✅ (require-timeout-handling, no-unbounded-batch-processing)
 * - SAS-8: Server-Side Request Forgery ✅ (no-user-controlled-requests)
 * - SAS-9: Functions Misconfiguration ✅ (no-exposed-error-details)
 * - SAS-10: Improper Crypto ➡️ (Use eslint-plugin-crypto)
 */

// Original P0 Critical Rules
import { noHardcodedCredentialsSdk } from './rules/no-hardcoded-credentials-sdk';
import { noPermissiveCorsResponse } from './rules/no-permissive-cors-response';
import { noPermissiveCorsMidly } from './rules/no-permissive-cors-middy';
import { noSecretsInEnv } from './rules/no-secrets-in-env';
import { noEnvLogging } from './rules/no-env-logging';

// SAS-1: Injection
import { noUnvalidatedEventBody } from './rules/no-unvalidated-event-body';

// SAS-5: Broken Access Control
import { noMissingAuthorizationCheck } from './rules/no-missing-authorization-check';
import { noOverlyPermissiveIamPolicy } from './rules/no-overly-permissive-iam-policy';

// SAS-6: Insufficient Logging
import { noErrorSwallowing } from './rules/no-error-swallowing';

// SAS-7: Denial of Service
import { requireTimeoutHandling } from './rules/require-timeout-handling';
import { noUnboundedBatchProcessing } from './rules/no-unbounded-batch-processing';

// SAS-8: Server-Side Request Forgery
import { noUserControlledRequests } from './rules/no-user-controlled-requests';

// SAS-9: Functions Misconfiguration
import { noExposedErrorDetails } from './rules/no-exposed-error-details';

const rules = {
  // Original rules
  'no-hardcoded-credentials-sdk': noHardcodedCredentialsSdk,
  'no-permissive-cors-response': noPermissiveCorsResponse,
  'no-permissive-cors-middy': noPermissiveCorsMidly,
  'no-secrets-in-env': noSecretsInEnv,
  'no-env-logging': noEnvLogging,

  // SAS-1: Injection
  'no-unvalidated-event-body': noUnvalidatedEventBody,

  // SAS-5: Broken Access Control
  'no-missing-authorization-check': noMissingAuthorizationCheck,
  'no-overly-permissive-iam-policy': noOverlyPermissiveIamPolicy,

  // SAS-6: Insufficient Logging
  'no-error-swallowing': noErrorSwallowing,

  // SAS-7: Denial of Service
  'require-timeout-handling': requireTimeoutHandling,
  'no-unbounded-batch-processing': noUnboundedBatchProcessing,

  // SAS-8: SSRF
  'no-user-controlled-requests': noUserControlledRequests,

  // SAS-9: Functions Misconfiguration
  'no-exposed-error-details': noExposedErrorDetails,
};

const configs = {
  recommended: {
    name: 'lambda-security/recommended',
    plugins: {
      'lambda-security': { rules },
    },
    rules: {
      // Critical: Always error
      'lambda-security/no-hardcoded-credentials-sdk': 'error',
      'lambda-security/no-permissive-cors-response': 'error',
      'lambda-security/no-permissive-cors-middy': 'error',
      'lambda-security/no-secrets-in-env': 'error',
      'lambda-security/no-user-controlled-requests': 'error',
      'lambda-security/no-overly-permissive-iam-policy': 'error',

      // High: Warn in recommended
      'lambda-security/no-unvalidated-event-body': 'warn',
      'lambda-security/no-missing-authorization-check': 'warn',
      'lambda-security/no-exposed-error-details': 'warn',

      // Medium: Warn in recommended
      'lambda-security/no-env-logging': 'warn',
      'lambda-security/no-error-swallowing': 'warn',
      'lambda-security/require-timeout-handling': 'warn',
      'lambda-security/no-unbounded-batch-processing': 'warn',
    },
  },
  strict: {
    name: 'lambda-security/strict',
    plugins: {
      'lambda-security': { rules },
    },
    rules: {
      // All rules as errors in strict mode
      'lambda-security/no-hardcoded-credentials-sdk': 'error',
      'lambda-security/no-permissive-cors-response': 'error',
      'lambda-security/no-permissive-cors-middy': 'error',
      'lambda-security/no-secrets-in-env': 'error',
      'lambda-security/no-env-logging': 'error',
      'lambda-security/no-unvalidated-event-body': 'error',
      'lambda-security/no-missing-authorization-check': 'error',
      'lambda-security/no-overly-permissive-iam-policy': 'error',
      'lambda-security/no-error-swallowing': 'error',
      'lambda-security/require-timeout-handling': 'error',
      'lambda-security/no-unbounded-batch-processing': 'error',
      'lambda-security/no-user-controlled-requests': 'error',
      'lambda-security/no-exposed-error-details': 'error',
    },
  },
};

export = {
  rules,
  configs,
  meta: {
    name: 'eslint-plugin-lambda-security',
    version: '1.1.0',
  },
};
