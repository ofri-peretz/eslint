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

  it('blocks a quoted published major — the regex parser missed these', () => {
    // `"eslint-plugin-published": "major"` is valid YAML that changesets
    // parses. The hand-rolled regex read it as zero releases, so the one case
    // this gate exists for slipped through silently.
    writeFileSync(
      join(dir, 'a.md'),
      '---\n"eslint-plugin-published": "major"\n---\n\nfeat: rework the resolver\n\nIt is different now.\n',
    );
    // CS002 only: the fixture has a body, and CS003 fires on an empty one.
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

describe('CS009 — cross-package scope', () => {
  // These cases use real plugin and rule names on purpose. CS009's whole
  // question is "who owns this rule", and ownership is read from the actual
  // `packages/` tree — a synthetic `eslint-plugin-published` owns nothing, so a
  // fixture built from the names the rest of this file uses could never fire
  // and would pass no matter how broken the check was.
  const JWT = 'eslint-plugin-jwt-security';
  const NODE = 'eslint-plugin-node-security';

  it('reports one changeset describing rules from two of its packages', () => {
    // The shape that shipped: both CHANGELOGs got both paragraphs, so each
    // package advertised the other's rules.
    write(
      'cross.md',
      `'${JWT}': patch\n'${NODE}': patch`,
      'fix: two detections we were missing\n\n' +
        '`crypto.pseudoRandomBytes()` is now reported by `no-math-random-crypto`.\n\n' +
        '`no-decode-without-verify` and `require-expiration` skip test files.',
    );
    expect(rules(lint(dir, PRIVACY))).toContain('CS009');
  });

  it('allows a multi-package changeset that names no rules', () => {
    write(
      'shared.md',
      `'${JWT}': patch\n'${NODE}': patch`,
      'fix: point meta.docs.url at documentation that exists\n\n' +
        'The URL ESLint hands to editors was wrong across the plugins.',
    );
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS009');
  });

  it('allows a multi-package changeset naming rules from only one of them', () => {
    // A shared infrastructure change where only one package's behaviour moved
    // is accurately described by the same body in both changelogs.
    write(
      'one-sided.md',
      `'${JWT}': patch\n'${NODE}': patch`,
      'fix: shared resolver change\n\n' +
        'Only `no-decode-without-verify` changed behaviour; the other package ' +
        'picks up the new resolver.',
    );
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS009');
  });

  it('never reports a single-package changeset, whatever it names', () => {
    // One package cannot contaminate another, so naming a foreign rule here is
    // a cross-reference, not a mis-scope.
    write(
      'single.md',
      `'${JWT}': patch`,
      'fix: three rules tightened\n\n' +
        '`no-decode-without-verify`, `require-expiration` and ' +
        '`no-math-random-crypto`.',
    );
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS009');
  });

  it('sees scoped, fully-qualified rule references', () => {
    // `@scope/eslint-plugin-x/rule` has two slashes. Splitting on the first
    // yielded `eslint-plugin-x/rule`, which matches no bare rule key — the
    // check saw an empty set and passed a genuinely cross-scoped changeset.
    write(
      'scoped.md',
      `'${JWT}': patch\n'${NODE}': patch`,
      'fix: two detections we were missing\n\n' +
        'Adds `@interlace/eslint-plugin-node-security/no-math-random-crypto` and ' +
        'relaxes `@interlace/eslint-plugin-jwt-security/no-decode-without-verify`.',
    );
    expect(rules(lint(dir, PRIVACY))).toContain('CS009');
  });

  it('ignores rule names that are not in backticks', () => {
    // Prose mentioning a rule in passing is not a claim of ownership; matching
    // bare words would fire on ordinary sentences.
    write(
      'prose.md',
      `'${JWT}': patch\n'${NODE}': patch`,
      'fix: wording\n\n' +
        'Mentions no-math-random-crypto and no-decode-without-verify as prose.',
    );
    expect(rules(lint(dir, PRIVACY))).not.toContain('CS009');
  });
});
