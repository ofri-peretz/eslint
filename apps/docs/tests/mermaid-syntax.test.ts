import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const DOCS_DIR = dirname(fileURLToPath(import.meta.url)) + '/..';
const ROOT = resolve(DOCS_DIR, '..', '..');

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

/**
 * Extract every line that sits inside a ```mermaid fence.
 *
 * Pure, and reused by the block-detection test below so that test exercises the
 * real parser instead of an inline copy of it.
 */
function collectMermaidLines(content: string, file: string): Violation[] {
  const lines = content.split('\n');
  const inside: Violation[] = [];
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

    if (inMermaid) {
      inside.push({ file, line: i + 1, content: line.trim() });
    }
  }

  return inside;
}

/**
 * Syntax faults checked against every diagram line. Add a row to check another
 * pattern — the corpus is scanned once and every pattern is applied in that one
 * pass, so a new check costs no extra I/O.
 */
const CHECKS = {
  quotedPipeLabels: /-->\s*"\|[^"]*\|/,
  unclosedBrackets: /\[[^\]]*\|[^\]]*"/,
} as const;

type CheckKey = keyof typeof CHECKS;

interface Corpus {
  /** Every documentation file considered, whether or not it holds a diagram. */
  files: string[];
  /** How many files actually contained at least one diagram. */
  filesWithDiagrams: number;
  /** Total lines inside ```mermaid fences — the anti-vacuous signal. */
  diagramLines: number;
  /** Matching lines per check. Only violations are retained, never the corpus. */
  violations: Record<CheckKey, Violation[]>;
}

let corpusCache: Corpus | undefined;

/**
 * Glob + read the documentation corpus exactly once per test process.
 *
 * Each scan test used to glob and read the same ~969 files independently, so a
 * cold page cache paid for two full passes — measured 4653ms + 4074ms cold vs
 * 1553ms + 1240ms warm. That put both tests within reach of a timeout under the
 * parallel `turbo run test` fan-out the lefthook pre-push `tests` hook runs,
 * which starves every task for I/O. One shared pass roughly halves the cold cost
 * and makes every test after the first free. Reduce the work, don't widen the
 * timeout — `testTimeout` in vitest.config.ts is the safety net, not the fix.
 *
 * Only matching lines are retained; materializing all ~4969 diagram lines cost
 * an extra ~685ms warm for data no passing run ever reads.
 *
 * Memoized lazily rather than at module scope so the cost lands inside a test's
 * timeout budget instead of during collection.
 */
function docsCorpus(): Corpus {
  if (corpusCache) return corpusCache;

  const files = [
    ...globSync('packages/**/docs/**/*.md', {
      cwd: ROOT,
      absolute: true,
      nodir: true,
    }),
    ...globSync('content/**/*.{md,mdx}', {
      cwd: DOCS_DIR,
      absolute: true,
      nodir: true,
    }),
  ];

  const violations = {
    quotedPipeLabels: [] as Violation[],
    unclosedBrackets: [] as Violation[],
  } satisfies Record<CheckKey, Violation[]>;
  let filesWithDiagrams = 0;
  let diagramLines = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (!content.includes('mermaid')) continue;

    const inside = collectMermaidLines(content, relative(ROOT, file));
    if (inside.length > 0) filesWithDiagrams++;
    diagramLines += inside.length;

    for (const line of inside) {
      for (const key of Object.keys(CHECKS) as CheckKey[]) {
        if (CHECKS[key].test(line.content)) violations[key].push(line);
      }
    }
  }

  corpusCache = { files, filesWithDiagrams, diagramLines, violations };
  return corpusCache;
}

function formatViolations(violations: Violation[]): string {
  return violations
    .map((v) => `  ${v.file}:${v.line}\n    ${v.content}`)
    .join('\n\n');
}

describe('Mermaid Diagram Syntax Validation', () => {
  describe('Invalid Arrow Label Patterns', () => {
    it('should not contain quoted pipe labels in arrows (e.g., -->"|label|")', () => {
      const violations = docsCorpus().violations.quotedPipeLabels;

      if (violations.length > 0) {
        expect.fail(
          `Found ${violations.length} Mermaid diagram(s) with invalid arrow label syntax:\n\n${formatViolations(violations)}\n\n` +
            `Use -->|label| instead of -->"|label|"`
        );
      }

      expect(violations).toHaveLength(0);
    });

    it('should not contain unclosed brackets in node definitions', () => {
      const violations = docsCorpus().violations.unclosedBrackets;

      if (violations.length > 0) {
        expect.fail(
          `Found ${violations.length} Mermaid diagram(s) with unclosed brackets:\n\n${formatViolations(violations)}`
        );
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

      const inside = collectMermaidLines(content, 'fixture.md');

      // The parser must pick up the fenced lines...
      expect(inside.map((l) => l.content)).toEqual([
        'flowchart TD',
        'A -->|Valid| B',
      ]);

      // ...and must not leak the prose lines that look like violations.
      const invalidPattern = /-->\s*"\|[^"]*\|/;
      expect(inside.some((l) => invalidPattern.test(l.content))).toBe(false);
    });
  });

  describe('File Coverage', () => {
    it('should scan all documentation markdown files', () => {
      const { files, diagramLines, filesWithDiagrams } = docsCorpus();

      // Anti-vacuous guard. Both scan tests above assert "no violations found",
      // which passes identically against an empty corpus — a wrong cwd, a moved
      // content dir, or a broken glob would turn this suite green while checking
      // nothing. Pin that the scan actually reached real diagrams.
      expect(files.length).toBeGreaterThan(0);
      expect(filesWithDiagrams).toBeGreaterThan(50);
      expect(diagramLines).toBeGreaterThan(0);

      console.log(
        `  ℹ️  Scanned ${files.length} documentation files, ` +
          `${filesWithDiagrams} with Mermaid diagrams ` +
          `(${diagramLines} diagram lines)`
      );
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
