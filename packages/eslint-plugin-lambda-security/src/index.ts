/**
 * eslint-plugin-lambda-security
 * Security-focused ESLint rules for AWS Lambda and Middy applications
 *
 * Detects insecure API Gateway responses, missing security headers,
 * CORS misconfigurations, input validation issues, and more.
 */

// P0 Critical Rules
import { noHardcodedCredentialsSdk } from './rules/no-hardcoded-credentials-sdk';
import { noPermissiveCorsResponse } from './rules/no-permissive-cors-response';
import { noPermissiveCorsMidly } from './rules/no-permissive-cors-middy';
import { noSecretsInEnv } from './rules/no-secrets-in-env';
import { noEnvLogging } from './rules/no-env-logging';

const rules = {
  'no-hardcoded-credentials-sdk': noHardcodedCredentialsSdk,
  'no-permissive-cors-response': noPermissiveCorsResponse,
  'no-permissive-cors-middy': noPermissiveCorsMidly,
  'no-secrets-in-env': noSecretsInEnv,
  'no-env-logging': noEnvLogging,
};

const configs = {
  recommended: {
    name: 'lambda-security/recommended',
    plugins: {
      'lambda-security': { rules },
    },
    rules: {
      'lambda-security/no-hardcoded-credentials-sdk': 'error',
      'lambda-security/no-permissive-cors-response': 'error',
      'lambda-security/no-permissive-cors-middy': 'error',
      'lambda-security/no-secrets-in-env': 'error',
      'lambda-security/no-env-logging': 'warn',
    },
  },
  strict: {
    name: 'lambda-security/strict',
    plugins: {
      'lambda-security': { rules },
    },
    rules: {
      'lambda-security/no-hardcoded-credentials-sdk': 'error',
      'lambda-security/no-permissive-cors-response': 'error',
      'lambda-security/no-permissive-cors-middy': 'error',
      'lambda-security/no-secrets-in-env': 'error',
      'lambda-security/no-env-logging': 'error',
    },
  },
};

export = {
  rules,
  configs,
  meta: {
    name: 'eslint-plugin-lambda-security',
    version: '0.0.1',
  },
};
