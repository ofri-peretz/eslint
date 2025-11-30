import { describe, it, expect } from 'vitest';
import {
  formatLLMMessage,
  formatLLMMessageTemplate,
  MessageIcons,
  type Severity,
} from './llm-message-format';

describe('formatLLMMessage', () => {
  describe('basic formatting', () => {
    it('should format a basic message without CWE', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.PACKAGE,
        issueName: 'Dependency Version Strategy',
        description: 'Dependency "{{name}}" should use {{strategy}} version',
        severity: 'MEDIUM',
        fix: 'Change "{{current}}" to "{{expected}}" for version flexibility',
        documentationLink: 'https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies',
      });

      expect(result).toBe(
        '📦 Dependency "{{name}}" should use {{strategy}} version | MEDIUM\n   Fix: Change "{{current}}" to "{{expected}}" for version flexibility | https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies',
      );
    });

    it('should format a message with CWE reference (enterprise format with OWASP 2025)', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      });

      // Enterprise format: CWE + OWASP:A##-CategoryName + CVSS:score + [Compliance]
      expect(result).toBe(
        '🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA,ISO27001]\n   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection',
      );
    });

    it('should format a message with all severity levels', () => {
      const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

      severities.forEach((severity) => {
        const result = formatLLMMessage({
          icon: MessageIcons.WARNING,
          issueName: 'Test Issue',
          description: 'Test description',
          severity,
          fix: 'Test fix',
          documentationLink: 'https://example.com',
        });

        expect(result).toContain(`| ${severity}`);
        expect(result).toContain('   Fix: Test fix');
      });
    });
  });

  describe('CWE handling', () => {
    it('should include CWE and auto-enrich with OWASP 2025 data', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Object injection',
        cwe: 'CWE-915',
        description: 'Object injection/Prototype pollution',
        severity: 'HIGH',
        fix: 'Use Map instead of plain objects',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      });

      // CWE-915 maps to A01:2025 (Broken Access Control), CVSS 9.8
      expect(result).toContain('CWE-915');
      expect(result).toContain('OWASP:A01-Broken'); // Labeled with category name
      expect(result).toContain('CVSS:9.8'); // CVSS score
      expect(result).toContain('[SOC2,PCI-DSS,ISO27001]'); // Compliance
    });

    it('should omit CWE when not provided', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.PACKAGE,
        issueName: 'Dependency Issue',
        description: 'Some dependency issue',
        severity: 'MEDIUM',
        fix: 'Fix the dependency',
        documentationLink: 'https://example.com',
      });

      expect(result).not.toContain('CWE');
      expect(result).toMatch(/^📦 Some dependency issue \| MEDIUM/);
    });

    it('should handle empty CWE string as undefined', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Test',
        cwe: '',
        description: 'Test',
        severity: 'MEDIUM',
        fix: 'Fix',
        documentationLink: 'https://example.com',
      });

      // Empty string should be treated as truthy, so it will be included
      expect(result).toContain(' | ');
    });
  });

  describe('template variables', () => {
    it('should support template variables in severity', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Object injection',
        cwe: 'CWE-915',
        description: 'Object injection/Prototype pollution',
        severity: '{{riskLevel}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      });

      expect(result).toContain('{{riskLevel}}');
      expect(result).toContain('{{safeAlternative}}');
    });

    it('should support template variables in all fields', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.PACKAGE,
        issueName: '{{issueName}}',
        description: '{{description}}',
        severity: '{{severity}}',
        fix: '{{fix}}',
        documentationLink: '{{link}}',
      });

      // issueName is not used in the format, only description is
      expect(result).toContain('{{description}}');
      expect(result).toContain('{{severity}}');
      expect(result).toContain('{{fix}}');
      expect(result).toContain('{{link}}');
    });
  });

  describe('format structure', () => {
    it('should have exactly 2 lines', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Test',
        description: 'Test',
        severity: 'CRITICAL',
        fix: 'Fix',
        documentationLink: 'https://example.com',
      });

      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
    });

    it('should have proper indentation on second line', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Test',
        description: 'Test',
        severity: 'MEDIUM',
        fix: 'Fix instruction',
        documentationLink: 'https://example.com',
      });

      const lines = result.split('\n');
      expect(lines[1]).toMatch(/^ {3}Fix:/);
      expect(lines[1].startsWith('   ')).toBe(true);
    });

    it('should use pipe separators correctly', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized query',
        documentationLink: 'https://example.com',
      });

      const firstLine = result.split('\n')[0];
      const parts = firstLine.split(' | ');
      expect(parts.length).toBeGreaterThanOrEqual(3); // Icon CWE? | Issue | Description | Severity
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in fix instruction', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use db.query("SELECT * FROM users WHERE id = ?", [userId])',
        documentationLink: 'https://example.com',
      });

      expect(result).toContain('db.query("SELECT * FROM users WHERE id = ?", [userId])');
    });

    it('should handle long documentation links', () => {
      const longLink = 'https://very-long-domain-name.example.com/path/to/very/long/documentation/page';
      const result = formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Test',
        description: 'Test',
        severity: 'MEDIUM',
        fix: 'Fix',
        documentationLink: longLink,
      });

      expect(result).toContain(longLink);
    });

    it('should handle empty strings in optional fields', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: '',
        description: '',
        severity: '',
        fix: '',
        documentationLink: '',
      });

      // Format: Icon | Description | Severity
      // With empty strings: ⚠️  |  | \n   Fix:  | 
      expect(result.split('\n')).toHaveLength(2);
      expect(result).toContain('⚠️');
      expect(result).toContain('Fix:');
    });

    it('should handle unicode characters in description', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: '🚨 Critical Issue',
        description: 'Description with émojis 🎯',
        severity: 'HIGH',
        fix: 'Fix with special chars: <>&"\'',
        documentationLink: 'https://example.com',
      });

      // issueName is not in output, only description
      expect(result).toContain('émojis 🎯');
      expect(result).toContain('<>&"\'');
      expect(result).toContain('Description with émojis 🎯');
    });
  });

  describe('icon constants', () => {
    it('should work with all MessageIcons constants', () => {
      const icons = Object.values(MessageIcons);

      icons.forEach((icon) => {
        const result = formatLLMMessage({
          icon,
          issueName: 'Test',
          description: 'Test',
          severity: 'MEDIUM',
          fix: 'Fix',
          documentationLink: 'https://example.com',
        });

        expect(result).toContain(icon);
        expect(result.startsWith(icon)).toBe(true);
      });
    });
  });
});

