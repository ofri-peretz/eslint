/**
 * Constants and mappings for LLM message formatting
 *
 * Contains all static data, severity mappings, CWE definitions, and icon constants
 */

import type {
  Severity,
  OWASP2025Category,
  OWASP2021Category,
  OWASPCategory,
  ComplianceFramework,
} from './types';

// ============================================================================
// SEVERITY TYPES & CVSS MAPPING (NIST Standard)
// ============================================================================

/**
 * CVSS 3.1 Score mapping per NIST guidelines
 * @see https://nvd.nist.gov/vuln-metrics/cvss
 */
export const CVSS_RANGES: Record<
  Severity,
  { min: number; max: number; label: string }
> = {
  CRITICAL: { min: 9.0, max: 10.0, label: '9.0-10.0' },
  HIGH: { min: 7.0, max: 8.9, label: '7.0-8.9' },
  MEDIUM: { min: 4.0, max: 6.9, label: '4.0-6.9' },
  LOW: { min: 0.1, max: 3.9, label: '0.1-3.9' },
  INFO: { min: 0.0, max: 0.0, label: '0.0' },
};

/**
 * Convert severity to representative CVSS score
 */
export function severityToCVSS(severity: Severity): number {
  const range = CVSS_RANGES[severity];
  return Number(((range.min + range.max) / 2).toFixed(1));
}

// ============================================================================
// OWASP TOP 10 2025 CATEGORIES (NEW - Released November 2025)
// ============================================================================

/**
 * OWASP Top 10 2025 Categories (Latest)
 * @see https://owasp.org/Top10/2025/
 *
 * Key changes from 2021:
 * - A03: NEW "Software Supply Chain Failures" (consolidates A06:2021 + A08:2021)
 * - A10: NEW "Mishandling of Exceptional Conditions" (replaces SSRF)
 * - Categories reordered based on 2025 threat landscape
 */

/**
 * OWASP 2025 category details (PRIMARY)
 *
 * NOTE: OWASP Top 10 2025 URLs use a projected format. If links are broken,
 * the system falls back to equivalent 2021 categories via OWASP_2021_TO_2025 mapping.
 * Monitor https://owasp.org/Top10/ for official 2025 release URLs.
 */
export const OWASP_2025_DETAILS: Record<
  OWASP2025Category,
  { name: string; description: string; link: string; fallbackLink?: string }
