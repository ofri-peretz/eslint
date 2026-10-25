/**
 * @provenBy {"file":"packages/eslint-plugin-jwt-security/src/rules/no-algorithm-none/index.ts","find":"  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {","replace":"  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {"}
 * New rules are written in oxlint's `createOnce` shape; `create` only survives
 * where it is grandfathered, and that list can only shrink.
 *
 * `createOnce` is the shape that runs natively on oxlint and Vite+ while the
 * devkit derives ESLint's `create` from it — one rule object, both engines
 * (docs/intents/oxlint-native-plugin-names, R8). A rule authored with `create`
 * still works on oxlint, through its per-file `create` path, so nothing breaks
 * when one slips in; that is exactly why it needs a lock rather than review.
 *
 * Fails when:
 *   - a rule object (an object literal with `meta` and `create`) appears in a
 *     file that `.agent/create-rule-allowlist.json` does not list;
 *   - a listed file no longer has one — migrated rules leave the list, so it
 *     shrinks instead of quietly covering new code;
 *   - a listed file gives no reason.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '../..');
const ALLOWLIST = path.join(ROOT, '.agent/create-rule-allowlist.json');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return /^(__tests__|__compatibility__|node_modules|dist)$/.test(
        entry.name,
      )
        ? []
        : sourceFiles(full);
    }
    return entry.name.endsWith('.ts') &&
      !/\.(test|spec|d)\.ts$/.test(entry.name)
      ? [full]
      : [];
  });
}

/** Whether the file defines a rule object with an ESLint `create`. */
function usesCreate(file: string): boolean {
  const sf = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  let found = false;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isObjectLiteralExpression(node)) {
      const names = new Set(
        node.properties.map((p) =>
          p.name && ts.isIdentifier(p.name) ? p.name.text : '',
        ),
      );
      if (names.has('meta') && names.has('create')) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

const roots = [
  path.join(ROOT, 'packages/eslint-devkit/src/rule-creation'),
  ...fs
    .readdirSync(path.join(ROOT, 'packages'))
    .filter((dir) => dir.startsWith('eslint-plugin-'))
    .map((dir) => path.join(ROOT, 'packages', dir, 'src')),
];
const createFiles = roots
  .flatMap(sourceFiles)
  .filter((file) => !file.endsWith(`${path.sep}rule-creator.ts`)) // the adapter itself
  .filter(usesCreate)
  .map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
  .sort();

const allowlist = (
  JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')) as {
    rules: Record<string, string>;
  }
).rules;

describe('createOnce ratchet', () => {
  it('scans real rule sources (guards against a broken glob)', () => {
    expect(roots.flatMap(sourceFiles).length).toBeGreaterThan(300);
  });

  it('no rule outside the allowlist is authored with create()', () => {
    const unlisted = createFiles.filter((file) => !(file in allowlist));
    expect(
      unlisted,
      'Write new rules with createOnce(context, options) — see packages/eslint-devkit/src/rule-creation/rule-creator.ts',
    ).toEqual([]);
  });

  it('the allowlist only names files that still use create()', () => {
    const stale = Object.keys(allowlist).filter(
      (file) => !createFiles.includes(file),
    );
    expect(
      stale,
      'Migrated to createOnce: remove these from .agent/create-rule-allowlist.json',
    ).toEqual([]);
  });

  it('every grandfathered rule says why', () => {
    const silent = Object.entries(allowlist)
      .filter(([, reason]) => reason.trim().length < 20)
      .map(([file]) => file);
    expect(silent).toEqual([]);
  });
});