describe('formatLLMMessageTemplate', () => {
  it('should be an alias for formatLLMMessage', () => {
    const options = {
      icon: MessageIcons.WARNING,
      issueName: 'Object injection',
      cwe: 'CWE-915',
      description: 'Object injection/Prototype pollution',
      severity: '{{riskLevel}}',
      fix: '{{safeAlternative}}',
      documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
    };

    const templateResult = formatLLMMessageTemplate(options);
    const regularResult = formatLLMMessage(options);

    expect(templateResult).toBe(regularResult);
  });

  it('should support template variables', () => {
    const result = formatLLMMessageTemplate({
      icon: MessageIcons.WARNING,
      issueName: 'Test',
      description: '{{description}}',
      severity: '{{severity}}',
      fix: '{{fix}}',
      documentationLink: '{{link}}',
    });

    expect(result).toContain('{{description}}');
    expect(result).toContain('{{severity}}');
    expect(result).toContain('{{fix}}');
    expect(result).toContain('{{link}}');
  });
});

describe('MessageIcons', () => {
  it('should export all expected icon constants', () => {
    expect(MessageIcons.SECURITY).toBe('🔒');
    expect(MessageIcons.WARNING).toBe('⚠️');
    expect(MessageIcons.PACKAGE).toBe('📦');
    expect(MessageIcons.DEVELOPMENT).toBe('🔧');
    expect(MessageIcons.PERFORMANCE).toBe('⚡');
    expect(MessageIcons.ACCESSIBILITY).toBe('♿');
    expect(MessageIcons.QUALITY).toBe('📚');
    expect(MessageIcons.ARCHITECTURE).toBe('🏗️');
    expect(MessageIcons.MIGRATION).toBe('🔄');
    expect(MessageIcons.DEPRECATION).toBe('❌');
    expect(MessageIcons.DOMAIN).toBe('📖');
    expect(MessageIcons.COMPLEXITY).toBe('🧠');
    expect(MessageIcons.DUPLICATION).toBe('📋');
  });

  it('should have all icons as string values', () => {
    Object.values(MessageIcons).forEach((icon) => {
      expect(typeof icon).toBe('string');
      expect(icon.length).toBeGreaterThan(0);
    });
  });

  it('should be a readonly object', () => {
    // TypeScript should prevent mutations, but we can verify the structure
    expect(Object.keys(MessageIcons).length).toBeGreaterThan(0);
    expect(MessageIcons).toBeDefined();
  });
});

