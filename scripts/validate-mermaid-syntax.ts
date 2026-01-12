#!/usr/bin/env node
/**
 * Mermaid Syntax Validator
 * 
 * Validates that all Mermaid diagrams in markdown files follow proper syntax.
 * This prevents client-side rendering errors by catching common syntax mistakes.
 * 
 * Common issues detected:
 * - Arrow labels with quotes and pipes: -->"|label|" (INVALID)
 * - Should be: -->|label| (VALID)
 * - Malformed brackets in node definitions
 */

import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { relative } from 'path';

interface InvalidPattern {
  name: string;
  pattern: RegExp;
  fix: string;
  example: {
    wrong: string;
    right: string;
  };
}

interface ValidationError {
  file: string;
  line: number;
  blockStart: number;
  issue: string;
  content: string;
  fix: string;
  example: {
    wrong: string;
    right: string;
  };
}

const INVALID_PATTERNS: InvalidPattern[] = [
  {
    name: 'Quoted pipe labels in arrows',
    pattern: /-->\s*"\|[^"]*\|/,
    fix: 'Remove quotes from arrow labels. Use -->|label| instead of -->"|label|"',
    example: {
      wrong: '  App[Application] -->"|Log(password)| LogFile[Log]"',
      right: '  App[Application] -->|Log password| LogFile[Log]'
    }
  },
  {
    name: 'Unclosed brackets in node definitions',
    pattern: /\[[^\]]*\|[^\]]*"/,
    fix: 'Ensure brackets are properly closed in node definitions',
    example: {
      wrong: '  Node[Text | More Text"',
      right: '  Node[Text More Text]'
    }
  }
];

function validateMermaidSyntax(filePath: string, content: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  let inMermaidBlock = false;
  let mermaidStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Track Mermaid blocks
    if (line.trim().startsWith('```mermaid')) {
      inMermaidBlock = true;
      mermaidStart = lineNum;
      continue;
    }
    if (inMermaidBlock && line.trim() === '```') {
      inMermaidBlock = false;
      continue;
    }

    // Only check lines inside Mermaid blocks
    if (!inMermaidBlock) continue;

    // Check for invalid patterns
    for (const { name, pattern, fix, example } of INVALID_PATTERNS) {
      if (pattern.test(line)) {
        errors.push({
          file: filePath,
          line: lineNum,
          blockStart: mermaidStart,
          issue: name,
          content: line.trim(),
          fix,
          example
        });
      }
    }
  }

  return errors;
}

function main(): void {
  const patterns = [
    'packages/**/docs/**/*.md',
    'apps/docs/content/**/*.mdx',
    'apps/docs/content/**/*.md'
  ];

  let allErrors: ValidationError[] = [];

  for (const pattern of patterns) {
    const files = globSync(pattern, { nodir: true });
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        if (!content.includes('mermaid')) continue;

        const errors = validateMermaidSyntax(relative(process.cwd(), file), content);
        allErrors = allErrors.concat(errors);
      } catch (err) {
        console.error(`Error reading ${file}:`, (err as Error).message);
      }
    }
  }

  if (allErrors.length === 0) {
    console.log('✅ All Mermaid diagrams are valid!');
    process.exit(0);
  }

  // Report errors
  console.error(`\n❌ Found ${allErrors.length} Mermaid syntax error(s):\n`);
  
  for (const error of allErrors) {
    console.error(`${error.file}:${error.line}`);
    console.error(`  Issue: ${error.issue}`);
    console.error(`  Line: ${error.content}`);
    console.error(`  Fix: ${error.fix}`);
    console.error(`  Example:`);
    console.error(`    ❌ Wrong: ${error.example.wrong}`);
    console.error(`    ✅ Right: ${error.example.right}`);
    console.error('');
  }

  process.exit(1);
}

main();
