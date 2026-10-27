/**
 * The manifest cache must never serve a stale package.json. It exists because reading
 * the same package.json once per linted file was the rule's whole cost; the risk it
 * adds is a long-lived editor session that keeps reporting a dependency the user has
 * just added. Lint, edit package.json, lint again: the second run must see the edit.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { Linter } from 'eslint';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noExtraneousDependencies } from '../rules/no-extraneous-dependencies';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ned-cache-'));
const manifest = path.join(dir, 'package.json');
const file = path.join(dir, 'src', 'a.js');
fs.mkdirSync(path.dirname(file));

const linter = new Linter({ configType: 'flat', cwd: dir });
const config = [
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' } as const,
    plugins: {
      x: { rules: { r: noExtraneousDependencies as never } },
    },
    rules: { 'x/r': 'error' as const },
  },
];
const lint = () =>
  linter
    .verify(`import b from 'pkg-b';`, config, file)
    .map((m) => m.ruleId ?? m.message);

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('no-extraneous-dependencies manifest cache', () => {
  it('sees a package.json edit made between two lint runs', () => {
    fs.writeFileSync(
      manifest,
      JSON.stringify({ dependencies: { 'pkg-a': '1' } }),
    );
    expect(lint()).toEqual(['x/r']);

    fs.writeFileSync(
      manifest,
      JSON.stringify({ dependencies: { 'pkg-a': '1', 'pkg-b': '1' } }),
    );
    // Same-millisecond rewrites keep the mtime; move it so the edit is observable.
    const later = new Date(Date.now() + 5_000);
    fs.utimesSync(manifest, later, later);
    expect(lint()).toEqual([]);
  });
});