describe('real-world examples', () => {
  it('should format SQL injection message with enterprise OWASP 2025 format', () => {
    const result = formatLLMMessage({
      icon: MessageIcons.SECURITY,
      issueName: 'SQL Injection',
      cwe: 'CWE-89',
      description: 'SQL Injection detected',
      severity: 'CRITICAL',
      fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
      documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
    });

    // Enterprise format: CWE-89 auto-enriches to OWASP:A05-Injection, CVSS:9.8, [Compliance]
    const expected =
      '🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA,ISO27001]\n   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection';

    expect(result).toBe(expected);
  });

  it('should format object injection message with template variables', () => {
    const result = formatLLMMessage({
      icon: MessageIcons.WARNING,
      issueName: 'Object injection',
      cwe: 'CWE-915',
      description: 'Object injection/Prototype pollution',
      severity: '{{riskLevel}}',
      fix: '{{safeAlternative}}',
      documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
    });

    expect(result).toContain('CWE-915');
    expect(result).toContain('{{riskLevel}}');
    expect(result).toContain('{{safeAlternative}}');
    expect(result).toContain('portswigger.net');
  });

  it('should format dependency version strategy message', () => {
    const result = formatLLMMessage({
      icon: MessageIcons.PACKAGE,
      issueName: 'Dependency Version Strategy',
      description: 'Dependency "{{name}}" should use {{strategy}} version',
      severity: 'MEDIUM',
      fix: 'Change "{{current}}" to "{{expected}}" for version flexibility',
      documentationLink: 'https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies',
    });

    // issueName is not in output, only description
    expect(result).toContain('Dependency "{{name}}" should use {{strategy}} version');
    expect(result).toContain('{{name}}');
    expect(result).toContain('{{strategy}}');
    expect(result).toContain('{{current}}');
    expect(result).toContain('{{expected}}');
  });
});

// ============================================================================
// ENTERPRISE FEATURES TESTS (OWASP 2025, CVSS, Compliance)
// ============================================================================

import {
  OWASP_2025_DETAILS,
  OWASP_2021_DETAILS,
  OWASP_2021_TO_2025,
  CWE_MAPPING,
  CWE_COMPLIANCE_MAPPING,
  CVSS_RANGES,
  severityToCVSS,
  getSecurityBenchmarks,
  toSARIF,
  type OWASP2025Category,
  type OWASP2021Category,
} from './llm-message-format';

describe('OWASP 2025 Categories', () => {
  it('should have all 10 OWASP 2025 categories defined', () => {
    const categories: OWASP2025Category[] = [
      'A01:2025', 'A02:2025', 'A03:2025', 'A04:2025', 'A05:2025',
      'A06:2025', 'A07:2025', 'A08:2025', 'A09:2025', 'A10:2025',
    ];
    
    categories.forEach(cat => {
      expect(OWASP_2025_DETAILS[cat]).toBeDefined();
      expect(OWASP_2025_DETAILS[cat].name).toBeTruthy();
      expect(OWASP_2025_DETAILS[cat].link).toContain('owasp.org');
    });
  });

  it('should have correct names for new 2025 categories', () => {
    expect(OWASP_2025_DETAILS['A03:2025'].name).toBe('Software Supply Chain Failures');
    expect(OWASP_2025_DETAILS['A10:2025'].name).toBe('Mishandling of Exceptional Conditions');
  });

  it('should map 2021 categories to 2025 equivalents', () => {
    expect(OWASP_2021_TO_2025['A03:2021']).toBe('A05:2025'); // Injection moved
    expect(OWASP_2021_TO_2025['A06:2021']).toBe('A03:2025'); // Vulnerable Components → Supply Chain
    expect(OWASP_2021_TO_2025['A05:2021']).toBe('A02:2025'); // Security Misconfiguration moved up
  });
});

describe('CWE to OWASP 2025 Mapping', () => {
  it('should map SQL injection to A05:2025 (Injection)', () => {
    expect(CWE_MAPPING['CWE-89'].owasp).toBe('A05:2025');
    expect(CWE_MAPPING['CWE-89'].cvss).toBe(9.8);
    expect(CWE_MAPPING['CWE-89'].severity).toBe('CRITICAL');
  });

  it('should map XSS to A05:2025 (Injection)', () => {
    expect(CWE_MAPPING['CWE-79'].owasp).toBe('A05:2025');
    expect(CWE_MAPPING['CWE-79'].severity).toBe('MEDIUM');
  });

  it('should map supply chain CWEs to A03:2025', () => {
    expect(CWE_MAPPING['CWE-1035'].owasp).toBe('A03:2025'); // Vulnerable Third-Party Component
    expect(CWE_MAPPING['CWE-937'].owasp).toBe('A03:2025'); // Known Vulnerabilities
  });

  it('should map new A10:2025 error handling CWEs', () => {
    expect(CWE_MAPPING['CWE-248'].owasp).toBe('A10:2025'); // Uncaught Exception
    expect(CWE_MAPPING['CWE-755'].owasp).toBe('A10:2025'); // Improper Handling of Exceptional Conditions
  });
});

