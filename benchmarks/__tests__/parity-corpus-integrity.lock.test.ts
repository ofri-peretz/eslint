/*
 * The parity corpus has to be the test cases, not a damaged copy of them.
 *
 * Three defects in the harvester made ILB-Oxlint-Parity report 99.0% with 112
 * divergences (#912), none of which was a rule behaving differently:
 *
 *   1. Fixtures were written `.js` while carrying TypeScript. ESLint's bench
 *      config parses `.js` with the TS parser, oxlint refuses it, and a file
 *      neither engine lints scores every ESLint finding as an oxlint gap.
 *   2. `code:` blocks were matched with a non-greedy regex to a backtick, so
 *      a case containing a nested template literal ended at the inner one —
 *      truncated mid-expression, backslashes intact. It also matched only part
 *      of the corpus: fixing it took 3,971 fixtures to 9,384.
 *   3. Nothing checked a block was a valid standalone module.
 *
 * These assert the shape that cannot produce any of the three again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { codeBlocks } from '../suites/ilb-oxlint-parity/harvest-fixtures.ts';

const HARVESTER = fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../suites/ilb-oxlint-parity/harvest-fixtures.ts',
  ),
  'utf-8',
);
const RUN = fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../suites/ilb-oxlint-parity/run.ts',
  ),
  'utf-8',
);

describe('harvested fixtures keep the syntax they were written in', () => {
  it('never writes a .js fixture', () => {
    // The whole of #912. `.ts` parses both JS and TS; `.js` parses only one of
    // them and silently drops every TS case into "oxlint missed it".
    expect(HARVESTER).not.toMatch(/\$\{hash\}\.js/);
    expect(HARVESTER).toMatch(/\$\{hash\}\.ts/);
  });

  it('does not go back to guessing at TypeScript with regexes', () => {
    // Two patterns used to try to spot TS syntax and skip the block. Both
    // leaked — `'x' as string` and `public c!: T` match neither.
    expect(HARVESTER).not.toMatch(/satisfies\\b\|/);
    expect(HARVESTER).not.toMatch(
      /string\|number\|boolean\|any\|void\|never\|unknown/,
    );
  });
});

describe('code blocks are read with a parser, not a regex', () => {
  it('keeps a case containing a nested template literal whole', () => {
    // THE regression. The old regex ended the block at the escaped backtick,
    // so this fixture used to stop after `Context: ` and lose the rest.
    // Both the backticks and the `${` are escaped, exactly as a real test
    // file escapes them — which is what makes this a single no-substitution
    // template and what the old regex tripped over.
    const src =
      'const t = { code: `const p = \\`Context: \\${x}\\`; call(p);` };';

    const blocks = codeBlocks(src, 'sample.test.ts');
    expect(blocks).toHaveLength(1);
    // Cooked text: the escapes are resolved, which is the source the rule
    // actually sees when RuleTester runs the case.
    expect(blocks[0]).toBe('const p = `Context: ${x}`; call(p);');
    expect(blocks[0]).not.toContain('\\`');
  });

  it('skips a template built at runtime, whose text is not the code', () => {
    const src = 'const t = { code: `before ${VARIABLE} after` };';
    expect(codeBlocks(src, 'sample.test.ts')).toEqual([]);
  });

  it('reads a plain string case too', () => {
    const src = `const t = { code: "const a = 1;" };`;
    expect(codeBlocks(src, 'sample.test.ts')).toEqual(['const a = 1;']);
  });
});

describe('the corpus is validated, and not by the engine under test', () => {
  it('judges fixtures with TypeScript, never with oxlint', () => {
    // Asking oxlint which files it will be graded on is how a real parser gap
    // disappears into a shrinking corpus.
    expect(HARVESTER).toMatch(/ts\.createSourceFile/);
    expect(HARVESTER).toMatch(/parseDiagnostics/);
    // Naming oxlint in a comment is fine; running it here is not. The
    // harvester must never shell out to the engine it is building input for.
    expect(HARVESTER).not.toMatch(/execFileSync|execSync|spawnSync/);
  });

  it('sends JSX to .tsx rather than dropping it', () => {
    expect(HARVESTER).toMatch(/ScriptKind\.TSX/);
    expect(HARVESTER).toMatch(/renameSync/);
    // The old JSX guess, with its `continue`, must not come back as code.
    // (The comment recording that it existed is expected to stay.)
    expect(HARVESTER).not.toMatch(/if \(code\.includes\('<'\)/);
  });

  it('names every fixture it drops', () => {
    // A silent drop is a corpus that shrinks without anyone noticing.
    expect(HARVESTER).toMatch(/dropped \$\{invalid\.length\}/);
  });
});

describe('oxlint is never asked to lint the corpus in one argv', () => {
  it('batches the file list', () => {
    // At 9,384 files the single-argv spawn failed with pid 0 and no stdout,
    // which the catch would have read as "oxlint found nothing".
    expect(RUN).toMatch(/runOxlintBatched/);
    expect(RUN).toMatch(/ARGV_BUDGET_BYTES/);
  });

  it('treats a batch with no output as a failure, never as zero findings', () => {
    expect(RUN).toMatch(/oxlint produced no output for a batch/);
  });
});
