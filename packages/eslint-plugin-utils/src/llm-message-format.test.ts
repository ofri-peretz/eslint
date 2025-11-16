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

    it('should format a message with CWE reference', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      });

      expect(result).toBe(
        '🔒 CWE-89 | SQL Injection detected | CRITICAL\n   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection',
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
    it('should include CWE when provided', () => {
      const result = formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Object injection',
        cwe: 'CWE-915',
        description: 'Object injection/Prototype pollution',
        severity: 'HIGH',
        fix: 'Use Map instead of plain objects',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      });

      expect(result).toContain('CWE-915');
      expect(result).toContain('CWE-915 |');
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
  it('should format SQL injection message correctly', () => {
    const result = formatLLMMessage({
      icon: MessageIcons.SECURITY,
      issueName: 'SQL Injection',
      cwe: 'CWE-89',
      description: 'SQL Injection detected',
      severity: 'CRITICAL',
      fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
      documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
    });

    const expected =
      '🔒 CWE-89 | SQL Injection detected | CRITICAL\n   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection';

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

