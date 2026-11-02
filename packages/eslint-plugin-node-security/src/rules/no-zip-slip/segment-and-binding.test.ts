/**
 * no-zip-slip — the second batch of edges Stryker found unpinned: what a
 * traversal literal is, which require establishes archive context, and which
 * guard checks a bound join.
 *
 * As in mutation-edges.test.ts, `unvalidatedArchivePath` cases import
 * `adm-zip`: without archive context the rule is silent before it asks
 * whether the path was validated.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noZipSlip } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const ADM = `import AdmZip from 'adm-zip';\nimport path from 'path';\n`;

describe('no-zip-slip segment and binding edges', () => {
  ruleTester.run('no-zip-slip', noZipSlip, {
    valid: [
      // ── what a traversal literal is ──────────────────────────────────────
      {
        name: 'BUG: a dot-dot that starts a directory name is not traversal',
        code: `zip.extractAllTo('./out/..cache/');`,
      },
      {
        name: 'BUG: a dot-dot that ends a directory name is not traversal',
        code: `zip.extractAllTo('./notes../');`,
      },
      // ── archive context ──────────────────────────────────────────────────
      {
        name: 'a require of a runtime specifier establishes no archive context',
        code: `const plugin = require(pluginName);\nfs.writeFileSync(path.join(dest, entry.entryName), data);`,
      },
      // ── which guard checks a bound join ──────────────────────────────────
      {
        name: 'a closure declared before the binding is not a use after it',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const onError = () => console.error('failed: ' + target);
  const target = path.resolve(dest, entry.entryName);
  if (!target.startsWith(dest + path.sep)) continue;
  fs.writeFileSync(target, entry.getData());
}`,
      },
      {
        name: 'BUG: a join bound inside a larger initializer is checked by the guard on that binding',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const partial = path.join(dest, entry.entryName) + '.part';
  if (!partial.startsWith(dest + path.sep)) continue;
  fs.writeFileSync(partial, entry.getData());
}`,
      },
    ],
    invalid: [
      // ── what a traversal literal is ──────────────────────────────────────
      {
        name: 'a bare .. destination climbs to the parent exactly as ../ does',
        code: `zip.extractAllTo('..');`,
        errors: [
          { messageId: 'unsafeArchiveExtraction' },
          { messageId: 'pathTraversalInArchive' },
        ],
      },
      {
        name: 'a Windows parent segment is traversal',
        code: `zip.extractAllTo('..\\\\out');`,
        errors: [
          { messageId: 'unsafeArchiveExtraction' },
          { messageId: 'pathTraversalInArchive' },
        ],
      },
      {
        name: 'a Windows parent segment mid-path is traversal',
        code: `zip.extractAllTo('out\\\\..\\\\up');`,
        errors: [
          { messageId: 'unsafeArchiveExtraction' },
          { messageId: 'pathTraversalInArchive' },
        ],
      },
      {
        name: 'a trailing parent segment is traversal',
        code: `zip.extractAllTo('./out/..');`,
        errors: [{ messageId: 'pathTraversalInArchive' }],
      },
      // ── archive context ──────────────────────────────────────────────────
      {
        name: 'a template-literal require of an archive module is archive context',
        code: 'const AdmZip = require(`adm-zip`);\nfs.writeFileSync(path.join(dest, entry.entryName), data);',
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      // ── which calls are extractions ──────────────────────────────────────
      {
        name: 'an unambiguous adm-zip method needs no archive-named receiver',
        code: `import AdmZip from 'adm-zip';\nconst z = new AdmZip(file);\nz.extractAllTo(target, true);`,
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      // ── which guard checks a bound join ──────────────────────────────────
      {
        name: 'a guard that reads neither the bound path nor its relative() does not check it',
        code: `${ADM}for (const entry of zip.getEntries()) {
  const target = path.resolve(dest, entry.entryName);
  const rel = path.relative(dest, target);
  if (!allowedTypes.includes(entry.type)) continue;
  fs.writeFileSync(target, entry.getData());
}`,
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });
});
