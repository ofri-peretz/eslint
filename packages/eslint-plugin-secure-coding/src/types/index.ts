/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-secure-coding Type Exports
 * 
 * Barrel file that exports all security rule Options types with consistent naming.
 */

// Injection Rules
import type { Options as NoGraphqlInjectionOptions } from '../rules/no-graphql-injection';
import type { Options as NoXxeInjectionOptions } from '../rules/no-xxe-injection';
import type { Options as NoXpathInjectionOptions } from '../rules/no-xpath-injection';
import type { Options as NoLdapInjectionOptions } from '../rules/no-ldap-injection';
import type { Options as NoDirectiveInjectionOptions } from '../rules/no-directive-injection';
import type { Options as NoFormatStringInjectionOptions } from '../rules/no-format-string-injection';

// Regex Rules
import type { Options as DetectNonLiteralRegexpOptions } from '../rules/detect-non-literal-regexp';
import type { Options as NoRedosVulnerableRegexOptions } from '../rules/no-redos-vulnerable-regex';
import type { Options as NoUnsafeRegexConstructionOptions } from '../rules/no-unsafe-regex-construction';

// Object & Prototype Rules
import type { Options as DetectObjectInjectionOptions } from '../rules/detect-object-injection';
import type { Options as NoUnsafeDeserializationOptions } from '../rules/no-unsafe-deserialization';

// Credentials Rules
import type { Options as NoHardcodedCredentialsOptions } from '../rules/no-hardcoded-credentials';
import type { Options as NoInsecureComparisonOptions } from '../rules/no-insecure-comparison';

// Input Validation Rules
import type { Options as NoImproperSanitizationOptions } from '../rules/no-improper-sanitization';
import type { Options as NoImproperTypeValidationOptions } from '../rules/no-improper-type-validation';

// Authentication & Authorization Rules
import type { Options as NoMissingAuthenticationOptions } from '../rules/no-missing-authentication';
import type { Options as NoPrivilegeEscalationOptions } from '../rules/no-privilege-escalation';
import type { Options as NoWeakPasswordRecoveryOptions } from '../rules/no-weak-password-recovery';

import type { Options as RequireBackendAuthorizationOptions } from '../rules/require-backend-authorization';

// Data Exposure Rules
import type { Options as NoSensitiveDataExposureOptions } from '../rules/no-sensitive-data-exposure';
import type { Options as NoPiiInLogsOptions } from '../rules/no-pii-in-logs';

// Resource & DoS Rules
import type { Options as NoUnlimitedResourceAllocationOptions } from '../rules/no-unlimited-resource-allocation';
import type { Options as NoUncheckedLoopConditionOptions } from '../rules/no-unchecked-loop-condition';

// Platform Specific Rules
import type { Options as NoElectronSecurityIssuesOptions } from '../rules/no-electron-security-issues';

// Export all types with consistent naming
export type {
  NoGraphqlInjectionOptions,
  NoXxeInjectionOptions,
  NoXpathInjectionOptions,
  NoLdapInjectionOptions,
  NoDirectiveInjectionOptions,
  NoFormatStringInjectionOptions,
  DetectNonLiteralRegexpOptions,
  NoRedosVulnerableRegexOptions,
  NoUnsafeRegexConstructionOptions,
  DetectObjectInjectionOptions,
  NoUnsafeDeserializationOptions,
  NoHardcodedCredentialsOptions,
  NoInsecureComparisonOptions,
  NoImproperSanitizationOptions,
  NoImproperTypeValidationOptions,
  NoMissingAuthenticationOptions,
  NoPrivilegeEscalationOptions,
  NoWeakPasswordRecoveryOptions,
  NoPiiInLogsOptions,
  RequireBackendAuthorizationOptions,
  NoSensitiveDataExposureOptions,
  NoUnlimitedResourceAllocationOptions,
  NoUncheckedLoopConditionOptions,
  NoElectronSecurityIssuesOptions,
};

/**
 * Combined type for all security rule options
 */
export type AllSecurityRulesOptions = {
  'no-graphql-injection'?: NoGraphqlInjectionOptions;
  'no-xxe-injection'?: NoXxeInjectionOptions;
  'no-xpath-injection'?: NoXpathInjectionOptions;
  'no-ldap-injection'?: NoLdapInjectionOptions;
  'no-directive-injection'?: NoDirectiveInjectionOptions;
  'no-format-string-injection'?: NoFormatStringInjectionOptions;
  'detect-non-literal-regexp'?: DetectNonLiteralRegexpOptions;
  'no-redos-vulnerable-regex'?: NoRedosVulnerableRegexOptions;
  'no-unsafe-regex-construction'?: NoUnsafeRegexConstructionOptions;
  'detect-object-injection'?: DetectObjectInjectionOptions;
  'no-unsafe-deserialization'?: NoUnsafeDeserializationOptions;
  'no-hardcoded-credentials'?: NoHardcodedCredentialsOptions;
  'no-insecure-comparison'?: NoInsecureComparisonOptions;
  'no-improper-sanitization'?: NoImproperSanitizationOptions;
  'no-improper-type-validation'?: NoImproperTypeValidationOptions;
  'no-missing-authentication'?: NoMissingAuthenticationOptions;
  'no-privilege-escalation'?: NoPrivilegeEscalationOptions;
  'no-weak-password-recovery'?: NoWeakPasswordRecoveryOptions;
  'no-pii-in-logs'?: NoPiiInLogsOptions;
  'require-backend-authorization'?: RequireBackendAuthorizationOptions;
  'no-sensitive-data-exposure'?: NoSensitiveDataExposureOptions;
  'no-unlimited-resource-allocation'?: NoUnlimitedResourceAllocationOptions;
  'no-unchecked-loop-condition'?: NoUncheckedLoopConditionOptions;
  'no-electron-security-issues'?: NoElectronSecurityIssuesOptions;
};
