import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'mdx-compiler.tsx'),
  'utf-8',
);

/**
 * Remote content is markdown, and compiling it as MDX broke the build.
 *
 * `compileRemoteMDX` and `compileRemoteMarkdown` render CHANGELOG.md and
 * README.md FETCHED FROM GITHUB at build time. Those are CommonMark assembled
 * from arbitrary changeset prose, so every `{...}` in a release note became a
 * JSX expression to evaluate.
 *
 * A changeset merged on 2026-08-23 contained an inline code span with an
 * escaped backtick inside it. Markdown does not honour backslash escapes inside
 * a code span, so the inner backtick closed it early, `{id}` fell outside, and
 * three plugins' changelog pages died with `ReferenceError: id is not defined`.
 *
 * Two things made it worse than a normal build break:
 *
 *   - the content is fetched from `main`, so the break arrived with NO code
 *     change and no PR to revert;
 *   - the pre-push hook runs this same build, so it could not be fixed by
 *     editing the file locally either — the build re-fetched the broken text.
 *     Fixing the three changelogs by hand would also have been whack-a-mole,
 *     since the next changeset containing a brace would do it again.
 *
 * `format: 'md'` removes the class: braces are literal, and nothing in a
 * fetched README or CHANGELOG is meant to be executable anyway.
 */
describe('remote markdown is compiled as markdown, not MDX', () => {
  it('both remote compilers pass format: md', () => {
    const remoteFns = SRC.split(/export async function /).filter((chunk) =>
      /^compileRemote/.test(chunk),
    );
    expect(remoteFns).toHaveLength(2);
    for (const fn of remoteFns) {
      expect(fn).toMatch(/createCompiler\(\{\s*\n\s*format: 'md',/);
    }
  });

  it('every compiler this module exports is a remote one', () => {
    // Both exported functions render content fetched from GitHub, so both need
    // the flag. The assertion above iterates whatever it finds rather than
    // naming them, and this pins that the set has not grown a third compiler
    // that quietly skipped it. (The local variable inside each is called
    // `localCompiler`, which is a binding name, not a scope claim.)
    const exported = SRC.match(/^export async function (\w+)/gm) ?? [];
    expect(exported).toEqual([
      'export async function compileRemoteMDX',
      'export async function compileRemoteMarkdown',
    ]);
  });

});
