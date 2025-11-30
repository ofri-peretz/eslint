/**
 * Tests for SARIF ESLint Formatter
 * Tests GitHub Advanced Security compatible output
 */
import { describe, it, expect } from 'vitest';
import type { ESLint, Linter } from 'eslint';
import {
  createSARIFFormatter,
  sarifFormatter,
  type SARIFLog,
} from './sarif-formatter';

// Message type from ESLint results
type LintMessage = ESLint.LintResult['messages'][number];

// Helper to create mock ESLint results
function createMockResult(overrides: Partial<ESLint.LintResult> = {}): ESLint.LintResult {
  return {
    filePath: '/src/test.ts',
    messages: [],
    suppressedMessages: [],
    errorCount: 0,
    fatalErrorCount: 0,
    warningCount: 0,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    usedDeprecatedRules: [],
    ...overrides,
  };
}

// Helper to create mock ESLint message
function createMockMessage(
  overrides: Partial<LintMessage> = {}
): LintMessage {
  return {
    ruleId: 'test-rule',
    severity: 2 as Linter.Severity,
    message: 'Test error message',
    line: 10,
    column: 5,
    nodeType: 'Identifier',
    ...overrides,
  } as LintMessage;
}

describe('sarif-formatter', () => {
  describe('sarifFormatter (default export)', () => {
    it('should export a default formatter function', () => {
      expect(typeof sarifFormatter).toBe('function');
    });

    it('should return valid SARIF JSON for empty results', () => {
      const result = sarifFormatter([]);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.version).toBe('2.1.0');
      expect(sarif.$schema).toContain('sarif-schema-2.1.0.json');
      expect(sarif.runs).toHaveLength(1);
      expect(sarif.runs[0].results).toHaveLength(0);
    });

    it('should include tool information', () => {
      const result = sarifFormatter([]);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].tool.driver.name).toBe('@forge-js/eslint-plugin-llm-optimized');
      expect(sarif.runs[0].tool.driver.version).toBeDefined();
      expect(sarif.runs[0].tool.driver.informationUri).toContain('github.com');
    });
  });

  describe('createSARIFFormatter', () => {
    it('should create a formatter with custom options', () => {
      const formatter = createSARIFFormatter({
        toolName: 'My Custom Tool',
        toolVersion: '2.0.0',
        toolUri: 'https://example.com',
      });

      const result = formatter([]);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].tool.driver.name).toBe('My Custom Tool');
      expect(sarif.runs[0].tool.driver.version).toBe('2.0.0');
      expect(sarif.runs[0].tool.driver.informationUri).toBe('https://example.com');
    });

    it('should format single error correctly', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          filePath: '/src/app.ts',
          errorCount: 1,
          messages: [
            createMockMessage({
              ruleId: 'no-console',
              severity: 2,
              message: 'Unexpected console statement',
              line: 15,
              column: 10,
              endLine: 15,
              endColumn: 25,
            }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results).toHaveLength(1);
      
      const sarifResult = sarif.runs[0].results[0];
      expect(sarifResult.ruleId).toBe('no-console');
      expect(sarifResult.level).toBe('error');
      expect(sarifResult.message.text).toBe('Unexpected console statement');
      expect(sarifResult.locations[0].physicalLocation.artifactLocation.uri).toBe('src/app.ts');
      expect(sarifResult.locations[0].physicalLocation.region?.startLine).toBe(15);
      expect(sarifResult.locations[0].physicalLocation.region?.startColumn).toBe(10);
    });

    it('should format multiple files with multiple errors', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          filePath: '/src/file1.ts',
          errorCount: 2,
          messages: [
            createMockMessage({ ruleId: 'rule-1', line: 1 }),
            createMockMessage({ ruleId: 'rule-2', line: 5 }),
          ],
        }),
        createMockResult({
          filePath: '/src/file2.ts',
          errorCount: 1,
          messages: [
            createMockMessage({ ruleId: 'rule-1', line: 10 }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results).toHaveLength(3);
    });

    it('should map ESLint severity to SARIF level correctly', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [
            createMockMessage({ ruleId: 'error-rule', severity: 2 }), // error
            createMockMessage({ ruleId: 'warning-rule', severity: 1, line: 20 }), // warning
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results[0].level).toBe('error');
      expect(sarif.runs[0].results[1].level).toBe('warning');
    });

    it('should include rule definitions when enabled', () => {
      const formatter = createSARIFFormatter({ includeRuleDefinitions: true });
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [
            createMockMessage({ ruleId: 'no-console' }),
            createMockMessage({ ruleId: 'no-debugger', line: 20 }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].tool.driver.rules).toBeDefined();
      expect(sarif.runs[0].tool.driver.rules).toHaveLength(2);
      expect(sarif.runs[0].tool.driver.rules?.[0].id).toBe('no-console');
      expect(sarif.runs[0].tool.driver.rules?.[1].id).toBe('no-debugger');
    });

    it('should not include rule definitions when disabled', () => {
      const formatter = createSARIFFormatter({ includeRuleDefinitions: false });
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [createMockMessage({ ruleId: 'no-console' })],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].tool.driver.rules).toBeUndefined();
    });

    it('should include fingerprints for deduplication', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [createMockMessage({ ruleId: 'test-rule', line: 10, column: 5 })],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results[0].fingerprints).toBeDefined();
      expect(sarif.runs[0].results[0].fingerprints?.primaryLocationLineHash).toBeDefined();
    });

    it('should track execution success in invocations', () => {
      const formatter = createSARIFFormatter();
      
      // No errors - successful
      const successResults: ESLint.LintResult[] = [
        createMockResult({ errorCount: 0 }),
      ];
      let sarif = JSON.parse(formatter(successResults)) as SARIFLog;
      expect(sarif.runs[0].invocations?.[0].executionSuccessful).toBe(true);

      // Has errors - not successful
      const errorResults: ESLint.LintResult[] = [
        createMockResult({
          errorCount: 1,
          messages: [createMockMessage({ severity: 2 })],
        }),
      ];
      sarif = JSON.parse(formatter(errorResults)) as SARIFLog;
      expect(sarif.runs[0].invocations?.[0].executionSuccessful).toBe(false);
    });
  });

  describe('Security metadata extraction', () => {
    it('should extract CWE from LLM-formatted messages', () => {
      const formatter = createSARIFFormatter({ extractSecurityMetadata: true });
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [
            createMockMessage({
              ruleId: 'no-sql-injection',
              message: '🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 | SQL Injection detected | CRITICAL',
            }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results[0].properties?.cwe).toBe('CWE-89');
      expect(sarif.runs[0].results[0].properties?.severity).toBe('CRITICAL');
      expect(sarif.runs[0].results[0].level).toBe('error'); // CRITICAL → error
    });

    it('should extract severity from message', () => {
      const formatter = createSARIFFormatter({ extractSecurityMetadata: true });
      
      const testCases = [
        { message: 'Test | CRITICAL', expectedLevel: 'error' },
        { message: 'Test | HIGH', expectedLevel: 'error' },
        { message: 'Test | MEDIUM', expectedLevel: 'warning' },
        { message: 'Test | LOW', expectedLevel: 'note' },
      ];

      for (const { message, expectedLevel } of testCases) {
        const results: ESLint.LintResult[] = [
          createMockResult({
            messages: [createMockMessage({ message, line: 1 })],
          }),
        ];

        const result = formatter(results);
        const sarif = JSON.parse(result) as SARIFLog;
        expect(sarif.runs[0].results[0].level).toBe(expectedLevel);
      }
    });

    it('should add security-severity to rule properties for CWE', () => {
      const formatter = createSARIFFormatter({
        extractSecurityMetadata: true,
        includeRuleDefinitions: true,
      });
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [
            createMockMessage({
              ruleId: 'no-sql-injection',
              message: '🔒 CWE-89 | SQL Injection | CRITICAL',
            }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      const rule = sarif.runs[0].tool.driver.rules?.[0];
      expect(rule?.properties?.['security-severity']).toBeDefined();
      expect(rule?.properties?.tags).toContain('security');
      expect(rule?.properties?.tags).toContain('CWE-89');
    });

    it('should not extract metadata when disabled', () => {
      const formatter = createSARIFFormatter({ extractSecurityMetadata: false });
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [
            createMockMessage({
              ruleId: 'no-sql-injection',
              message: '🔒 CWE-89 | SQL Injection | CRITICAL',
            }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results[0].properties?.cwe).toBeUndefined();
      expect(sarif.runs[0].results[0].level).toBe('error'); // Falls back to ESLint severity
    });
  });

  describe('File path handling', () => {
    it('should normalize backslashes to forward slashes', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          filePath: 'C:\\Users\\test\\src\\app.ts',
          messages: [createMockMessage()],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
        .not.toContain('\\');
    });

    it('should remove leading slashes for relative paths', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          filePath: '/src/app.ts',
          messages: [createMockMessage()],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
        .toBe('src/app.ts');
    });

    it('should handle baseUri option', () => {
      const formatter = createSARIFFormatter({ baseUri: '/workspace/' });
      const results: ESLint.LintResult[] = [
        createMockResult({
          filePath: '/workspace/src/app.ts',
          messages: [createMockMessage()],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
        .toBe('src/app.ts');
      expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uriBaseId)
        .toBe('%SRCROOT%');
      expect(sarif.runs[0].originalUriBaseIds?.['%SRCROOT%']?.uri)
        .toBe('/workspace/');
    });
  });

  describe('Edge cases', () => {
    it('should handle messages without ruleId', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [
            createMockMessage({ ruleId: null as unknown as string }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].results[0].ruleId).toBe('unknown');
    });

    it('should handle messages without endLine/endColumn', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [
            createMockMessage({
              line: 10,
              column: 5,
              endLine: undefined,
              endColumn: undefined,
            }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      const region = sarif.runs[0].results[0].locations[0].physicalLocation.region;
      expect(region?.endLine).toBe(10);
      expect(region?.endColumn).toBe(5);
    });

    it('should deduplicate rules in definitions', () => {
      const formatter = createSARIFFormatter({ includeRuleDefinitions: true });
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [
            createMockMessage({ ruleId: 'no-console', line: 1 }),
            createMockMessage({ ruleId: 'no-console', line: 5 }),
            createMockMessage({ ruleId: 'no-console', line: 10 }),
          ],
        }),
      ];

      const result = formatter(results);
      const sarif = JSON.parse(result) as SARIFLog;

      expect(sarif.runs[0].tool.driver.rules).toHaveLength(1);
      expect(sarif.runs[0].results).toHaveLength(3);
    });

    it('should produce valid JSON output', () => {
      const formatter = createSARIFFormatter();
      const results: ESLint.LintResult[] = [
        createMockResult({
          messages: [createMockMessage()],
        }),
      ];

      const result = formatter(results);
      
      // Should not throw
      expect(() => JSON.parse(result)).not.toThrow();
      
      // Should be pretty-printed (contains newlines)
      expect(result).toContain('\n');
    });
  });
});

