/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the cross-package release rollup.
 *
 * The rollup is the page that answers "what shipped, and can I upgrade?" for a
 * release spanning twenty packages. Two properties matter more than anything
 * else it does, and both are asserted here:
 *
 *   1. **The upgrade verdict is never wrong in the dangerous direction.**
 *      Telling a reader a breaking release is safe is worse than publishing no
 *      notes at all.
 *   2. **Nothing is silently dropped.** The rollup summarises by collapsing
 *      duplicates and stripping link plumbing; every one of those steps is an
 *      opportunity to lose a real change. The parser is therefore tested
 *      against both changelog dialects the repo contains — entries written by
 *      the current formatter, and the `@changesets/changelog-github` entries
 *      that predate it. The next release contains both.
 */

import { describe, it, expect } from 'vitest';

import { INTERNAL_ONLY, SAFE_TO_UPGRADE } from '../release-verdict';
import {
  bulletsForVersion,
  isReleased,
  parseBullet,
  render,
  type Entry,
  type Workspace,
} from '../release-notes';

function ws(overrides: Partial<Workspace> = {}): Workspace {
  return {
    dir: 'packages/x',
    name: 'eslint-plugin-x',
    version: '2.0.0',
    previousVersion: '1.0.0',
    isApp: false,
    isPrivate: false,
    ...overrides,
  };
}

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    kind: 'fix',
    title: 'stop flagging the PNG writer',
    trailer: '',
    packages: ['eslint-plugin-x'],
    ...overrides,
  };
}

describe('upgrade verdict', () => {
  it('declares a release with no breaking entries safe', () => {
    const out = render([ws()], [entry()], 'aaaaaaa', 'bbbbbbb');

    expect(out).toContain(SAFE_TO_UPGRADE);
    // The safe verdict itself says "No breaking changes", so assert the
    // absence of the *warning*, not of the phrase.
    expect(out).not.toContain('⚠️');
    expect(out).not.toContain('This release contains');
  });

  it('warns when any entry is breaking, and never also says safe', () => {
    const out = render(
      [ws()],
      [entry(), entry({ kind: 'breaking', title: 'drop the legacy option' })],
      'aaaaaaa',
      'bbbbbbb',
    );

    expect(out).toContain('⚠️ **This release contains 1 breaking change.**');
    expect(out).not.toContain('Safe to upgrade');
  });

  it('does not warn about a breaking change nobody can install', () => {
    // A `docs: major` is genuinely breaking for the app and genuinely
    // irrelevant to someone deciding whether to upgrade a plugin. Counting it
    // warns people off a release that cannot affect them, and a banner that
    // cries wolf is one readers learn to skip. A published package is present,
    // so this is a real release — just not a breaking one.
    const out = render(
      [
        ws({ name: 'eslint-plugin-x' }),
        ws({ name: 'docs', isApp: true, isPrivate: true }),
      ],
      [entry({ kind: 'breaking', title: 'redesign', packages: ['docs'] })],
      'aaaaaaa',
      'bbbbbbb',
    );

    expect(out).toContain(SAFE_TO_UPGRADE);
    expect(out).not.toContain('This release contains');
  });

  it('says so plainly when nothing in the release reaches npm', () => {
    // "Safe to upgrade" is true here and useless: there is nothing to upgrade.
    // Without this the reader works that out only by noticing every entry is
    // marked internal, four sections down.
    const out = render(
      [ws({ name: 'docs', isApp: true, isPrivate: true })],
      [entry({ kind: 'breaking', title: 'redesign', packages: ['docs'] })],
      'aaaaaaa',
      'bbbbbbb',
    );

    expect(out).toContain(INTERNAL_ONLY);
    expect(out).not.toContain(SAFE_TO_UPGRADE);
    expect(out).not.toContain('This release contains');
  });

  it('still lists the internal breaking change, marked', () => {
    // It stays in the 💥 section — the rollup documents the whole release —
    // but marked, so the list and the banner's count reconcile.
    const out = render(
      [
        ws({ name: 'eslint-plugin-x' }),
        ws({ name: 'docs', isApp: true, isPrivate: true }),
      ],
      [entry({ kind: 'breaking', title: 'redesign', packages: ['docs'] })],
      'aaaaaaa',
      'bbbbbbb',
    );

    // It is listed, but under the internal section rather than interleaved
    // with consumer-facing entries — a "💥 Breaking changes" heading directly
    // under "✅ Safe to upgrade" reads as a contradiction, because a heading
    // is read before its contents.
    expect(out).toContain('Internal changes');
    expect(out).toContain('redesign');
    expect(out.indexOf('Internal changes')).toBeGreaterThan(
      out.indexOf('Safe to upgrade'),
    );
  });

  it('keeps consumer-facing sections above the internal fold', () => {
    const out = render(
      [
        ws({ name: 'eslint-plugin-x' }),
        ws({ name: 'docs', isApp: true, isPrivate: true }),
      ],
      [
        entry({
          kind: 'fix',
          title: 'a real fix',
          packages: ['eslint-plugin-x'],
        }),
        entry({ kind: 'breaking', title: 'app redesign', packages: ['docs'] }),
      ],
      'aaaaaaa',
      'bbbbbbb',
    );

    // The consumer's fix leads; the app's breaking change does not.
    expect(out.indexOf('🐛 Fixes')).toBeLessThan(
      out.indexOf('Internal changes'),
    );
    expect(out.indexOf('a real fix')).toBeLessThan(out.indexOf('app redesign'));
  });

  it('omits the internal section entirely when there is nothing internal', () => {
    const out = render([ws()], [entry()], 'aaaaaaa', 'bbbbbbb');
    expect(out).not.toContain('Internal changes');
  });

  it('counts a breaking change that touches both a published and a private package', () => {
    const out = render(
      [
        ws({ name: 'eslint-plugin-x' }),
        ws({ name: 'docs', isApp: true, isPrivate: true }),
      ],
      [
        entry({
          kind: 'breaking',
          title: 'shared break',
          packages: ['eslint-plugin-x', 'docs'],
        }),
      ],
      'aaaaaaa',
      'bbbbbbb',
    );

    expect(out).toContain('contains 1 breaking change');
    expect(out).not.toContain('_(internal — not published)_');
  });

  it('counts multiple breaking changes', () => {
    const out = render(
      [ws()],
      [
        entry({ kind: 'breaking', title: 'a' }),
        entry({ kind: 'breaking', title: 'b' }),
      ],
      'aaaaaaa',
      'bbbbbbb',
    );
    expect(out).toContain('contains 2 breaking changes');
  });

  it('puts breaking changes in the first section a reader meets', () => {
    const out = render(
      [ws()],
      [
        entry({ kind: 'fix', title: 'a fix' }),
        entry({ kind: 'breaking', title: 'a break' }),
      ],
      'aaaaaaa',
      'bbbbbbb',
    );

    expect(out.indexOf('💥 Breaking changes')).toBeLessThan(
      out.indexOf('🐛 Fixes'),
    );
  });
});

