/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the published-release-note checker.
 *
 * This checker is the last thing between a generator regression and a reader
 * on npm, so the tests are about the two ways it can be useless: missing a bad
 * note, and crying wolf on a good one. Both matter — a checker that flags
 * healthy releases gets muted, and a muted checker is the same as none.
 *
 * The fixtures are real shapes: `GOOD` is the body
 * `eslint-plugin-browser-security@2.0.4` actually published, and `LEGACY` is
 * the shape every release before #660 has.
 */

import { describe, it, expect } from 'vitest';

import { verify } from '../verify-release-notes';

const rules = (tag: string, body: string) =>
  verify(tag, body).map((f) => f.rule);

const GOOD = `### Patch Changes

- **🐛 Fix** — \`no-http-urls\` no longer reports test material ([#666](https://github.com/o/r/pull/666))

  Some indented body prose.

---

✅ **Safe to upgrade.** No breaking changes: existing configs keep working as-is.

\`\`\`bash
npm install --save-dev eslint-plugin-browser-security@2.0.4
\`\`\`
`;

const LEGACY = `### Patch Changes

- [#651](https://github.com/o/r/pull/651) [\`64212a6\`](https://github.com/o/r/commit/64212a6) Thanks [@someone](https://github.com/someone)! - A flag is not a credential.
`;

describe('a well-formed release passes', () => {
  it('reports nothing on the real 2.0.4 body', () => {
    expect(verify('eslint-plugin-browser-security@2.0.4', GOOD)).toEqual([]);
  });

  it('accepts a breaking release, whose verdict reads differently', () => {
    const body = GOOD.replace(
      /✅ \*\*Safe to upgrade\.\*\*.*/,
      '⚠️ **This release contains 1 breaking change.** Read the migration notes above before upgrading.',
    );
    expect(rules('eslint-plugin-browser-security@2.0.4', body)).not.toContain(
      'RN003',
    );
  });

  it('does not demand an install line from the rollup release', () => {
    // The rollup is not a package and deliberately carries no install command.
    const body =
      '## What shipped\n\n✅ **Safe to upgrade.** No breaking changes: existing configs keep working as-is.\n';
    expect(verify('release-2026-08-23-634bee07', body)).toEqual([]);
  });
});

describe('a bad release is caught', () => {
  it('RN001 — empty body', () => {
    expect(rules('eslint-plugin-x@1.0.0', '   ')).toEqual(['RN001']);
  });

  it('RN002 — the fallback stub means CHANGELOG and version disagree', () => {
    const body =
      '## eslint-plugin-x@1.0.0\n\nSee package CHANGELOG for details (auto-generation pending).\n';
    expect(rules('eslint-plugin-x@1.0.0', body)).toContain('RN002');
  });

  it('RN003 — no upgrade verdict', () => {
    expect(rules('eslint-plugin-x@1.0.0', LEGACY)).toContain('RN003');
  });

  it('RN004 — missing install line', () => {
    expect(rules('eslint-plugin-x@1.0.0', LEGACY)).toContain('RN004');
  });

  it('RN004 — install line naming the wrong version', () => {
    // A stale version in the command is worse than none: it silently installs
    // something other than the release being read.
    const body = GOOD.replace('2.0.4', '2.0.3');
    expect(rules('eslint-plugin-browser-security@2.0.4', body)).toContain(
      'RN004',
    );
  });

  it('RN005 — a bullet leading with raw link plumbing', () => {
    expect(rules('eslint-plugin-x@1.0.0', LEGACY)).toContain('RN005');
  });

  it('RN006 — a split code span', () => {
    const body = `${GOOD}\nAnd a stray \` backtick.\n`;
    expect(rules('eslint-plugin-browser-security@2.0.4', body)).toContain(
      'RN006',
    );
  });
});

describe('scoped packages', () => {
  // The tag release.yml publishes is the *unscoped* name — it builds
  // `<name>@<version>` with `sub("^@[^/]+/"; "")`. So the real pairing for
  // `@interlace/eslint-devkit` is tag `eslint-devkit@2.0.0` against a body
  // containing `@interlace/eslint-devkit@2.0.0`. An earlier version of this
  // test passed the full scoped name as the tag — a shape that cannot occur —
  // and so reported green on a check that would have fired RN004 on every
  // scoped release, every run.
  const SCOPED_BODY =
    '✅ **Safe to upgrade.** No breaking changes: existing configs keep working as-is.\n\n```bash\nnpm install --save-dev @interlace/eslint-devkit@2.0.0\n```\n';

  it('accepts the scope prefix the body carries but the tag does not', () => {
    expect(rules('eslint-devkit@2.0.0', SCOPED_BODY)).not.toContain('RN004');
  });

  it('still catches a scoped package whose install line names another version', () => {
    const stale = SCOPED_BODY.replace('2.0.0', '1.9.0');
    expect(rules('eslint-devkit@2.0.0', stale)).toContain('RN004');
  });

  it('does not accept a different package that merely ends the same way', () => {
    // `eslint-devkit` must not be satisfied by `@scope/not-eslint-devkit`.
    const other = SCOPED_BODY.replace(
      '@interlace/eslint-devkit',
      '@interlace/not-eslint-devkit',
    );
    expect(rules('eslint-devkit@2.0.0', other)).toContain('RN004');
  });
});
