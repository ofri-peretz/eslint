/**
 * The prover is itself a gate, so its argv contract is locked: `--file` must
 * accept the spelling its own usage text documents, and `--update` must not
 * become the hatch that banks unproven debt from a scoped run.
 */
import { describe, it, expect } from 'vitest';
import { readFlag, scopedUpdate } from '../lib/prover-args.js';

describe('lock prover argv contract', () => {
  /**
   * @provenBy {"file":"scripts/lib/prover-args.ts","find":"  const i = argv.indexOf(flag);","replace":"  const i = -1;"}
   */
  it('reads both documented spellings of --file', () => {
    expect(readFlag(['--file=a.test.ts'], '--file')).toBe('a.test.ts');
    expect(readFlag(['--file', 'a.test.ts'], '--file')).toBe('a.test.ts');
    expect(readFlag(['--update'], '--file')).toBeUndefined();
  });

  /**
   * @provenBy {"file":"scripts/lib/prover-args.ts","find":"  return argv.includes('--update') && readFlag(argv, '--file') !== undefined;","replace":"  return false;"}
   */
  it('rejects a scoped --update, in either --file spelling', () => {
    expect(scopedUpdate(['--file=a.test.ts', '--update'])).toBe(true);
    expect(scopedUpdate(['--file', 'a.test.ts', '--update'])).toBe(true);
    expect(scopedUpdate(['--update'])).toBe(false);
    expect(scopedUpdate(['--file=a.test.ts'])).toBe(false);
  });
});
