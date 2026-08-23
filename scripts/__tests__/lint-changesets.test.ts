/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the changeset quality gate.
 *
 * The gate's value is entirely in what it *rejects*, so the tests are mostly
 * negative cases. The one that matters is CS002: a breaking change published
 * to npm without an upgrade path. That is unrecoverable once published, so the
 * assertion that it blocks — and the assertions that it does not fire on the
 * shapes it must tolerate (a private app, a documented migration) — are what
 * keep the gate from being either useless or so annoying it gets disabled.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { lint, type Finding } from '../lint-changesets';

/** Privacy map injected so tests don't depend on the real workspace layout. */
const PRIVACY = new Map<string, boolean>([
  ['eslint-plugin-published', false],
  ['eslint-plugin-other', false],
  ['docs', true],
]);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'changeset-lint-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, frontmatter: string, summary: string) {
  writeFileSync(join(dir, name), `---\n${frontmatter}\n---\n\n${summary}\n`);
}

function rules(findings: Finding[]): string[] {
  return findings.map((f) => f.rule);
}

const MIGRATION_BODY = `
Some prose about what changed and why.

## Migration

\`\`\`diff
- createRule({ ... })
+ createRuleWithMeta({ ... })
\`\`\`
`;

describe('CS002 — breaking change needs a migration path', () => {
  it('blocks a major bump to a published package with no upgrade path', () => {
    write(
      'a.md',
      "'eslint-plugin-published': major",
      'feat: rework the resolver\n\nIt is different now.',
    );
    expect(rules(lint(dir, PRIVACY))).toContain('CS002');
  });

  it('blocks a `!`-marked change even at a minor bump', () => {
    write(
      'a.md',
      "'eslint-plugin-published': minor",
      'feat(x)!: drop the legacy option\n\nGone.',
    );
    expect(rules(lint(dir, PRIVACY))).toContain('CS002');
  });

  it('blocks a BREAKING CHANGE footer at a patch bump', () => {
    write(
      'a.md',
      "'eslint-plugin-published': patch",
      'fix: tighten the check\n\nBREAKING CHANGE: stricter now.',
    );
    expect(rules(lint(dir, PRIVACY))).toContain('CS002');
  });

  it('passes when the body documents the migration with an example', () => {
    write(
      'a.md',
      "'eslint-plugin-published': major",
      `feat: rework the resolver\n${MIGRATION_BODY}`,
    );
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS002');
  });

  it('rejects a migration heading with no code example', () => {
    // Prose reliably says what broke without ever saying what to type instead.
    write(
      'a.md',
      "'eslint-plugin-published': major",
      'feat: rework it\n\n## Migration\n\nUse the other function.',
    );
    expect(rules(lint(dir, PRIVACY))).toContain('CS002');
  });

  it('does not let a private major implicate a published patch', () => {
    // One changeset can bump the docs app major and a plugin patch. Reading
    // the major across the whole frontmatter demanded a migration guide for a
    // patch that breaks nothing for anyone.
    writeFileSync(
      join(dir, 'a.md'),
      "---\n'docs': major\n'eslint-plugin-published': patch\n---\n\nfix: stop flagging the PNG writer\n",
    );
    const found = rules(lint(dir, PRIVACY));

    expect(found).not.toContain('CS002');
    expect(found).not.toContain('CS003');
  });

  it('exempts private workspaces — nobody installs an app', () => {
    write('a.md', "'docs': major", 'feat: redesign the homepage\n\nAll new.');
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS002');
  });
});

describe('CS003 — a major needs more than a title', () => {
  it('blocks a published major with an empty body', () => {
    writeFileSync(
      join(dir, 'a.md'),
      "---\n'eslint-plugin-published': major\n---\n\nfeat: rework the resolver\n",
    );
    expect(rules(lint(dir, PRIVACY))).toContain('CS003');
  });

  it('does not fire for a private-only major', () => {
    writeFileSync(
      join(dir, 'a.md'),
      "---\n'docs': major\n---\n\nfeat: redesign the homepage\n",
    );
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS003');
  });
});

