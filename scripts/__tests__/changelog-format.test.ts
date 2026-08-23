/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock for release-note generation.
 *
 * Two independent failures are pinned here, both of which shipped silently
 * for months because nothing asserted the *shape* of a CHANGELOG:
 *
 * 1. **Insertion point.** `@changesets/apply-release-plan` decides where to
 *    prepend a new version with `/^#{1,6}\s+\d+\.\d+/.test(fileData)`. Our
 *    legacy files opened with `## [1.4.0] - 2026-05-03`; the `[` fails that
 *    test, so changesets treated the heading as the file's *title* and filed
 *    every later release underneath it. Twenty of twenty-two packages ended
 *    up advertising a stale version on line 1 with their `# Changelog` H1
 *    buried a thousand lines down. The invariant that prevents it is exactly
 *    "the file starts with an H1", so that is what is asserted — on the real
 *    files, not a fixture, because the drift is what regresses.
 *
 * 2. **Line formatting.** `.changeset/changelog.cjs` classifies each entry
 *    from its conventional-commit prefix. `scripts/release-notes.ts` parses
 *    those badges back out to group the cross-package rollup. The two are a
 *    private protocol with no type between them, so a badge renamed on one
 *    side silently drops entries into "Other changes" on the other. The
 *    round-trip is asserted directly.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

import { canonical, normalize } from '../normalize-changelogs';

const REPO_ROOT = resolve(__dirname, '..', '..');
const WORKSPACE_ROOTS = ['packages', 'apps'];

const require = createRequire(import.meta.url);
const changelog = require(join(REPO_ROOT, '.changeset', 'changelog.cjs'));
const { parseSummary } = changelog.__internal;

function workspaceDirs(): string[] {
  const dirs: string[] = [];
  for (const root of WORKSPACE_ROOTS) {
    const rootPath = join(REPO_ROOT, root);
    if (!existsSync(rootPath)) continue;
    for (const entry of readdirSync(rootPath)) {
      if (existsSync(join(rootPath, entry, 'package.json')))
        dirs.push(join(rootPath, entry));
    }
  }
  return dirs;
}

