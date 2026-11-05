import { describe, expect, it } from 'vitest';
import { matchesAnyFilePattern, matchesFilePattern } from './file-patterns';

describe('matchesFilePattern', () => {
  it.each([
    ['/repo/src/app.ts', '**/app.ts', true],
    ['src/app.ts', '**/app.ts', true],
    ['/repo/src/app.ts', '**/src/*.ts', true],
    ['/repo/src/deep/app.ts', '**/src/*.ts', false],
    ['/repo/src/deep/app.ts', 'src/**/*.ts', true],
    ['/repo/src/app.ts', 'src/**', true],
    ['/repo/src/app.ts', '*.ts', true],
    ['/repo/src/app.ts', 'app.?s', true],
    ['/repo/src/app.ts', '**/legacy/**', false],
    ['/repo/legacy/a/b.ts', '**/legacy/**', true],
    ['/repo/src/app.ts', 'src/app', true],
    ['/repo/src/app.ts', 'legacy/', false],
    ['C:\\repo\\src\\app.ts', '**/src/app.ts', true],
    ['/repo/src/a+b.ts', '**/a+b.ts', true],
    ['src/legacy/file.ts', '*legacy*', true],
    ['/repo/src/Button.stories.tsx', '*stories*', true],
    ['/repo/src/app.ts', '*legacy*', false],
  ])('%s against %s is %s', (file, pattern, expected) => {
    expect(matchesFilePattern(file, pattern)).toBe(expected);
  });

  it('caches compiled globs and matches any of a list', () => {
    expect(
      matchesAnyFilePattern('/r/src/app.ts', ['legacy/', '**/app.ts']),
    ).toBe(true);
    expect(matchesAnyFilePattern('/r/src/app.ts', ['**/app.ts'])).toBe(true);
    expect(matchesAnyFilePattern('/r/src/app.ts', [])).toBe(false);
  });
});