describe('CS004 — placeholder summaries', () => {
  it.each([
    'update deps',
    'WIP',
    'fix stuff',
    'TODO',
    'patch',
    'bump dependencies',
    'Improve things',
  ])('rejects %s', (summary) => {
    write('a.md', "'eslint-plugin-published': patch", summary);
    expect(rules(lint(dir, PRIVACY))).toContain('CS004');
  });

  it.each([
    'fix: widen the mongodb peer range to include v7',
    'update the peer range so npm stops warning on v7',
    'feat: add `no-alg-none` (CWE-347)',
  ])('accepts %s', (summary) => {
    write('a.md', "'eslint-plugin-published': patch", summary);
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS004');
  });
});

describe('CS005 / CS007 — length bounds', () => {
  it('rejects a summary too short to describe anything', () => {
    write('a.md', "'eslint-plugin-published': patch", 'fix: oops');
    expect(rules(lint(dir, PRIVACY))).toContain('CS005');
  });

  it('warns, but does not block, on an over-long title', () => {
    write(
      'a.md',
      "'eslint-plugin-published': patch",
      `fix: ${'x'.repeat(130)}`,
    );
    const findings = lint(dir, PRIVACY);
    expect(rules(findings)).toContain('CS007');
    expect(findings.find((f) => f.rule === 'CS007')?.level).toBe('warning');
  });
});

describe('CS006 — conventional prefix', () => {
  it('warns without blocking when there is no prefix', () => {
    write(
      'a.md',
      "'eslint-plugin-published': patch",
      'Widen the mongodb peer range to include v7',
    );
    const findings = lint(dir, PRIVACY);
    expect(rules(findings)).toContain('CS006');
    expect(findings.every((f) => f.level === 'warning')).toBe(true);
  });

  it('does not warn on a recognised prefix', () => {
    write(
      'a.md',
      "'eslint-plugin-published': patch",
      'fix(mongodb): widen the peer range to include v7',
    );
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS006');
  });

  it('does not treat arbitrary prose before a colon as a prefix', () => {
    write(
      'a.md',
      "'eslint-plugin-published': patch",
      'Note: the peer ranges are purely additive here',
    );
    // It should warn (no real prefix), not silently accept "note" as a type.
    expect(rules(lint(dir, PRIVACY))).toContain('CS006');
  });
});

describe('CS008 — duplicate titles', () => {
  it('flags two changesets with the same summary', () => {
    write(
      'a.md',
      "'eslint-plugin-published': patch",
      'fix: widen the mongodb peer range',
    );
    write(
      'b.md',
      "'eslint-plugin-other': patch",
      'fix: widen the mongodb peer range',
    );
    expect(rules(lint(dir, PRIVACY))).toContain('CS008');
  });
});

describe('tolerances', () => {
  it('ignores a deliberately empty changeset', () => {
    writeFileSync(join(dir, 'empty.md'), '---\n---\n');
    expect(lint(dir, PRIVACY)).toEqual([]);
  });

  it('ignores README.md', () => {
    writeFileSync(join(dir, 'README.md'), '# Changesets\n\nupdate stuff\n');
    expect(lint(dir, PRIVACY)).toEqual([]);
  });

  it('leaves malformed frontmatter to changeset-validity.test.ts', () => {
    writeFileSync(join(dir, 'broken.md'), 'no frontmatter at all\n');
    expect(lint(dir, PRIVACY)).toEqual([]);
  });

  it('passes a well-formed changeset cleanly', () => {
    write(
      'good.md',
      "'eslint-plugin-published': minor",
      'feat(published): add `no-alg-none` (CWE-347)\n\nRejects `alg: "none"` tokens at verify time.',
    );
    expect(lint(dir, PRIVACY)).toEqual([]);
  });
});

describe("the repo's own changesets", () => {
  it('pass the gate with no errors', () => {
    // Runs against `.changeset/` for real. Warnings are allowed; an error here
    // means a release is queued that should not ship as written.
    const errors = lint().filter((f) => f.level === 'error');
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
  });
});
