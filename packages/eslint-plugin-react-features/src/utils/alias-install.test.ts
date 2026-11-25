import { describe, expect, it } from 'vitest';
import { isInstalledAsReact } from './alias-install';

describe('isInstalledAsReact', () => {
  it.each([
    // npm / yarn classic
    ['/app/node_modules/eslint-plugin-react/dist/src', true],
    // pnpm: the alias folder inside the virtual store
    [
      '/app/node_modules/.pnpm/eslint-plugin-react@npm+eslint-plugin-react-features@2.4.0/node_modules/eslint-plugin-react/dist/src',
      true,
    ],
    // Yarn PnP zip
    [
      '/app/.yarn/cache/eslint-plugin-react-npm-eslint-plugin-react-features-abc.zip/node_modules/eslint-plugin-react/dist/src',
      true,
    ],
    // Windows
    ['C:\\app\\node_modules\\eslint-plugin-react\\dist\\src', true],
    // the package installed under its own name
    ['/app/node_modules/eslint-plugin-react-features/dist/src', false],
    // a similarly named folder that is not the alias
    ['/app/node_modules/eslint-plugin-react-hooks/dist', false],
    ['/app/node_modules/my-eslint-plugin-react/dist', false],
    // the monorepo checkout
    ['/work/eslint/packages/eslint-plugin-react-features/src', false],
    ['', false],
  ])('%s -> %s', (directory, expected) => {
    expect(isInstalledAsReact(directory)).toBe(expected);
  });

  it('reads a directory ending in the alias folder', () => {
    expect(isInstalledAsReact('/app/node_modules/eslint-plugin-react')).toBe(
      true,
    );
  });
});
