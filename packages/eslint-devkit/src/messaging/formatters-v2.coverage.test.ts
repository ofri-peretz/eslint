/**
 * Coverage-focused tests for messaging/formatters-v2.ts
 *
 * Targets the remaining branches: enrichment without a CWE, unknown OWASP names,
 * and the compact-mode severity fallback for non-standard severities.
 */
import { describe, it, expect } from 'vitest';
import {
  formatSecurityMessage,
  formatCodeQualityMessage,
  formatPerformanceMessage,
} from './formatters-v2';
import type { Severity, OWASPCategory } from './types';

describe('formatSecurityMessage', () => {
  it('skips enrichment entirely when no cwe is provided', () => {
    const output = formatSecurityMessage({
      severity: 'HIGH',
      description: 'Hardcoded secret',
      fix: 'Move to env var',
    });
    // No CWE → no standards prefix at all (severityToCVSS not invoked in human mode)
    expect(output).toContain('🔒 Hardcoded secret | HIGH');
    expect(output).not.toContain('CWE-');
    expect(output).not.toContain('OWASP:');
  });

  it('passes options through unchanged for an unknown CWE', () => {
    const output = formatSecurityMessage({
      severity: 'HIGH',
      description: 'Novel issue',
      fix: 'Fix it',
      cwe: 'CWE-99999',
    });
    // Unknown CWE → no auto-enriched OWASP/CVSS, but the CWE still renders
    expect(output).toContain('CWE-99999 | Novel issue | HIGH');
    expect(output).not.toContain('OWASP:');
  });

  it('renders an empty OWASP name for an unknown OWASP category', () => {
    const output = formatSecurityMessage({
      severity: 'HIGH',
      description: 'Injection',
      fix: 'Sanitize',
      cwe: 'CWE-89',
      owasp: 'A99:2021' as OWASPCategory,
    });
    expect(output).toContain('OWASP:A99-');
  });

  it('compact mode falls back to the raw severity for non-standard values', () => {
    const output = formatSecurityMessage(
      {
        severity: 'WARNING' as unknown as Severity,
        description: 'Weird severity',
        fix: 'Fix it',
      },
      'compact',
    );
    expect(output).toContain('Weird severity | WARNING');
  });
});

describe('formatCodeQualityMessage', () => {
  it('compact mode falls back to the raw severity for non-standard values', () => {
    const output = formatCodeQualityMessage(
      {
        category: 'circular-dependency',
        severity: 'WARNING' as unknown as Severity,
        description: 'Cycle detected',
        fix: 'Break the cycle',
      },
      'compact',
    );
    expect(output).toContain('Cycle detected | WARNING');
  });
});

describe('formatPerformanceMessage', () => {
  it('compact mode falls back to the raw severity for non-standard values', () => {
    const output = formatPerformanceMessage(
      {
        severity: 'WARNING' as unknown as Severity,
        description: 'Slow loop',
        fix: 'Batch it',
      },
      'compact',
    );
    expect(output).toContain('Slow loop | WARNING');
  });
});