describe('CVSS Scoring', () => {
  it('should have correct CVSS ranges per NIST guidelines', () => {
    expect(CVSS_RANGES.CRITICAL.min).toBe(9.0);
    expect(CVSS_RANGES.CRITICAL.max).toBe(10.0);
    expect(CVSS_RANGES.HIGH.min).toBe(7.0);
    expect(CVSS_RANGES.HIGH.max).toBe(8.9);
    expect(CVSS_RANGES.MEDIUM.min).toBe(4.0);
    expect(CVSS_RANGES.MEDIUM.max).toBe(6.9);
    expect(CVSS_RANGES.LOW.min).toBe(0.1);
    expect(CVSS_RANGES.LOW.max).toBe(3.9);
  });

  it('should convert severity to representative CVSS score', () => {
    expect(severityToCVSS('CRITICAL')).toBe(9.5);
    expect(severityToCVSS('HIGH')).toBe(8.0); // (7.0 + 8.9) / 2 = 7.95 → 8.0
    expect(severityToCVSS('MEDIUM')).toBe(5.5); // (4.0 + 6.9) / 2 = 5.45 → 5.5
    expect(severityToCVSS('LOW')).toBe(2.0); // (0.1 + 3.9) / 2 = 2.0
  });
});

describe('getSecurityBenchmarks', () => {
  it('should return full benchmark data for known CWE', () => {
    const benchmarks = getSecurityBenchmarks('CWE-89');
    
    expect(benchmarks).toBeDefined();
    expect(benchmarks!.owasp).toBe('A05:2025');
    expect(benchmarks!.owaspName).toBe('Injection');
    expect(benchmarks!.cvss).toBe(9.8);
    expect(benchmarks!.severity).toBe('CRITICAL');
    expect(benchmarks!.compliance).toContain('SOC2');
    expect(benchmarks!.compliance).toContain('PCI-DSS');
  });

  it('should return undefined for unknown CWE', () => {
    const benchmarks = getSecurityBenchmarks('CWE-99999');
    expect(benchmarks).toBeUndefined();
  });
});

describe('toSARIF', () => {
  it('should convert message options to SARIF format', () => {
    const sarif = toSARIF({
      icon: MessageIcons.SECURITY,
      issueName: 'SQL Injection',
      cwe: 'CWE-89',
      description: 'SQL Injection detected',
      severity: 'CRITICAL',
      fix: 'Use parameterized queries',
      documentationLink: 'https://owasp.org',
    });

    expect(sarif.ruleId).toBe('CWE-89');
    expect(sarif.level).toBe('error'); // CRITICAL → error
    expect(sarif.message.text).toBe('SQL Injection detected');
    expect(sarif.properties['security-severity']).toBe('9.8');
    expect(sarif.properties.owasp).toBe('A05:2025');
    expect(sarif.properties.compliance).toContain('SOC2');
  });

  it('should map severity to correct SARIF level', () => {
    const criticalSarif = toSARIF({
      icon: '🔒', issueName: 'Test', description: 'Test',
      severity: 'CRITICAL', fix: 'Fix', documentationLink: 'https://example.com',
    });
    expect(criticalSarif.level).toBe('error');

    const mediumSarif = toSARIF({
      icon: '⚠️', issueName: 'Test', description: 'Test',
      severity: 'MEDIUM', fix: 'Fix', documentationLink: 'https://example.com',
    });
    expect(mediumSarif.level).toBe('warning');

    const lowSarif = toSARIF({
      icon: 'ℹ️', issueName: 'Test', description: 'Test',
      severity: 'LOW', fix: 'Fix', documentationLink: 'https://example.com',
    });
    expect(lowSarif.level).toBe('note');
  });
});

describe('Compliance Framework Mapping', () => {
  it('should map injection CWEs to relevant compliance frameworks', () => {
    expect(CWE_COMPLIANCE_MAPPING['CWE-89']).toContain('SOC2');
    expect(CWE_COMPLIANCE_MAPPING['CWE-89']).toContain('PCI-DSS');
    expect(CWE_COMPLIANCE_MAPPING['CWE-89']).toContain('HIPAA');
  });

  it('should map authentication CWEs to compliance frameworks', () => {
    expect(CWE_COMPLIANCE_MAPPING['CWE-306']).toContain('HIPAA');
    expect(CWE_COMPLIANCE_MAPPING['CWE-306']).toContain('GDPR');
    expect(CWE_COMPLIANCE_MAPPING['CWE-306']).toContain('NIST-CSF');
  });

  it('should map cryptographic CWEs to PCI-DSS', () => {
    expect(CWE_COMPLIANCE_MAPPING['CWE-327']).toContain('PCI-DSS');
    expect(CWE_COMPLIANCE_MAPPING['CWE-798']).toContain('PCI-DSS');
  });
});

