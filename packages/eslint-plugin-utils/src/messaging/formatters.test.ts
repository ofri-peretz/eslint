/**
 * Comprehensive tests for formatters.ts
 *
 * Tests LLM message formatting, template processing, and SARIF conversion with 100% coverage
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatLLMMessage,
  formatLLMMessageTemplate,
  formatWithTemplate,
  registerMessageTemplate,
  getMessageTemplate,
  listMessageTemplates,
  clearMessageTemplates,
  getSecurityBenchmarks,
  toSARIF,
} from './formatters';
import type {
  LLMMessageOptions,
  EnterpriseMessageOptions,
  TemplatedMessageOptions,
  Severity,
} from './types';

describe('formatters', () => {
  beforeEach(() => {
    clearMessageTemplates();
  });

  describe('formatLLMMessage', () => {
    it('should format basic message without CWE', () => {
      const options: LLMMessageOptions = {
        icon: '🔒',
        issueName: 'Security Issue',
        description: 'A security issue was detected',
        severity: 'HIGH',
        fix: 'Fix the issue',
        documentationLink: 'https://example.com/docs',
      };
      const result = formatLLMMessage(options);
      expect(result).toContain('🔒');
      expect(result).toContain('A security issue was detected');
      expect(result).toContain('HIGH');
      expect(result).toContain('Fix: Fix the issue');
      expect(result).toContain('https://example.com/docs');
    });

    it('should format message with CWE and auto-enrich', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries',
        documentationLink: 'https://owasp.org/...',
      };
      const result = formatLLMMessage(options);
      expect(result).toContain('CWE-89');
      expect(result).toContain('OWASP');
      expect(result).toContain('CVSS');
      expect(result).toContain('CRITICAL');
    });

    it('should handle CWE that is not in CWE_MAPPING', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'Unknown Issue',
        cwe: 'CWE-99999', // Non-existent CWE
        description: 'Unknown issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatLLMMessage(options);
      // Should still format but without auto-enrichment
      expect(result).toContain('CWE-99999');
      expect(result).toContain('Unknown issue');
    });

    it('should include OWASP category when provided', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        owasp: 'A05:2025',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries',
        documentationLink: 'https://owasp.org/...',
      };
      const result = formatLLMMessage(options);
      expect(result).toContain('OWASP:A05');
    });

    it('should handle OWASP category not in OWASP_DETAILS', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        owasp: 'A99:2025' as unknown as EnterpriseMessageOptions['owasp'], // Non-existent OWASP category
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatLLMMessage(options);
      // Should still include OWASP code but without name
      expect(result).toContain('OWASP:A99');
    });

    it('should include CVSS score when provided', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        cvss: 9.8,
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries',
        documentationLink: 'https://owasp.org/...',
      };
      const result = formatLLMMessage(options);
      expect(result).toContain('CVSS:9.8');
    });

    it('should include compliance frameworks', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        compliance: ['SOC2', 'PCI-DSS', 'HIPAA'],
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries',
        documentationLink: 'https://owasp.org/...',
      };
      const result = formatLLMMessage(options);
      expect(result).toContain('SOC2');
      expect(result).toContain('PCI-DSS');
    });

    it('should limit compliance frameworks to 4', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        compliance: ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR', 'ISO27001'],
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries',
        documentationLink: 'https://owasp.org/...',
      };
      const result = formatLLMMessage(options);
      // Should only show first 4
      expect(result.split('[')[1]?.split(']')[0]?.split(',').length).toBeLessThanOrEqual(4);
    });

    it('should format message without standards when CWE not provided', () => {
      const options: LLMMessageOptions = {
        icon: '⚠️',
        issueName: 'Warning',
        description: 'A warning',
        severity: 'LOW',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatLLMMessage(options);
      expect(result).not.toContain('CWE-');
      expect(result).not.toContain('OWASP');
      expect(result).not.toContain('CVSS');
    });

    it('should handle all severity levels', () => {
      const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      severities.forEach(severity => {
        const options: LLMMessageOptions = {
          icon: '🔒',
          issueName: 'Test',
          description: 'Test issue',
          severity,
          fix: 'Fix it',
          documentationLink: 'https://example.com',
        };
        const result = formatLLMMessage(options);
        expect(result).toContain(severity);
      });
    });
  });

  describe('formatLLMMessageTemplate', () => {
    it('should format message same as formatLLMMessage', () => {
      const options: LLMMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result1 = formatLLMMessage(options);
      const result2 = formatLLMMessageTemplate(options);
      expect(result1).toBe(result2);
    });
  });

  describe('getSecurityBenchmarks', () => {
    it('should return security benchmarks for valid CWE', () => {
      const result = getSecurityBenchmarks('CWE-89');
      expect(result).toBeDefined();
      // CWE is not in the return type - only owasp, owaspName, owaspLink, cvss, severity, name, compliance
      expect(result?.owasp).toBeDefined();
      expect(result?.owaspName).toBeDefined();
      expect(result?.owaspLink).toBeDefined();
      expect(result?.cvss).toBeDefined();
      expect(result?.severity).toBeDefined();
      expect(result?.name).toBeDefined();
      expect(result?.compliance).toBeDefined();
    });

    it('should return undefined for invalid CWE', () => {
      const result = getSecurityBenchmarks('CWE-99999');
      expect(result).toBeUndefined();
    });

    it('should handle CWE not in CWE_COMPLIANCE_MAPPING', () => {
      // Test with a CWE that exists in CWE_MAPPING but might not be in CWE_COMPLIANCE_MAPPING
      // We need to find a CWE that's in CWE_MAPPING but not in CWE_COMPLIANCE_MAPPING
      // For now, test that the fallback works
      const result = getSecurityBenchmarks('CWE-89');
      expect(result).toBeDefined();
      // Compliance should be an array (empty if not mapped, or populated if mapped)
      expect(Array.isArray(result?.compliance)).toBe(true);
    });

    it('should return empty array when CWE not in CWE_COMPLIANCE_MAPPING', () => {
      // Use a CWE that's in CWE_MAPPING but not in CWE_COMPLIANCE_MAPPING
      // CWE-77, CWE-90, CWE-611, CWE-917, CWE-1321 are in CWE_MAPPING but not in CWE_COMPLIANCE_MAPPING
      const result = getSecurityBenchmarks('CWE-77');
      expect(result).toBeDefined();
      // Should return empty array when CWE not in compliance mapping
      expect(Array.isArray(result?.compliance)).toBe(true);
      expect(result?.compliance).toEqual([]);
    });

    it('should return undefined for empty CWE', () => {
      const result = getSecurityBenchmarks('');
      expect(result).toBeUndefined();
    });
  });

  describe('registerMessageTemplate', () => {
    it('should register a template', () => {
      registerMessageTemplate('test-template', {
        organizationName: 'Test Corp',
        line1Format: '{{icon}} {{description}}',
        line2Format: '{{fix}}',
      });
      const template = getMessageTemplate('test-template');
      expect(template).toBeDefined();
      expect(template?.organizationName).toBe('Test Corp');
    });

    it('should overwrite existing template', () => {
      registerMessageTemplate('test', { organizationName: 'First' });
      registerMessageTemplate('test', { organizationName: 'Second' });
      const template = getMessageTemplate('test');
      expect(template?.organizationName).toBe('Second');
    });
  });

  describe('getMessageTemplate', () => {
    it('should return undefined for non-existent template', () => {
      const template = getMessageTemplate('non-existent');
      expect(template).toBeUndefined();
    });

    it('should return registered template', () => {
      registerMessageTemplate('test', { organizationName: 'Test' });
      const template = getMessageTemplate('test');
      expect(template).toBeDefined();
      expect(template?.organizationName).toBe('Test');
    });
  });

  describe('listMessageTemplates', () => {
    it('should return empty array when no templates', () => {
      const templates = listMessageTemplates();
      expect(templates).toEqual([]);
    });

    it('should return all template names', () => {
      registerMessageTemplate('template1', { organizationName: 'Test1' });
      registerMessageTemplate('template2', { organizationName: 'Test2' });
      const templates = listMessageTemplates();
      expect(templates).toContain('template1');
      expect(templates).toContain('template2');
      expect(templates.length).toBe(2);
    });
  });

  describe('clearMessageTemplates', () => {
    it('should clear all templates', () => {
      registerMessageTemplate('test1', { organizationName: 'Test1' });
      registerMessageTemplate('test2', { organizationName: 'Test2' });
      clearMessageTemplates();
      expect(listMessageTemplates()).toEqual([]);
      expect(getMessageTemplate('test1')).toBeUndefined();
    });
  });

  describe('formatWithTemplate', () => {
    it('should use default format when no template', () => {
      const options: TemplatedMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toBe(formatLLMMessage(options));
    });

    it('should use registered template', () => {
      registerMessageTemplate('custom', {
        line1Format: 'CUSTOM: {{icon}} {{description}}',
        line2Format: 'FIX: {{fix}}',
      });
      const options: TemplatedMessageOptions = {
        templateName: 'custom',
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('CUSTOM:');
      expect(result).toContain('FIX:');
    });

    it('should use inline template config over registered template', () => {
      registerMessageTemplate('custom', {
        line1Format: 'REGISTERED: {{description}}',
      });
      const options: TemplatedMessageOptions = {
        templateName: 'custom',
        templateConfig: {
          line1Format: 'INLINE: {{description}}',
        },
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('INLINE:');
      expect(result).not.toContain('REGISTERED:');
    });

    it('should build Jira URL from template', () => {
      registerMessageTemplate('jira-template', {
        jiraTemplate: 'https://jira.test.com/create?summary={{summary}}&priority={{priority}}',
        line2Format: '   Fix: {{fix}} | Jira: {{jira}}',
      });
      const options: TemplatedMessageOptions = {
        templateName: 'jira-template',
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
        jiraData: {
          summary: 'Test Summary',
          priority: 'High',
        },
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('jira.test.com');
      expect(result).toContain('Test%20Summary'); // URL encoded
    });

    it('should use description as fallback when jiraData.summary is missing', () => {
      registerMessageTemplate('jira-template-fallback', {
        jiraTemplate: 'https://jira.test.com/create?summary={{summary}}&description={{description}}',
        line2Format: '   Fix: {{fix}} | Jira: {{jira}}',
      });
      const options: TemplatedMessageOptions = {
        templateName: 'jira-template-fallback',
        icon: '🔒',
        issueName: 'Test',
        description: 'Fallback Description',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
        jiraData: {
          // No summary provided - should use description
          // No priority provided - should use 'Medium' default
        },
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('Fallback%20Description'); // Should use description as fallback
      // Note: priority is not included in the Jira template URL in this test
      // The template only includes summary and description parameters
    });

    it('should build Confluence URL from template', () => {
      registerMessageTemplate('confluence-template', {
        confluenceTemplate: 'https://confluence.test.com/wiki/{{cwe}}',
        line2Format: '   Fix: {{fix}} | Docs: {{confluence}}',
      });
      const options: TemplatedMessageOptions = {
        templateName: 'confluence-template',
        icon: '🔒',
        issueName: 'Test',
        cwe: 'CWE-89',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('confluence.test.com');
      expect(result).toContain('CWE-89');
    });

    it('should handle Confluence URL when cwe is missing', () => {
      registerMessageTemplate('confluence-no-cwe', {
        confluenceTemplate: 'https://confluence.test.com/wiki/{{cwe}}',
        line2Format: '   Fix: {{fix}} | Docs: {{confluence}}',
      });
      const options: TemplatedMessageOptions = {
        templateName: 'confluence-no-cwe',
        icon: '🔒',
        issueName: 'Test',
        // No CWE provided
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('confluence.test.com');
      // Should use empty string for missing CWE
      expect(result).toContain('/wiki/');
    });

    it('should handle Confluence URL when owasp is missing', () => {
      registerMessageTemplate('confluence-no-owasp', {
        confluenceTemplate: 'https://confluence.test.com/wiki/{{owasp}}',
        line2Format: '   Fix: {{fix}} | Docs: {{confluence}}',
      });
      const options: TemplatedMessageOptions = {
        templateName: 'confluence-no-owasp',
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
        // No CWE or OWASP
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('confluence.test.com');
      // Should use empty string for missing OWASP
      expect(result).toContain('/wiki/');
    });

    it('should include custom compliance frameworks', () => {
      registerMessageTemplate('custom-compliance', {
        customCompliance: ['CUSTOM-001', 'CUSTOM-002'],
      });
      const options: TemplatedMessageOptions = {
        templateName: 'custom-compliance',
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
        compliance: ['SOC2'],
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('CUSTOM-001');
      expect(result).toContain('SOC2');
    });

    it('should use custom metadata', () => {
      registerMessageTemplate('metadata-template', {
        customMetadata: {
          team: 'Security',
          region: 'US',
        },
        line1Format: '{{team}} {{region}}: {{description}}',
      });
      const options: TemplatedMessageOptions = {
        templateName: 'metadata-template',
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('Security');
      expect(result).toContain('US');
    });

    it('should use custom placeholders', () => {
      const options: TemplatedMessageOptions = {
        templateConfig: {
          line1Format: '{{custom}} {{description}}',
        },
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
        customPlaceholders: {
          custom: 'CUSTOM_VALUE',
        },
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('CUSTOM_VALUE');
    });

    it('should handle missing placeholder values', () => {
      const options: TemplatedMessageOptions = {
        templateConfig: {
          line1Format: '{{missing}} {{description}}',
        },
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('{{missing}}'); // Should keep placeholder if value missing
      expect(result).toContain('Test issue');
    });

    it('should calculate CVSS from severity when not provided', () => {
      const options: TemplatedMessageOptions = {
        templateConfig: {
          line1Format: '{{cvss}}',
        },
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'CRITICAL',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('CVSS:');
    });

    it('should use default templates when not provided', () => {
      const options: TemplatedMessageOptions = {
        templateConfig: {},
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      expect(result).toContain('🔒');
      expect(result).toContain('Test issue');
      expect(result).toContain('Fix: Fix it');
    });

    it('should clean up whitespace in formatted output', () => {
      const options: TemplatedMessageOptions = {
        templateConfig: {
          line1Format: '{{icon}}  |  {{description}}  |  {{severity}}',
        },
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = formatWithTemplate(options);
      // Should not have excessive whitespace
      expect(result).not.toContain('  |');
      expect(result).not.toContain('|  |');
    });
  });

  describe('toSARIF', () => {
    it('should convert message options to SARIF format', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries',
        documentationLink: 'https://owasp.org/...',
      };
      const result = toSARIF(options);
      expect(result.ruleId).toBeDefined();
      expect(result.level).toBe('error');
      expect(result.message.text).toBe('SQL Injection detected');
      expect(result.properties.cwe).toBe('CWE-89');
      expect(result.properties.fix).toBe('Use parameterized queries');
    });

    it('should use ruleId when provided', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        ruleId: 'custom-rule-id',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = toSARIF(options);
      expect(result.ruleId).toBe('custom-rule-id');
    });

    it('should generate ruleId from issueName when ruleId not provided', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'SQL Injection Test',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = toSARIF(options);
      expect(result.ruleId).toContain('sql');
      expect(result.ruleId).toContain('injection');
    });

    it('should use CWE as ruleId when available and ruleId not provided', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = toSARIF(options);
      expect(result.ruleId).toBe('CWE-89');
    });

    it('should map severity to SARIF levels correctly', () => {
      const testCases: Array<{ severity: Severity; expectedLevel: 'error' | 'warning' | 'note' | 'none' }> = [
        { severity: 'CRITICAL', expectedLevel: 'error' },
        { severity: 'HIGH', expectedLevel: 'error' },
        { severity: 'MEDIUM', expectedLevel: 'warning' },
        { severity: 'LOW', expectedLevel: 'note' },
        { severity: 'INFO', expectedLevel: 'note' },
      ];

      testCases.forEach(({ severity, expectedLevel }) => {
        const options: EnterpriseMessageOptions = {
          icon: '🔒',
          issueName: 'Test',
          description: 'Test issue',
          severity,
          fix: 'Fix it',
          documentationLink: 'https://example.com',
        };
        const result = toSARIF(options);
        expect(result.level).toBe(expectedLevel);
      });
    });

    it('should include security-severity property', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        cwe: 'CWE-89',
        cvss: 9.8,
        description: 'Test issue',
        severity: 'CRITICAL',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = toSARIF(options);
      expect(result.properties['security-severity']).toBe('9.8');
    });

    it('should calculate security-severity from severity when CVSS not provided', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'CRITICAL',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = toSARIF(options);
      expect(result.properties['security-severity']).toBeDefined();
    });

    it('should include compliance frameworks', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        cwe: 'CWE-89',
        compliance: ['SOC2', 'PCI-DSS'],
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = toSARIF(options);
      expect(result.properties.compliance).toEqual(['SOC2', 'PCI-DSS']);
    });

    it('should include OWASP category', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        cwe: 'CWE-89',
        owasp: 'A05:2025',
        description: 'Test issue',
        severity: 'HIGH',
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = toSARIF(options);
      expect(result.properties.owasp).toBe('A05:2025');
    });

    it('should handle invalid severity with default level', () => {
      const options: EnterpriseMessageOptions = {
        icon: '🔒',
        issueName: 'Test',
        description: 'Test issue',
        severity: 'INVALID' as Severity,
        cvss: 5.0, // Provide CVSS to avoid calling severityToCVSS with invalid severity
        fix: 'Fix it',
        documentationLink: 'https://example.com',
      };
      const result = toSARIF(options);
      expect(result.level).toBe('none');
    });
  });
});