describe('parseBullet — current formatter', () => {
  it('reads the badge, prose and links out of a formatted entry', () => {
    const { kind, title, trailer } = parseBullet(
      '- **✨ Feature** — add `no-alg-none` (CWE-347) ([#190](https://x/pull/190))',
    );

    expect(kind).toBe('feature');
    expect(title).toBe('add `no-alg-none` (CWE-347)');
    expect(trailer).toContain('#190');
  });

  it('keeps a parenthetical that is prose, not link plumbing', () => {
    // `(CWE-327)` must survive; only a trailing group of markdown links is a
    // trailer. Losing it would change what the entry claims.
    const { title } = parseBullet(
      '- **🐛 Fix** — align the CVSS for `no-weak-hash` (CWE-327)',
    );
    expect(title).toBe('align the CVSS for `no-weak-hash` (CWE-327)');
  });

  it('classifies a breaking badge as breaking', () => {
    expect(parseBullet('- **💥 Breaking** — drop `createRule`').kind).toBe(
      'breaking',
    );
  });
});

describe('parseBullet — legacy changelog-github entries', () => {
  const LEGACY =
    '- [#651](https://github.com/o/r/pull/651) [`64212a6`](https://github.com/o/r/commit/64212a6) Thanks [@someone](https://github.com/someone)! - A flag is not a credential.';

  it('strips the link prefix that would otherwise render verbatim', () => {
    const { title } = parseBullet(LEGACY);
    expect(title).toBe('A flag is not a credential.');
  });

  it('keeps the PR link as the trailer rather than discarding it', () => {
    const { trailer } = parseBullet(LEGACY);
    expect(trailer).toContain('#651');
  });

  it('recovers the section from a conventional prefix in legacy prose', () => {
    const bullet =
      '- [#190](https://github.com/o/r/pull/190) [`6bb476d`](https://github.com/o/r/commit/6bb476d) Thanks [@someone](https://github.com/someone)! - feat(node-security): add `no-dynamic-algorithm-selection`';
    expect(parseBullet(bullet).kind).toBe('feature');
  });

  it('escalates a legacy `!` entry to breaking', () => {
    const bullet =
      '- [#1](https://github.com/o/r/pull/1) Thanks [@someone](https://github.com/someone)! - feat(x)!: drop the option';
    expect(parseBullet(bullet).kind).toBe('breaking');
  });

  it('leaves a plain bullet untouched instead of mangling it', () => {
    const { title, kind } = parseBullet('- Module resolver swapped to oxc.');
    expect(title).toBe('Module resolver swapped to oxc.');
    expect(kind).toBe('other');
  });
});

