import { describe, it, expect } from 'vitest';
import { firstSentence } from '../scripts/sync-plugin-stats.ts';

/**
 * Guards the docs plugin-card summary against mid-word truncation.
 *
 * The generator used to do `description.split('.')[0]`, which cut every
 * package description at its first period. Package descriptions legitimately
 * contain dotted terms, so the docs site rendered "ESLint plugin for Node"
 * for eslint-plugin-node-security.
 *
 * Lives in tests/ rather than beside the script: apps/docs/vitest.config.ts
 * only discovers tests/** and src/__tests__/**, so a sibling
 * scripts/*.test.ts file would never run.
 */
describe('firstSentence', () => {
  it('keeps dotted terms intact instead of cutting at the first period', () => {
    expect(firstSentence('ESLint plugin for Node.js security — detects command injection')).toBe(
      'ESLint plugin for Node.js security — detects command injection',
    );
    expect(firstSentence('ESLint plugin for Express.js security — detects permissive CORS')).toBe(
      'ESLint plugin for Express.js security — detects permissive CORS',
    );
    expect(firstSentence('Drop-in replacement, 3.1x faster end-to-end')).toBe(
      'Drop-in replacement, 3.1x faster end-to-end',
    );
    expect(firstSentence('Auto-fixes legacy patterns to ES2022+ (Array.at, template literals)')).toBe(
      'Auto-fixes legacy patterns to ES2022+ (Array.at, template literals)',
    );
    expect(firstSentence('Bans verbose error messages and process.exit calls')).toBe(
      'Bans verbose error messages and process.exit calls',
    );
  });

  it('cuts at a real sentence boundary', () => {
    expect(firstSentence('First sentence. Second sentence.')).toBe('First sentence');
    expect(firstSentence('Only one sentence.')).toBe('Only one sentence');
    expect(firstSentence('No trailing period')).toBe('No trailing period');
  });

  it('returns an empty string for a missing description', () => {
    expect(firstSentence(undefined)).toBe('');
    expect(firstSentence('')).toBe('');
  });
});
