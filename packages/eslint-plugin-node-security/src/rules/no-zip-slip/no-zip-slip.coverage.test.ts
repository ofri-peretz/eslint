/**
 * Coverage-gap tests for no-zip-slip.
 * Layer 1: isPathValidated wrappers (validation fn, path.basename,
 * startsWith / !startsWith / includes if-tests and their lookalikes),
 * dangerous method-call destinations, standalone extraction reports, the
 * safe `extract` library short-circuit, archive-context literal walk, and
 * VariableDeclarator tracking branches.
 * Layer 2: report sites invoked with synthetic loc-less nodes to cover the
 * `node.loc?.start.line ?? 0` fallbacks, plus manual execution of the
 * suggestion fix (returns null). Uses createWithMockContext from
 * @interlace/eslint-devkit, with getAllComments patched onto the mock
 * sourceCode (the shared helper does not stub it).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noZipSlip } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-zip-slip coverage gaps', () => {
  ruleTester.run('no-zip-slip', noZipSlip, {
    valid: [
      // Custom validation function wrapping the join
      { code: 'validatePath(path.join(dest, entry.name));' },
      // path.basename() sanitization wrapping the join
      { code: 'const p = path.basename(path.join(dest, entry.name));' },
      // startsWith validation in the enclosing if-test
      {
        code: 'if (full.startsWith(dest)) { fs.writeFileSync(path.join(dest, entry.name)); }',
      },
      // Negated startsWith validation in the enclosing if-test
      {
        code: 'if (!full.startsWith(dest)) { throw new Error(path.join(dest, entry.name)); }',
      },
      // includes('..') validation in the enclosing if-test
      {
        code: "if (entryPath.includes('..')) { reject(path.join(dest, entry.name)); }",
      },
      // VariableDeclarator without init — early return
      { code: 'let entryName;' },
      // An ESM import of a module that is NOT an archive library opens no
      // archive context.
      { code: "import fs from 'fs'; const p = path.join(dest, entry.name);" },
      // Traversal literal assigned to a variable with no archive-ish name
      { code: "const dest = '../up/x';" },
      // entry-named variable assigned from entry.name (tracked, no report)
      { code: 'const entryFile = entry.name;' },
      // entry-named variable assigned from a non-name/path member
      { code: 'const entrySize = entry.size;' },
      // entry-named variable assigned from a call (init not MemberExpression)
      { code: 'const entryData = readEntry();' },
    ],
    invalid: [
      // Method call extracting into a dangerous destination: both reports
      {
        code: "zip.extractAllTo('/etc/app', true);",
        errors: [
          { messageId: 'unsafeArchiveExtraction' },
          { messageId: 'dangerousArchiveDestination' },
        ],
      },
      // Method call named in archiveFunctions with a single argument
      {
        code: "zip.extract('a.zip');",
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      // Standalone extraction with a non-dangerous destination
      {
        code: "extractArchive('a.zip', './out');",
        errors: [{ messageId: 'unsafeArchiveExtraction' }],
      },
      // Safe `extract` library skips extraction reports, but the traversal
      // literal in an archive call context is still flagged
      {
        code: "extract('../../evil', './out');",
        errors: [{ messageId: 'pathTraversalInArchive' }],
      },
      // Wrapper call that is not a validation function
      {
        code: "const AdmZip = require('adm-zip'); doStuff(path.join(dest, entry.name));",
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      // Member wrapper on a non-path object
      {
        code: "const AdmZip = require('adm-zip'); helper.wrap(path.join(dest, entry.name));",
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      // path method that is not basename
      {
        code: "const AdmZip = require('adm-zip'); path.dirname(path.join(dest, entry.name));",
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      // Enclosing if whose test is a bare identifier
      {
        code: "const AdmZip = require('adm-zip'); if (flag) { fs.cp(path.join(dest, entry.name)); }",
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      // Negated includes() is not treated as startsWith validation
      {
        code: "const AdmZip = require('adm-zip'); if (!entryPath.includes('..')) { fs.cp(path.join(dest, entry.name)); }",
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
      // Negated plain function call (callee not a MemberExpression)
      {
        code: "const AdmZip = require('adm-zip'); if (!checkIt(p)) { fs.cp(path.join(dest, entry.name)); }",
        errors: [{ messageId: 'unvalidatedArchivePath' }],
      },
    ],
  });

  describe('Layer 2: synthetic loc-less nodes', () => {
    type Listener = (n: unknown) => void;

    function setup(options?: unknown[]) {
      const result = createWithMockContext(
        noZipSlip,
        options ? ({ options } as never) : undefined,
      );
      // The shared mock does not stub getAllComments; the CallExpression
      // handler needs it for the @safe-annotation scan.
      Object.assign(
        result.context.sourceCode as unknown as Record<string, unknown>,
        { getAllComments: () => [] },
      );
      return result;
    }

    it('reports method-call extraction into a dangerous destination with line 0 when loc is absent', () => {
      const { listeners, reports } = setup();
      (listeners.CallExpression as Listener)({
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'zip' },
          property: { type: 'Identifier', name: 'extractAllTo' },
        },
        arguments: [{ type: 'Literal', value: '/etc/target' }],
      });
      expect(reports).toHaveLength(2);
      expect(reports[0]).toMatchObject({
        messageId: 'unsafeArchiveExtraction',
        data: { line: '0' },
      });
      expect(reports[1]).toMatchObject({
        messageId: 'dangerousArchiveDestination',
        data: { line: '0' },
      });
    });

    it('reports standalone extraction into a dangerous destination with line 0 when loc is absent', () => {
      const { listeners, reports } = setup();
      (listeners.CallExpression as Listener)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'extractArchive' },
        arguments: [
          { type: 'Literal', value: 'a.zip' },
          { type: 'Literal', value: '/etc/x' },
        ],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'dangerousArchiveDestination',
        data: { line: '0' },
      });
    });

    it('reports standalone extraction without destination, and the suggestion fix returns null', () => {
      const { listeners, reports } = setup();
      (listeners.CallExpression as Listener)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'extractArchive' },
        arguments: [{ type: 'Literal', value: 'a.zip' }],
      });
      expect(reports).toHaveLength(1);
      const report = reports[0] as {
        messageId: string;
        data: { line: string };
        suggest: { messageId: string; fix: () => null }[];
      };
      expect(report.messageId).toBe('unsafeArchiveExtraction');
      expect(report.data.line).toBe('0');
      expect(report.suggest[0].messageId).toBe('useSafeArchiveExtraction');
      expect(report.suggest[0].fix()).toBeNull();
    });

    it('reports unvalidated archive path with line 0 when loc is absent', () => {
      // The mock node has no archive in view, so the context gate is opened
      // explicitly; this case is about the loc fallback, not classification.
      const { listeners, reports } = setup([{ reportWithoutArchiveContext: true }]);
      const entryName: Record<string, unknown> = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'entry' },
        property: { type: 'Identifier', name: 'name' },
        parent: undefined,
      };
      const joinCall: Record<string, unknown> = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'path' },
          property: { type: 'Identifier', name: 'join' },
        },
        arguments: [entryName],
        parent: undefined,
      };
      entryName.parent = joinCall;
      (listeners.CallExpression as Listener)(joinCall);
      // Reports are collected and flushed at Program:exit, so that a
      // `require('adm-zip')` below the join still counts as archive context.
      (listeners['Program:exit'] as () => void)();
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'unvalidatedArchivePath',
        data: { line: '0' },
      });
    });

    it('reports path traversal literal with line 0 when loc is absent', () => {
      const { listeners, reports } = setup();
      // A traversal literal reports only INSIDE an archive-extraction call now,
      // so the synthetic parent is the extraction rather than a declarator.
      const extraction = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'zip' },
          property: { type: 'Identifier', name: 'extractAllTo' },
        },
        arguments: [],
        parent: undefined,
      };
      (listeners.Literal as Listener)({
        type: 'Literal',
        value: '../../up/x',
        parent: extraction,
      });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        messageId: 'pathTraversalInArchive',
        data: { line: '0' },
      });
    });
  });
});
