/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `AI_SDLC.md` is the map. This asserts the map matches the territory.
 *
 * The document's whole claim is that every stage names a **command that fails**
 * when the stage's contract stops holding. That claim decays silently: rename
 * an npm script, delete a philosophy doc, and the table still reads as though
 * the gate is there. Nobody re-reads a document to check its footnotes, and an
 * agent following it would run a command that does not exist and take the
 * error for an environment problem.
 *
 * This repo has now found six green checks that verified nothing. A governance
 * document describing gates that do not exist would be the seventh, and the
 * most expensive, because everything else defers to it.
 *
 * Deliberately NOT asserted: the numbers in the prose. They are snapshots with
 * dates attached and go stale by design — pinning them would turn every
 * ordinary ratchet movement into a docs failure, and the gate would be deleted
 * within a month. Structure and references are checkable; a measurement is
 * only ever true as of its run.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const DOC = readFileSync(join(ROOT, 'AI_SDLC.md'), 'utf8');
const SCRIPTS: Record<string, string> = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
).scripts;

/** The six stages, in order. Renaming one is a deliberate act, not a typo. */
const STAGES = ['Plan', 'Design', 'Build', 'Test', 'Deploy', 'Maintain'];

/**
 * Every backticked npm-script-shaped token in the document.
 *
 * `check-changeset-coverage` and `check-new-rule-cases` are referenced by
 * SCRIPT FILE name in places and by npm-script name in others, so both spellings
 * are resolved — a doc that names the file is not wrong, it is just not an
 * npm script.
 *
 * The character class is wider than npm's own convention on purpose. It was
 * `[a-z0-9:-]`, and a sabotage probe that renamed a command to
 * `check:rule-caseZ` passed: the regex stopped at the capital, found no
 * closing backtick, and dropped the token instead of reporting it. A checker
 * that silently ignores exactly the malformed input it exists to catch is the
 * failure mode this whole file is about.
 */
function referencedCommands(): string[] {
  return [
    ...new Set(
      [...DOC.matchAll(/`((?:check|lint|audit):[A-Za-z0-9:._-]+)`/g)].map(
        (m) => m[1],
      ),
    ),
  ].sort();
}

/** Every backticked relative path that looks like a repo file. */
function referencedFiles(): string[] {
  return [
    ...new Set(
      [...DOC.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|mjs|json|ts))`/g)]
        .map((m) => m[1])
        // Bare filenames with no directory are usually generic prose
        // ("a package.json"), not a claim that a specific file exists.
        .filter((f) => f.includes('/')),
    ),
  ].sort();
}

describe('AI_SDLC.md describes gates that exist', () => {
  it('names at least one command per stage', () => {
    // A stage with no command is a stage with no enforcement, which is the
    // exact thing this document was written to stop being true.
    expect(referencedCommands().length).toBeGreaterThanOrEqual(STAGES.length);
  });

  it('every `check:` / `lint:` / `audit:` command it names is a real npm script', () => {
    const missing = referencedCommands().filter((c) => !(c in SCRIPTS));
    expect(
      missing,
      'AI_SDLC.md names these commands; package.json has no such script. ' +
        'Either the script was renamed and the doc was not, or the doc ' +
        'promises a gate that does not exist.',
    ).toEqual([]);
  });

  it('every repo file it points at is present', () => {
    const missing = referencedFiles().filter(
      (f) => !existsSync(join(ROOT, f.replace(/^\.\//, ''))),
    );
    expect(
      missing,
      'AI_SDLC.md references these paths and they are not in the repo.',
    ).toEqual([]);
  });

  it('still has all six stages, in order', () => {
    const found = STAGES.filter((s) => DOC.includes(`**${s}**`));
    expect(found).toEqual(STAGES);
  });

  it('every stage row in the table carries an enforcing command', () => {
    // The table is the contract in one screen. A row whose "Enforced by"
    // column is empty, or still says `(gap)`, is a stage nothing defends —
    // fine as a temporary admission, never something to lose track of.
    const rows = [
      ...DOC.matchAll(/^\|\s*\d+\s*\|\s*\*\*(\w+)\*\*\s*\|(.+)$/gm),
    ];
    expect(rows.length).toBe(STAGES.length);

    const undefended = rows
      .filter(([, , rest]) => {
        const columns = rest.split('|').map((c) => c.trim());
        // artifact | enforced-by | number
        return (
          columns.length < 2 || columns[1] === '' || /\(gap\)/.test(columns[1])
        );
      })
      .map(([, stage]) => stage);

    expect(
      undefended,
      'These stages name no gate. If that is deliberate, the row should say ' +
        'so and the gap belongs in the "What is missing" table with a status.',
    ).toEqual([]);
  });
});

describe('the gaps table is honest about what is closed', () => {
  it('every row marked Closed names the thing that closes it', () => {
    // "Closed." with no mechanism is how a gap list turns into a wish list.
    const closed = [
      ...DOC.matchAll(/\|\s*\d+\s*\|([^|]+)\|([^|]+)\|([^|]*Closed[^|]*)\|/g),
    ];
    expect(closed.length).toBeGreaterThan(0);

    const vague = closed
      .filter(([, , , status]) => !/`[^`]+`/.test(status))
      .map(([, gap]) => gap.trim());

    expect(
      vague,
      'These gaps claim to be closed but name no command, file or test.',
    ).toEqual([]);
  });
});
