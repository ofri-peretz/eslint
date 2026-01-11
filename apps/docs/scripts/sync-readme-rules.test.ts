
import { describe, it, expect } from 'vitest';
import { parseRulesTable, extractRulesSection } from './sync-readme-rules.mjs';

describe('sync-readme-rules', () => {
  describe('parseRulesTable', () => {
    it('should parse a valid 10-column rules table', () => {
      const markdown = `
| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :-- | :---- | :--- | :---------- | :- | :- | :- | :- | :- |
| [no-bad-code](docs/rules/no-bad-code.md) | [CWE-79](https://cwe.mitre.org) | A1:Injection | 9.8 | Prevent bad code | 💼 | | 🔧 | | |
      `;
      
      const rules = parseRulesTable(markdown);
      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject({
        name: 'no-bad-code',
        cwe: 'CWE-79',
        owasp: 'A1:Injection',
        cvss: '9.8',
        description: 'Prevent bad code',
        recommended: true,
        fixable: true,
        warns: false,
        deprecated: false
      });
    });

    it('should ignore tables that do not start with "Rule"', () => {
      const markdown = `
| Category | Description |
| :------- | :---------- |
| Security | Security rules |
      `;
      const rules = parseRulesTable(markdown);
      expect(rules).toHaveLength(0);
    });

    it('should ignore tables with fewer than 10 columns', () => {
      const markdown = `
| Rule | Description |
| :--- | :---------- |
| rule | desc        |
      `;
      const rules = parseRulesTable(markdown);
      expect(rules).toHaveLength(0);
    });

    it('should ignore sub-category headers inside the table', () => {
      const markdown = `
| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :-- | :---- | :--- | :---------- | :- | :- | :- | :- | :- |
| **Injection** | | | | | | | | | |
| [rule-1](link) | CWE-1 | A1 | 5.0 | Desc | | | | | |
      `;
      const rules = parseRulesTable(markdown);
      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('rule-1');
    });

    it('should ignore separator rows', () => {
      const markdown = `
| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :-- | :---- | :--- | :---------- | :- | :- | :- | :- | :- |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
      `;
      const rules = parseRulesTable(markdown);
      expect(rules).toHaveLength(0);
    });
    
    it('should handle variations in whitespace', () => {
        const markdown = `
| Rule| CWE | OWASP |CVSS| Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :---| :-- | :---- |:---| :---------- | :- | :- | :- | :- | :- |
| [rule-1](link) | CWE-1 | A1 | 5.0 | Desc | | | | | |
        `;
        const rules = parseRulesTable(markdown);
        expect(rules).toHaveLength(1);
        expect(rules[0].cid).toBeUndefined(); // Checking object structure
    });
  });

  describe('extractRulesSection', () => {
    it('should extract rules section starting with "## Rules"', () => {
      const markdown = `
# Title

## Rules
| Rule | ... |
| -- | ... |

## Other Section
Content
      `;
      const section = extractRulesSection(markdown);
      expect(section).toContain('## Rules');
      expect(section).toContain('| Rule |');
      expect(section).not.toContain('## Other Section');
    });

    it('should extract rules section with "Available Rules" header', () => {
      const markdown = `
## Available Rules
Content
      `;
      const section = extractRulesSection(markdown);
      expect(section).toContain('## Available Rules');
    });
    
    it('should return null if no rules section found', () => {
        const markdown = `
# Title
## Usage
Content
        `;
        expect(extractRulesSection(markdown)).toBeNull();
    });
  });
});