describe('CHANGELOG.md shape', () => {
  const dirs = workspaceDirs().filter((d) =>
    existsSync(join(d, 'CHANGELOG.md')),
  );

  it('finds changelogs to check (guards against a vacuous pass)', () => {
    // Without this, every assertion below passes trivially if the glob breaks
    // or the roots are renamed — the classic scan-and-assert-nothing lock.
    expect(dirs.length).toBeGreaterThan(10);
  });

  it.each(dirs)(
    '%s starts with an H1 so changesets prepends correctly',
    (dir) => {
      const first = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8').split(
        '\n',
      )[0];

      expect(first, `${dir}/CHANGELOG.md must open with an H1 title`).toMatch(
        /^# \S/,
      );
      // The precise condition from apply-release-plan's `prependFile`. If this
      // were true, changesets would prepend above the title and orphan it.
      expect(/^#{1,6}\s+\d+\.\d+/.test(first)).toBe(false);
    },
  );

  it.each(dirs)('%s has version sections in descending semver order', (dir) => {
    const headings = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')
      .split('\n')
      .filter((l) => /^##\s/.test(l))
      .map((l) => /^##\s+(\d+)\.(\d+)\.(\d+)/.exec(l))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const);

    const sorted = [...headings].sort(
      (a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2],
    );
    expect(headings).toEqual(sorted);
  });

  it('is already canonical — `changelog:normalize` would be a no-op', async () => {
    // Equivalent to the `--check` CI gate, run here so a local `vitest` catches
    // drift before it reaches a Version PR. Uses `canonical`, not `normalize`,
    // so this covers the Prettier layer too — markdown style in these files is
    // otherwise consistent only by luck, since no CI job formats them.
    for (const dir of dirs) {
      const pkgName = JSON.parse(
        readFileSync(join(dir, 'package.json'), 'utf8'),
      ).name as string;
      const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8');
      await expect(
        canonical(content, pkgName),
        `${dir}/CHANGELOG.md is not canonical`,
      ).resolves.toBe(content);
    }
  }, 60_000);
});

describe('normalize()', () => {
  it('rewrites the legacy dated heading that broke changesets, keeping the date', () => {
    const out = normalize('## [1.4.0] - 2026-05-03\n\nlegacy body\n', 'pkg');

    expect(out).toContain('## 1.4.0 — 2026-05-03');
    expect(out).toContain('legacy body');
    expect(out.split('\n')[0]).toBe('# pkg');
  });

  it('re-sorts sections the old insertion bug left out of order', () => {
    const broken = [
      '## [1.4.0] - 2026-05-03',
      '',
      'legacy',
      '',
      '## 1.17.0',
      '',
      'newer',
      '',
    ].join('\n');
    const headings = normalize(broken, 'pkg')
      .split('\n')
      .filter((l) => l.startsWith('## '));

    expect(headings).toEqual(['## 1.17.0', '## 1.4.0 — 2026-05-03']);
  });

  it('hoists a buried H1 and never duplicates it', () => {
    const buried = [
      '## 2.0.0',
      '',
      'newest',
      '',
      '# Changelog',
      '',
      'All notable changes …',
      '',
      '## 1.0.0',
      '',
      'oldest',
      '',
    ].join('\n');
    const out = normalize(buried, 'pkg');

    expect(out.split('\n').filter((l) => l.startsWith('# '))).toEqual([
      '# pkg',
    ]);
    expect(out).toContain('oldest');
    expect(out).toContain('newest');
  });

  it('reclaims preamble that a release prepend pushed into a section', () => {
    // The shape `changeset version` actually produces: it inserts the new
    // section directly under the H1, so the preamble ends up *inside* that
    // section. Left there it renders in the middle of the GitHub Release body
    // for that version, and again for every version after it.
    const displaced = [
      '# pkg',
      '## 2.0.0',
      '',
      '### Major Changes',
      '',
      '- the change',
      '',
      'All notable changes to `pkg` are documented here.',
      '',
      'Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);',
      'the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).',
      '',
      '## 1.0.0',
      '',
      'older',
      '',
    ].join('\n');

    const out = normalize(displaced, 'pkg');
    const section = out.slice(out.indexOf('## 2.0.0'), out.indexOf('## 1.0.0'));

    expect(section).toContain('- the change');
    expect(section).not.toContain('All notable changes');
    expect(section).not.toContain('Keep a Changelog');

    // Exactly one copy survives, at the top where it belongs.
    expect(out.split('All notable changes').length - 1).toBe(1);
    expect(out.indexOf('All notable changes')).toBeLessThan(
      out.indexOf('## 2.0.0'),
    );
  });

  it('also reclaims the legacy preamble wording', () => {
    const legacy = [
      '# pkg',
      '## 2.0.0',
      '',
      '- the change',
      '',
      'All notable changes to `pkg` will be documented in this file.',
      '',
      'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),',
      'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
      '',
    ].join('\n');

    const section = normalize(legacy, 'pkg');
    expect(section.slice(section.indexOf('## 2.0.0'))).not.toContain(
      'Semantic Versioning',
    );
  });

  it('keeps [Unreleased] at the top rather than sorting it away', () => {
    const out = normalize(
      '## 1.0.0\n\nshipped\n\n## [Unreleased]\n\npending\n',
      'pkg',
    );
    const headings = out.split('\n').filter((l) => l.startsWith('## '));

    expect(headings).toEqual(['## [Unreleased]', '## 1.0.0']);
  });

  it('orders prereleases by SemVer, not alphabetically', () => {
    // `'beta.11' < 'beta.2'` as text, so a lexical sort lists beta.2 above
    // beta.11 — and a reader takes the top entry to be the newest.
    const input = [
      '## 1.0.0-beta.2',
      '',
      'two',
      '',
      '## 1.0.0-beta.11',
      '',
      'eleven',
      '',
    ].join('\n');
    const headings = normalize(input, 'pkg')
      .split('\n')
      .filter((l) => l.startsWith('## '));

    expect(headings).toEqual(['## 1.0.0-beta.11', '## 1.0.0-beta.2']);
  });

  it('ranks a release above its own prereleases', () => {
    const input = '## 1.0.0-rc.1\n\nrc\n\n## 1.0.0\n\nfinal\n';
    const headings = normalize(input, 'pkg')
      .split('\n')
      .filter((l) => l.startsWith('## '));

    expect(headings).toEqual(['## 1.0.0', '## 1.0.0-rc.1']);
  });

  it('ranks a numeric identifier below a non-numeric one (SemVer §11.4)', () => {
    const input = '## 1.0.0-alpha.1\n\na\n\n## 1.0.0-alpha.beta\n\nb\n';
    const headings = normalize(input, 'pkg')
      .split('\n')
      .filter((l) => l.startsWith('## '));

    expect(headings).toEqual(['## 1.0.0-alpha.beta', '## 1.0.0-alpha.1']);
  });

  it('is idempotent', () => {
    const once = normalize('## [1.4.0] - 2026-05-03\n\nbody\n', 'pkg');
    expect(normalize(once, 'pkg')).toBe(once);
  });
});

describe('canonical() — markdown style', () => {
  it('normalises bullet markers a contributor may have varied', async () => {
    // Changeset bodies arrive verbatim from whatever someone typed, so `*`
    // and `-` lists mix freely across entries in one file.
    const out = await canonical('## 1.0.0\n\n* one\n* two\n', 'pkg');

    expect(out).toContain('- one');
    expect(out).not.toContain('* one');
  });

  it('is idempotent through the Prettier layer too', async () => {
    const once = await canonical('## 1.0.0\n\n*  ragged   bullet\n', 'pkg');
    await expect(canonical(once, 'pkg')).resolves.toBe(once);
  });

  it('still produces the structural shape normalize() guarantees', async () => {
    const out = await canonical('## [1.4.0] - 2026-05-03\n\nbody\n', 'pkg');

    expect(out.split('\n')[0]).toBe('# pkg');
    expect(out).toContain('## 1.4.0 — 2026-05-03');
  });
});

describe('changeset summary → badge', () => {
  it.each([
    ['feat(x): add a rule', '✨ Feature'],
    ['fix: correct the range', '🐛 Fix'],
    ['perf: cut startup cost', '⚡ Performance'],
    ['security: reject alg=none', '🔒 Security'],
    ['docs: clarify the option', '📚 Docs'],
  ])('%s → %s', (summary, badge) => {
    expect(parseSummary(summary, 'patch').badge).toBe(badge);
  });

  it('escalates a `!` marker to breaking regardless of bump type', () => {
    expect(parseSummary('feat(devkit)!: drop createRule', 'minor').badge).toBe(
      '💥 Breaking',
    );
  });

  it('escalates a BREAKING CHANGE footer to breaking', () => {
    const summary =
      'refactor: rework the resolver\n\nBREAKING CHANGE: the old export is gone.';
    expect(parseSummary(summary, 'patch').badge).toBe('💥 Breaking');
  });

  it('treats a major bump as breaking even with no marker', () => {
    expect(parseSummary('rework everything', 'major').badge).toBe(
      '💥 Breaking',
    );
  });

  it('does not mistake prose for a commit type', () => {
    // "Note:" would parse as a conventional-commit type under a naive regex
    // and lose the word from the title.
    const { badge, title } = parseSummary(
      'Note: the ranges are additive',
      'patch',
    );
    expect(title).toBe('Note: the ranges are additive');
    expect(badge).toBe('🐛 Fix');
  });

  it('keeps a wrapped title whole instead of truncating at the first newline', () => {
    // The real defect: `changelog-github` splits on the first \n, so a title
    // wrapped at 80 columns lost its tail into the indented body.
    const summary =
      '`RemoteMarkdown` accepts `tags`, forwarded to the underlying fetch as\n`next.tags`.\n\nBody paragraph.';
    const { title, body } = parseSummary(summary, 'minor');

    expect(title).toBe(
      '`RemoteMarkdown` accepts `tags`, forwarded to the underlying fetch as `next.tags`.',
    );
    expect(body).toBe('Body paragraph.');
  });

  it('drops the redundant scope from the title', () => {
    expect(
      parseSummary('feat(node-security): add `no-foo`', 'minor').title,
    ).toBe('add `no-foo`');
  });
});

describe('badge protocol between changelog.cjs and release-notes.ts', () => {
  it('every badge the formatter can emit is classified by the rollup', () => {
    // release-notes.ts groups by matching the badge emoji. A badge added to
    // changelog.cjs without a matching section silently lands in "Other".
    const rollup = readFileSync(
      join(REPO_ROOT, 'scripts', 'release-notes.ts'),
      'utf8',
    );
    const sectionBlock =
      /const KIND_SECTIONS[\s\S]*?\n\];/.exec(rollup)?.[0] ?? '';
    expect(
      sectionBlock,
      'KIND_SECTIONS not found in release-notes.ts',
    ).not.toBe('');

    const badges: string[] = [
      ...Object.values(
        changelog.__internal.KIND_BADGES as Record<string, string>,
      ),
      changelog.__internal.BREAKING_BADGE as string,
      '🔗 Dependencies',
    ];

    for (const badge of badges) {
      const emoji = badge.split(' ')[0];
      expect(
        sectionBlock,
        `rollup has no section matching badge "${badge}"`,
      ).toContain(emoji);
    }
  });
});