describe('bulletsForVersion', () => {
  const CHANGELOG = `# pkg

## 2.1.0

### Minor Changes

- **✨ Feature** — the new thing

  Indented body text that is not an entry.

  - an indented bullet inside the body

## 2.0.0

### Major Changes

- **💥 Breaking** — the old thing
`;

  it('returns only the entries for the requested version', () => {
    expect(bulletsForVersion(CHANGELOG, '2.1.0')).toEqual([
      '- **✨ Feature** — the new thing',
    ]);
  });

  it('does not leak the next section into this one', () => {
    expect(bulletsForVersion(CHANGELOG, '2.1.0').join('\n')).not.toContain(
      'the old thing',
    );
  });

  it('reads a legacy dated heading too', () => {
    const dated = '# pkg\n\n## 1.2.3 — 2026-02-08\n\n- an entry\n';
    expect(bulletsForVersion(dated, '1.2.3')).toEqual(['- an entry']);
  });

  it('returns nothing for a version that is not there', () => {
    expect(bulletsForVersion(CHANGELOG, '9.9.9')).toEqual([]);
  });
});

describe('package attribution', () => {
  it('names the packages a change landed in', () => {
    const out = render(
      [ws({ name: 'eslint-plugin-a' }), ws({ name: 'eslint-plugin-b' })],
      [entry({ packages: ['eslint-plugin-a'] })],
      'aaaaaaa',
      'bbbbbbb',
    );
    expect(out).toContain('`a`');
  });

  it('collapses a repo-wide sweep instead of listing every package', () => {
    const names = Array.from({ length: 12 }, (_, i) => `eslint-plugin-${i}`);
    const out = render(
      names.map((name) => ws({ name })),
      [entry({ packages: names })],
      'aaaaaaa',
      'bbbbbbb',
    );
    expect(out).toContain('`all packages`');
  });

  it('lists every released workspace in the version table', () => {
    // The prose above collapses; the table must not — it is the record of
    // what actually shipped.
    const out = render(
      [
        ws({ name: 'eslint-plugin-a' }),
        ws({ name: 'docs', isApp: true, isPrivate: true }),
      ],
      [entry({ packages: ['eslint-plugin-a'] })],
      'aaaaaaa',
      'bbbbbbb',
    );

    expect(out).toContain('eslint-plugin-a');
    expect(out).toContain('docs');
    expect(out).toContain('| app |');
  });

  it('does not link a private workspace to npm, where it does not exist', () => {
    const out = render(
      [ws({ name: 'docs', isApp: true, isPrivate: true })],
      [],
      'aaaaaaa',
      'bbbbbbb',
    );
    expect(out).not.toContain('npmjs.com/package/docs');
  });
});

describe('first releases', () => {
  it('includes a workspace that did not exist at the base ref', () => {
    // previousVersion === null means "new package". Filtering those out hid
    // first releases from the rollup entirely, which is the one release a
    // reader is least likely to already know about.
    const out = render(
      [
        ws({
          name: 'eslint-plugin-brand-new',
          previousVersion: null,
          version: '0.1.0',
        }),
      ],
      [entry({ packages: ['eslint-plugin-brand-new'] })],
      'aaaaaaa',
      'bbbbbbb',
    );

    expect(out).toContain('eslint-plugin-brand-new');
    expect(out).toContain('Released: 1 package.');
  });

  it('renders its From column as "new", not as a literal null', () => {
    const out = render(
      [
        ws({
          name: 'eslint-plugin-brand-new',
          previousVersion: null,
          version: '0.1.0',
        }),
      ],
      [],
      'aaaaaaa',
      'bbbbbbb',
    );

    expect(out).toContain('_new_');
    expect(out).not.toContain('`null`');
  });

  it('excludes a workspace whose version did not move', () => {
    // Asserted against the filter itself. The previous version of this test
    // handed an unchanged workspace straight to `render()` and expected it in
    // the output — but `render()` does not filter, so it proved the opposite
    // of its own name and would have passed with the rule deleted.
    expect(isReleased(ws({ previousVersion: '1.0.0', version: '1.0.0' }))).toBe(
      false,
    );
  });

  it('includes a workspace whose version moved', () => {
    expect(isReleased(ws({ previousVersion: '1.0.0', version: '1.1.0' }))).toBe(
      true,
    );
  });

  it('includes a workspace that is brand new', () => {
    expect(isReleased(ws({ previousVersion: null, version: '0.1.0' }))).toBe(
      true,
    );
  });
});

describe('empty release', () => {
  it('says nothing shipped rather than rendering an empty template', () => {
    const out = render([], [], 'aaaaaaa', 'bbbbbbb');
    expect(out).toContain('No package or app versions changed');
    expect(out).not.toContain('Safe to upgrade');
  });
});
