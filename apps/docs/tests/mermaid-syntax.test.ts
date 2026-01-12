import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'glob';

/**
 * Mermaid Syntax Validation Tests
 * 
 * These tests ensure all Mermaid diagrams in documentation follow proper syntax
 * to prevent client-side rendering errors.
 */

interface Violation {
  file: string;
  line: number;
  content: string;
}

describe('Mermaid Diagram Syntax Validation', () => {
  describe('Invalid Arrow Label Patterns', () => {
    it('should not contain quoted pipe labels in arrows (e.g., -->"|label|")', () => {
      const invalidPattern = /-->\s*"\|[^"]*\|/;
      const files = [
        ...globSync('../../packages/**/docs/**/*.md', { nodir: true }),
        ...globSync('content/**/*.mdx', { nodir: true }),
        ...globSync('content/**/*.md', { nodir: true })
      ];

      const violations: Violation[] = [];

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (!content.includes('mermaid')) continue;

        const lines = content.split('\n');
        let inMermaid = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('```mermaid')) {
            inMermaid = true;
            continue;
          }
          if (inMermaid && line.trim() === '```') {
            inMermaid = false;
            continue;
          }

          if (inMermaid && invalidPattern.test(line)) {
            violations.push({
              file: file.replace(process.cwd() + '/', ''),
              line: i + 1,
              content: line.trim()
            });
          }
        }
      }

      if (violations.length > 0) {
        const errorMsg = violations
          .map(v => `  ${v.file}:${v.line}\n    ${v.content}`)
          .join('\n\n');
        
        expect.fail(
          `Found ${violations.length} Mermaid diagram(s) with invalid arrow label syntax:\n\n${errorMsg}\n\n` +
          `Use -->|label| instead of -->"|label|"`
        );
      }

      expect(violations).toHaveLength(0);
    });

    it('should not contain unclosed brackets in node definitions', () => {
      const invalidPattern = /\[[^\]]*\|[^\]]*"/;
      const files = [
        ...globSync('../../packages/**/docs/**/*.md', { nodir: true }),
        ...globSync('content/**/*.mdx', { nodir: true })
      ];

      const violations: Violation[] = [];

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (!content.includes('mermaid')) continue;

        const lines = content.split('\n');
        let inMermaid = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('```mermaid')) {
            inMermaid = true;
            continue;
          }
          if (inMermaid && line.trim() === '```') {
            inMermaid = false;
            continue;
          }

          if (inMermaid && invalidPattern.test(line)) {
            violations.push({
              file: file.replace(process.cwd() + '/', ''),
              line: i + 1,
              content: line.trim()
            });
          }
        }
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Valid Mermaid Syntax Examples', () => {
    it('should accept properly formatted arrow labels', () => {
      const validExamples = [
        'A -->|Label| B[Node]',
        'Start -->|User Action| Process{Decision}',
        'App[Application] -->|Send Data| API[API Server]',
        'Node1 --> Node2',
        'A -->|Safe Pattern| Match[Match/No Match Fast]'
      ];

      const invalidPattern = /-->\s*"\|[^"]*\|/;

      for (const example of validExamples) {
        expect(invalidPattern.test(example)).toBe(false);
      }
    });

    it('should reject improperly formatted arrow labels', () => {
      const invalidExamples = [
        'A -->"|Label| B[Node]"',
        'Start -->"|User Action| Process{Decision}"',
        'App[Application] -->"|Log(password)| LogFile[📝 Log File]"',
        'Construct -->"|Unescaped| Risk[🚨 ReDoS]"'
      ];

      const invalidPattern = /-->\s*"\|[^"]*\|/;

      for (const example of invalidExamples) {
        expect(invalidPattern.test(example)).toBe(true);
      }
    });
  });

  describe('Mermaid Block Detection', () => {
    it('should only validate content inside mermaid blocks', () => {
      const content = `
# Some markdown

This is not in a mermaid block: -->"|Should Ignore|"

\`\`\`mermaid
flowchart TD
  A -->|Valid| B
\`\`\`

More markdown with -->"|Still Ignore|"
      `.trim();

      const lines = content.split('\n');
      let inMermaid = false;
      let foundInvalid = false;

      for (const line of lines) {
        if (line.trim().startsWith('```mermaid')) {
          inMermaid = true;
          continue;
        }
        if (inMermaid && line.trim() === '```') {
          inMermaid = false;
          continue;
        }

        if (inMermaid && /-->\s*"\|[^"]*\|/.test(line)) {
          foundInvalid = true;
        }
      }

      expect(foundInvalid).toBe(false);
    });
  });

  describe('File Coverage', () => {
    it('should scan all documentation markdown files', () => {
      const mdFiles = globSync('../../packages/**/docs/**/*.md', { nodir: true });
      const mdxFiles = globSync('content/**/*.{md,mdx}', { nodir: true });
      
      const totalFiles = mdFiles.length + mdxFiles.length;
      
      // Ensure we're actually checking files
      expect(totalFiles).toBeGreaterThan(0);
      
      console.log(`  ℹ️  Scanned ${totalFiles} documentation files for Mermaid syntax`);
    });
  });
});

describe('Mermaid Syntax Regression Prevention', () => {
  it('should document the correct syntax for arrow labels', () => {
    const correctSyntax = {
      description: 'Mermaid arrow labels should use pipes without quotes',
      correct: [
        'A -->|Label Text| B',
        'Node1 -->|Action| Node2[Result]',
        'Start -->|Process| End'
      ],
      incorrect: [
        'A -->"|Label Text| B"',
        'Node1 -->"|Action| Node2[Result]"',
        'Start -->"|Process| End"'
      ]
    };

    expect(correctSyntax.correct).toBeDefined();
    expect(correctSyntax.incorrect).toBeDefined();
    expect(correctSyntax.description).toBeTruthy();
  });
});