> = {
  'A01:2025': {
    name: 'Broken Access Control',
    description:
      'Access control enforces policy such that users cannot act outside their intended permissions',
    link: 'https://owasp.org/Top10/A01_2021-Broken_Access_Control/', // Using confirmed 2021 URL
    fallbackLink: 'https://owasp.org/Top10/A01_2021-Broken_Access_Control/',
  },
  'A02:2025': {
    name: 'Security Misconfiguration',
    description:
      'Missing security hardening, improperly configured permissions, default credentials',
    link: 'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/', // Using confirmed 2021 URL
    fallbackLink: 'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
  },
  'A03:2025': {
    name: 'Software Supply Chain Failures',
    description:
      'Vulnerabilities in dependencies, malicious packages, compromised CI/CD pipelines',
    link: 'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/', // Using 2021 equivalent
    fallbackLink:
      'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/',
  },
  'A04:2025': {
    name: 'Cryptographic Failures',
    description:
      'Failures related to cryptography leading to sensitive data exposure',
    link: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/', // Using confirmed 2021 URL
    fallbackLink: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
  },
  'A05:2025': {
    name: 'Injection',
    description:
      'User-supplied data not validated, filtered, or sanitized by the application',
    link: 'https://owasp.org/Top10/A03_2021-Injection/', // Using confirmed 2021 URL
    fallbackLink: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
  'A06:2025': {
    name: 'Insecure Design',
    description:
      'Missing or ineffective control design, distinct from implementation flaws',
    link: 'https://owasp.org/Top10/A04_2021-Insecure_Design/', // Using confirmed 2021 URL
    fallbackLink: 'https://owasp.org/Top10/A04_2021-Insecure_Design/',
  },
  'A07:2025': {
    name: 'Authentication Failures',
    description:
      'User identity, authentication, and session management weaknesses',
    link: 'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/', // Using confirmed 2021 URL
    fallbackLink:
      'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
  },
  'A08:2025': {
    name: 'Software or Data Integrity Failures',
    description:
      'Code and infrastructure that does not protect against integrity violations',
    link: 'https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/', // Using confirmed 2021 URL
    fallbackLink:
      'https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/',
  },
  'A09:2025': {
    name: 'Logging & Alerting Failures',
    description:
      'Insufficient logging, detection, monitoring, and active response',
    link: 'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/', // Using confirmed 2021 URL
    fallbackLink:
      'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/',
  },
  'A10:2025': {
    name: 'Mishandling of Exceptional Conditions',
    description:
      'Improper error handling, uncaught exceptions, information leakage via errors',
    link: 'https://owasp.org/Top10/A03_2021-Injection/', // No direct 2021 equivalent, using closest category
    fallbackLink: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
};

/**
 * OWASP 2021 category details (legacy support)
 */
export const OWASP_2021_DETAILS: Record<
  OWASP2021Category,
  { name: string; description: string; link: string }
> = {
  'A01:2021': {
    name: 'Broken Access Control',
    description:
      'Access control enforces policy such that users cannot act outside of their intended permissions',
    link: 'https://owasp.org/Top10/A01_2021-Broken_Access_Control/',
  },
  'A02:2021': {
    name: 'Cryptographic Failures',
    description:
      'Failures related to cryptography that lead to sensitive data exposure',
    link: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
  },
  'A03:2021': {
    name: 'Injection',
    description:
      'User-supplied data is not validated, filtered, or sanitized by the application',
    link: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
  'A04:2021': {
    name: 'Insecure Design',
    description:
      'Missing or ineffective control design, distinct from implementation flaws',
    link: 'https://owasp.org/Top10/A04_2021-Insecure_Design/',
  },
  'A05:2021': {
    name: 'Security Misconfiguration',
    description:
      'Missing security hardening or improperly configured permissions',
    link: 'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
  },
  'A06:2021': {
    name: 'Vulnerable Components',
    description:
      'Components with known vulnerabilities that may undermine defenses',
    link: 'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/',
  },
  'A07:2021': {
    name: 'Auth Failures',
    description:
      'Confirmation of user identity, authentication, and session management weaknesses',
    link: 'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
  },
  'A08:2021': {
    name: 'Data Integrity Failures',
    description:
      'Code and infrastructure that does not protect against integrity violations',
    link: 'https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/',
  },
  'A09:2021': {
    name: 'Logging Failures',
    description:
      'Insufficient logging, detection, monitoring, and active response',
    link: 'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/',
  },
  'A10:2021': {
    name: 'SSRF',
    description:
      'Server-Side Request Forgery occurs when fetching a remote resource without validating URL',
    link: 'https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/',
  },
};

/**
 * Combined OWASP details (2025 + 2021)
 */
export const OWASP_DETAILS: Record<
  OWASPCategory,
  { name: string; description: string; link: string }
> = {
  ...OWASP_2025_DETAILS,
  ...OWASP_2021_DETAILS,
};

/**
 * Maps 2021 categories to 2025 equivalents
 */
export const OWASP_2021_TO_2025: Record<OWASP2021Category, OWASP2025Category> =
  {
    'A01:2021': 'A01:2025', // Broken Access Control → Broken Access Control
    'A02:2021': 'A04:2025', // Cryptographic Failures → Cryptographic Failures
    'A03:2021': 'A05:2025', // Injection → Injection
    'A04:2021': 'A06:2025', // Insecure Design → Insecure Design
    'A05:2021': 'A02:2025', // Security Misconfiguration → Security Misconfiguration
    'A06:2021': 'A03:2025', // Vulnerable Components → Software Supply Chain Failures
    'A07:2021': 'A07:2025', // Auth Failures → Authentication Failures
    'A08:2021': 'A08:2025', // Data Integrity Failures → Software or Data Integrity Failures
    'A09:2021': 'A09:2025', // Logging Failures → Logging & Alerting Failures
    'A10:2021': 'A05:2025', // SSRF → Injection (SSRF absorbed into injection/other categories)
  };

// ============================================================================
// CWE TO OWASP 2025/CVSS MAPPING (Updated for OWASP Top 10 2025)
// ============================================================================

/**
 * Maps common CWE IDs to OWASP 2025 categories and typical CVSS scores
 * This enables automatic enrichment of security rules
 *
 * @see https://owasp.org/Top10/2025/
 */
export const CWE_MAPPING: Record<
  string,
  { owasp: OWASPCategory; cvss: number; severity: Severity; name: string }
> = {
  // =========================================================================
  // A01:2025 - Broken Access Control
  // =========================================================================
  'CWE-22': {
    owasp: 'A01:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Path Traversal',
  },
  'CWE-269': {
    owasp: 'A01:2025',
    cvss: 8.8,
    severity: 'HIGH',
    name: 'Improper Privilege Management',
  },
  'CWE-284': {
    owasp: 'A01:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Improper Access Control',
  },
  'CWE-352': {
    owasp: 'A01:2025',
    cvss: 8.8,
    severity: 'HIGH',
    name: 'Cross-Site Request Forgery (CSRF)',
  },
  'CWE-639': {
    owasp: 'A01:2025',
    cvss: 8.1,
    severity: 'HIGH',
    name: 'Insecure Direct Object Reference',
  },
  'CWE-862': {
    owasp: 'A01:2025',
    cvss: 8.1,
    severity: 'HIGH',
    name: 'Missing Authorization',
  },
  'CWE-863': {
    owasp: 'A01:2025',
    cvss: 8.1,
    severity: 'HIGH',
    name: 'Incorrect Authorization',
  },
  'CWE-915': {
    owasp: 'A01:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Object Injection',
  },
  'CWE-942': {
    owasp: 'A01:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'CORS Misconfiguration',
  },
  'CWE-918': {
    owasp: 'A01:2025',
    cvss: 9.1,
    severity: 'CRITICAL',
    name: 'Server-Side Request Forgery (SSRF)',
  },

  // =========================================================================
  // A02:2025 - Security Misconfiguration
  // =========================================================================
  'CWE-16': {
    owasp: 'A02:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Configuration',
  },
  'CWE-209': {
    owasp: 'A02:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Error Information Exposure',
  },
  'CWE-614': {
    owasp: 'A02:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Sensitive Cookie in HTTPS without Secure',
  },
  'CWE-1004': {
    owasp: 'A02:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Sensitive Cookie Without HttpOnly',
  },
  'CWE-1275': {
    owasp: 'A02:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Sensitive Cookie with Improper SameSite',
  },

  // =========================================================================
  // A03:2025 - Software Supply Chain Failures (NEW in 2025)
  // =========================================================================
  'CWE-426': {
    owasp: 'A03:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Untrusted Search Path',
  },
  'CWE-427': {
    owasp: 'A03:2025',
    cvss: 7.8,
    severity: 'HIGH',
    name: 'Uncontrolled Search Path Element',
  },
  'CWE-431': {
    owasp: 'A03:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Missing Handler',
  },
  'CWE-829': {
    owasp: 'A03:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Untrusted Control Sphere Inclusion',
  },
  'CWE-937': {
    owasp: 'A03:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Using Components with Known Vulnerabilities',
  },
  'CWE-1035': {
    owasp: 'A03:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Vulnerable Third-Party Component',
  },
  'CWE-1078': {
    owasp: 'A03:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Deprecated API',
  },
  'CWE-1104': {
    owasp: 'A03:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Unmaintainable Third-Party Components',
  },

  // =========================================================================
  // A04:2025 - Cryptographic Failures
  // =========================================================================
  'CWE-327': {
    owasp: 'A04:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Broken Cryptographic Algorithm',
  },
  'CWE-328': {
    owasp: 'A04:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Reversible One-Way Hash',
  },
  'CWE-330': {
    owasp: 'A04:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Insufficient Randomness',
  },
  'CWE-331': {
    owasp: 'A04:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Insufficient Entropy',
  },
  'CWE-338': {
    owasp: 'A04:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Weak PRNG',
  },
  'CWE-759': {
    owasp: 'A04:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'One-Way Hash without Salt',
  },
  'CWE-798': {
    owasp: 'A04:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Hardcoded Credentials',
  },
  'CWE-326': {
    owasp: 'A04:2025',
    cvss: 5.9,
    severity: 'MEDIUM',
    name: 'Inadequate Encryption Strength',
  },
  'CWE-311': {
    owasp: 'A04:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Missing Encryption of Sensitive Data',
  },

  // =========================================================================
  // A05:2025 - Injection
  // =========================================================================
  'CWE-89': {
    owasp: 'A05:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'SQL Injection',
  },
  'CWE-78': {
    owasp: 'A05:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'OS Command Injection',
  },
  'CWE-79': {
    owasp: 'A05:2025',
    cvss: 6.1,
    severity: 'MEDIUM',
    name: 'Cross-site Scripting (XSS)',
  },
  'CWE-94': {
    owasp: 'A05:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Code Injection',
  },
  'CWE-95': {
    owasp: 'A05:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Eval Injection',
  },
  'CWE-917': {
    owasp: 'A05:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Expression Language Injection',
  },
  'CWE-1321': {
    owasp: 'A05:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Prototype Pollution',
  },
  'CWE-77': {
    owasp: 'A05:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Command Injection',
  },
  'CWE-90': {
    owasp: 'A05:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'LDAP Injection',
  },
  'CWE-611': {
    owasp: 'A05:2025',
    cvss: 9.1,
    severity: 'CRITICAL',
    name: 'XXE (XML External Entity)',
  },

  // =========================================================================
  // A06:2025 - Insecure Design
  // =========================================================================
  'CWE-20': {
    owasp: 'A06:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Improper Input Validation',
  },
  'CWE-400': {
    owasp: 'A06:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Uncontrolled Resource Consumption (ReDoS)',
  },
  'CWE-407': {
    owasp: 'A06:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Circular Dependencies',
  },
  'CWE-697': {
    owasp: 'A06:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Incorrect Comparison',
  },
  'CWE-602': {
    owasp: 'A06:2025',
    cvss: 6.5,
    severity: 'MEDIUM',
    name: 'Client-Side Enforcement of Server-Side Security',
  },
  'CWE-656': {
    owasp: 'A06:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Reliance on Security Through Obscurity',
  },
  'CWE-799': {
    owasp: 'A06:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Improper Control of Interaction Frequency',
  },

  // =========================================================================
  // A07:2025 - Authentication Failures
  // =========================================================================
  'CWE-287': {
    owasp: 'A07:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Improper Authentication',
  },
  'CWE-306': {
    owasp: 'A07:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Missing Authentication',
  },
  'CWE-307': {
    owasp: 'A07:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Improper Restriction of Authentication Attempts',
  },
  'CWE-521': {
    owasp: 'A07:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Weak Password Requirements',
  },
  'CWE-613': {
    owasp: 'A07:2025',
    cvss: 5.4,
    severity: 'MEDIUM',
    name: 'Insufficient Session Expiration',
  },
  'CWE-384': {
    owasp: 'A07:2025',
    cvss: 8.1,
    severity: 'HIGH',
    name: 'Session Fixation',
  },
  'CWE-620': {
    owasp: 'A07:2025',
    cvss: 6.8,
    severity: 'MEDIUM',
    name: 'Unverified Password Change',
  },

  // =========================================================================
  // A08:2025 - Software or Data Integrity Failures
  // =========================================================================
  'CWE-345': {
    owasp: 'A08:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Insufficient Verification of Data Authenticity',
  },
  'CWE-502': {
    owasp: 'A08:2025',
    cvss: 9.8,
    severity: 'CRITICAL',
    name: 'Deserialization of Untrusted Data',
  },
  'CWE-494': {
    owasp: 'A08:2025',
    cvss: 8.1,
    severity: 'HIGH',
    name: 'Download of Code Without Integrity Check',
  },
  'CWE-353': {
    owasp: 'A08:2025',
    cvss: 6.5,
    severity: 'MEDIUM',
    name: 'Missing Support for Integrity Check',
  },

  // =========================================================================
  // A09:2025 - Logging & Alerting Failures
  // =========================================================================
  'CWE-117': {
    owasp: 'A09:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Improper Output Neutralization for Logs',
  },
  'CWE-223': {
    owasp: 'A09:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Omission of Security-relevant Information',
  },
  'CWE-532': {
    owasp: 'A09:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Log Information Exposure',
  },
  'CWE-778': {
    owasp: 'A09:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Insufficient Logging',
  },
  'CWE-779': {
    owasp: 'A09:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Logging of Excessive Data',
  },

  // =========================================================================
  // A10:2025 - Mishandling of Exceptional Conditions (NEW in 2025)
  // =========================================================================
  'CWE-252': {
    owasp: 'A10:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Unchecked Return Value',
  },
  'CWE-248': {
    owasp: 'A10:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Uncaught Exception',
  },
  'CWE-390': {
    owasp: 'A10:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Detection of Error Condition Without Action',
  },
  'CWE-391': {
    owasp: 'A10:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Unchecked Error Condition',
  },
  'CWE-392': {
    owasp: 'A10:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Missing Report of Error Condition',
  },
  'CWE-397': {
    owasp: 'A10:2025',
    cvss: 5.3,
    severity: 'MEDIUM',
    name: 'Throwing Generic Exception',
  },
  'CWE-754': {
    owasp: 'A10:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Improper Check for Unusual Conditions',
  },
  'CWE-755': {
    owasp: 'A10:2025',
    cvss: 7.5,
    severity: 'HIGH',
    name: 'Improper Handling of Exceptional Conditions',
  },
};

// ============================================================================
// COMPLIANCE FRAMEWORKS
// ============================================================================

/**
 * Maps CWE categories to relevant compliance frameworks
 */
export const CWE_COMPLIANCE_MAPPING: Record<string, ComplianceFramework[]> = {
  // Injection - All frameworks care about data integrity
  'CWE-89': ['SOC2', 'PCI-DSS', 'HIPAA', 'ISO27001'],
  'CWE-78': ['SOC2', 'PCI-DSS', 'ISO27001', 'NIST-CSF'],
  'CWE-79': ['SOC2', 'PCI-DSS', 'GDPR', 'ISO27001'],
  'CWE-94': ['SOC2', 'PCI-DSS', 'ISO27001'],
  'CWE-95': ['SOC2', 'PCI-DSS', 'ISO27001'],

  // Access Control - Critical for all frameworks
  'CWE-22': ['SOC2', 'PCI-DSS', 'HIPAA', 'ISO27001'],
  'CWE-269': ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR', 'ISO27001'],
  'CWE-306': ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR', 'ISO27001', 'NIST-CSF'],
  'CWE-862': ['SOC2', 'PCI-DSS', 'HIPAA', 'ISO27001'],
  'CWE-915': ['SOC2', 'PCI-DSS', 'ISO27001'],

  // Cryptographic - PCI-DSS, HIPAA especially strict
  'CWE-327': ['PCI-DSS', 'HIPAA', 'ISO27001', 'NIST-CSF'],
  'CWE-330': ['PCI-DSS', 'ISO27001'],
  'CWE-798': ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR', 'ISO27001', 'NIST-CSF'],

  // Data Protection - GDPR, HIPAA critical
  'CWE-20': ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR', 'ISO27001'],
  'CWE-200': ['GDPR', 'HIPAA', 'PCI-DSS', 'SOC2'],
  'CWE-532': ['GDPR', 'HIPAA', 'PCI-DSS', 'SOC2'],

  // Logging - SOC2, ISO27001 require logging
  'CWE-778': ['SOC2', 'ISO27001', 'PCI-DSS', 'NIST-CSF'],
};

// ============================================================================
// ICON CONSTANTS
// ============================================================================

/**
 * Common icon constants for consistency
 */
export const MessageIcons = {
  /** Security issues */
  SECURITY: '🔒',
  /** Warnings */
  WARNING: '⚠️',
  /** Package/dependency issues */
  PACKAGE: '📦',
  /** Development practices */
  DEVELOPMENT: '🔧',
  /** Performance issues */
  PERFORMANCE: '⚡',
  /** Accessibility issues */
  ACCESSIBILITY: '♿',
  /** Code quality */
  QUALITY: '📚',
  /** Architecture issues */
  ARCHITECTURE: '🏗️',
  /** Migration/refactoring */
  MIGRATION: '🔄',
  /** Deprecation */
  DEPRECATION: '❌',
  /** Domain/DDD */
  DOMAIN: '📖',
  /** Complexity */
  COMPLEXITY: '🧠',
  /** Duplication */
  DUPLICATION: '📋',
  /** Information/suggestions */
  INFO: 'ℹ️',
  /** Success/fix applied */
  SUCCESS: '✅',
  /** Strategy/approach */
  STRATEGY: '🎯',
  /** Authentication */
  AUTH: '🔐',
  /** Data protection */
  DATA: '🛡️',
  /** Compliance */
  COMPLIANCE: '📋',
} as const;
