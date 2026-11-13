/**
 * @fileoverview Tests for require-upload-size-limit
 *
 * The interceptor shapes are the ones measured in the corpus: 55 of the 77
 * calls are `FileInterceptor`, most with no options at all, and the limited
 * ones spell `limits` inline or through a `const` in the same file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';

const project = { hasModuleUploadLimit: false };
vi.mock('../../utils/project-context', () => ({
  getProjectContext: () => project,
}));

const { requireUploadSizeLimit } = await import('./index');

beforeEach(() => {
  project.hasModuleUploadLimit = false;
});

const IMPORT =
  "import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor, AnyFilesInterceptor, NoFilesInterceptor } from '@nestjs/platform-express';\n";
const route = (interceptor: string, prelude = ''): string =>
  `${IMPORT}${prelude}
class C {
  @UseInterceptors(${interceptor})
  upload() {}
}`;
const error = (name: string) => ({
  messageId: 'missingFileSizeLimit' as const,
  data: { name },
});
const unlimited = (name: string) => ({
  messageId: 'unlimitedFileSize' as const,
  data: { name },
});

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('require-upload-size-limit', requireUploadSizeLimit, {
  valid: [
    {
      name: 'an inline limits.fileSize',
      code: route("FileInterceptor('file', { limits: { fileSize: 1e6 } })"),
    },
    {
      name: 'a quoted fileSize key is the same key',
      code: route("FileInterceptor('file', { limits: { 'fileSize': 1e6 } })"),
    },
    {
      name: 'FilesInterceptor takes its options third, after maxCount',
      code: route(
        "FilesInterceptor('files', 10, { limits: { fileSize: 1e6 } })",
      ),
    },
    {
      name: 'FileFieldsInterceptor takes its options second',
      code: route(
        "FileFieldsInterceptor([{ name: 'a' }], { limits: { fileSize: 1e6 } })",
      ),
    },
    {
      name: 'AnyFilesInterceptor takes its options first',
      code: route('AnyFilesInterceptor({ limits: { fileSize: 1e6 } })'),
    },
    {
      name: 'options held in a const of this file',
      code: route(
        "FileInterceptor('file', options)",
        'const options = { limits: { fileSize: 1e6 } };',
      ),
    },
    {
      name: 'an exported const, with a type assertion',
      code: route(
        "FileInterceptor('file', options)",
        'export const options = { limits: { fileSize: 1e6 } } as MulterOptions;',
      ),
    },
    {
      name: 'limits held in a const of this file',
      code: route(
        "FileInterceptor('file', { limits })",
        'const limits = { fileSize: 1e6 } satisfies Limits;',
      ),
    },
    {
      name: 'options asserted inline',
      code: route(
        "FileInterceptor('file', { limits: { fileSize: 1e6 } } as MulterOptions)",
      ),
    },
    // ---- abstentions: the answer is not in this file ----
    {
      name: 'options imported from another file',
      code: route(
        "FileInterceptor('file', multerOptions)",
        "import { multerOptions } from './multer.config';",
      ),
    },
    {
      name: 'options built by a call',
      code: route("FileInterceptor('file', buildOptions())"),
    },
    {
      name: 'options carrying a spread',
      code: route("FileInterceptor('file', { ...base, dest: './up' })"),
    },
    {
      name: 'limits built by a call',
      code: route("FileInterceptor('file', { limits: limitsFor('avatar') })"),
    },
    {
      name: 'limits carrying a spread',
      code: route("FileInterceptor('file', { limits: { ...base } })"),
    },
    {
      name: 'a let is not followed: it may be reassigned',
      code: route(
        "FileInterceptor('file', options)",
        "let options = { dest: './up' };",
      ),
    },
    {
      name: 'a const holding something other than an object literal',
      code: route(
        "FileInterceptor('file', options)",
        'const options = buildOptions();',
      ),
    },
    // ---- not multer's interceptor ----
    {
      name: 'NoFilesInterceptor accepts no file at all',
      code: route('NoFilesInterceptor()'),
    },
    {
      name: 'a FileInterceptor from another package',
      code: `import { FileInterceptor } from './file.interceptor';
import '@nestjs/common';
class C { @UseInterceptors(FileInterceptor('file')) upload() {} }`,
    },
    {
      name: 'a file with no platform-express import registers nothing',
      code: `import { Controller } from '@nestjs/common';
class C { @UseInterceptors(FileInterceptor('file')) upload() {} }`,
    },
    {
      name: 'a member call on something that is not the platform-express namespace',
      code: `import * as express from '@nestjs/platform-express';
import * as other from './other';
class C { @UseInterceptors(other.FileInterceptor('file')) upload() {} }`,
    },
    {
      name: 'a computed member of the namespace is not resolved, whatever the key is called',
      code: `import * as express from '@nestjs/platform-express';
class C { @UseInterceptors(express[FileInterceptor]('file')) upload() {} }`,
    },
    {
      name: 'a member of something deeper than the namespace',
      code: `import * as express from '@nestjs/platform-express';
class C { @UseInterceptors(wrap.express.FileInterceptor('file')) upload() {} }`,
    },
    {
      name: 'a callee that is itself a call',
      code: `import * as express from '@nestjs/platform-express';
class C { @UseInterceptors(interceptorFor('avatar')('file')) upload() {} }`,
    },
    {
      name: 'another export of the namespace',
      code: `import * as express from '@nestjs/platform-express';
const adapter = new express.ExpressAdapter(); express.NoFilesInterceptor();`,
    },
    {
      name: 'a default import of the package names no interceptor',
      code: `import express from '@nestjs/platform-express';
class C { @UseInterceptors(FileInterceptor('file')) upload() {} }`,
    },
    {
      name: 'a file that uses no NestJS',
      code: `import { FileInterceptor } from 'somewhere';
FileInterceptor('file');`,
    },
    {
      name: 'a fileSize this file cannot evaluate is taken as a limit',
      code: route(
        "FileInterceptor('file', { limits: { fileSize: Number(process.env.MAX_UPLOAD) } })",
      ),
    },
    {
      name: 'a name that is not Infinity, undefined or null is a value',
      code: route(
        "FileInterceptor('file', { limits: { fileSize: MAX } })",
        'const MAX = 1e6;',
      ),
    },
    {
      name: 'a string is not the null literal',
      code: route("FileInterceptor('file', { limits: { fileSize: 'null' } })"),
    },
    {
      name: 'a test file is exempt by default',
      code: route("FileInterceptor('file')"),
      filename: 'upload.controller.spec.ts',
    },
  ],
  invalid: [
    // NestJS 12.5.0 / 11.2.10 `mergeMulterOptions`: a route option or limit
    // that is `undefined` or `null` is left out of the merge, and `Infinity`
    // is how a route lifts a limit.
    {
      name: 'fileSize: Infinity lifts the limit',
      code: route(
        "FileInterceptor('file', { limits: { fileSize: Infinity } })",
      ),
      errors: [unlimited('FileInterceptor')],
    },
    {
      name: 'fileSize: Infinity through a const of this file, under a cast',
      code: route(
        "FilesInterceptor('files', 10, { limits })",
        'const limits = { fileSize: Infinity as number };',
      ),
      errors: [unlimited('FilesInterceptor')],
    },
    {
      name: 'fileSize: undefined sets nothing',
      code: route(
        "FileInterceptor('file', { limits: { fileSize: undefined } })",
      ),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'fileSize: null sets nothing',
      code: route("FileInterceptor('file', { limits: { fileSize: null } })"),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'limits: undefined sets nothing',
      code: route("FileInterceptor('file', { limits: undefined })"),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'limits: null sets nothing',
      code: route("FileInterceptor('file', { limits: null })"),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'undefined in place of the options sets nothing',
      code: route("FileInterceptor('file', undefined)"),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'no options at all',
      code: route("FileInterceptor('file')"),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'options without limits',
      code: route("FileInterceptor('file', { dest: './uploads' })"),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'limits without fileSize',
      code: route("FileInterceptor('file', { limits: { files: 1 } })"),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'a const of this file that sets no limit',
      code: route(
        "FileInterceptor('file', options)",
        "const options = { dest: './uploads' };",
      ),
      errors: [error('FileInterceptor')],
    },
    {
      name: 'a limits const of this file without fileSize',
      code: route(
        "FileInterceptor('file', { limits })",
        'const limits = { files: 1 };',
      ),
      errors: [error('FileInterceptor')],
    },
    {
      name: "FilesInterceptor: maxCount is not the options, and bounds no file's size",
      code: route("FilesInterceptor('files', 10)"),
      errors: [error('FilesInterceptor')],
    },
    {
      name: 'FilesInterceptor: a limit in the maxCount position is not read',
      code: route("FilesInterceptor('files', { limits: { fileSize: 1 } })"),
      errors: [error('FilesInterceptor')],
    },
    {
      name: 'FileFieldsInterceptor without options',
      code: route("FileFieldsInterceptor([{ name: 'a' }])"),
      errors: [error('FileFieldsInterceptor')],
    },
    {
      name: 'AnyFilesInterceptor without options',
      code: route('AnyFilesInterceptor()'),
      errors: [error('AnyFilesInterceptor')],
    },
    {
      name: 'AnyFilesInterceptor: only the first argument is the options',
      code: route('AnyFilesInterceptor({}, { limits: { fileSize: 1 } })'),
      errors: [error('AnyFilesInterceptor')],
    },
    {
      name: 'an aliased import is still the interceptor it was imported as',
      code: `import { FileInterceptor as Upload } from '@nestjs/platform-express';
class C { @UseInterceptors(Upload('file')) upload() {} }`,
      errors: [error('FileInterceptor')],
    },
    {
      name: 'through a namespace import',
      code: `import * as express from '@nestjs/platform-express';
class C { @UseInterceptors(express.FilesInterceptor('files')) upload() {} }`,
      errors: [error('FilesInterceptor')],
    },
    {
      name: 'through a string subscript of the namespace',
      code: `import * as express from '@nestjs/platform-express';
class C { @UseInterceptors(express['FileInterceptor']('file')) upload() {} }`,
      errors: [error('FileInterceptor')],
    },
    {
      name: 'a ParseFilePipe MaxFileSizeValidator runs after the upload and bounds nothing',
      code: `${IMPORT}
class C {
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 1000 })] })) file) {}
}`,
      errors: [error('FileInterceptor')],
    },
    {
      name: 'every unbounded interceptor of a file is reported',
      code: `${IMPORT}
class C {
  @UseInterceptors(FileInterceptor('a')) a() {}
  @UseInterceptors(FileInterceptor('b', { limits: { fileSize: 1 } })) b() {}
  @UseInterceptors(AnyFilesInterceptor()) c() {}
}`,
      errors: [error('FileInterceptor'), error('AnyFilesInterceptor')],
    },
    {
      name: 'a test file is checked when allowInTests is off',
      code: route("FileInterceptor('file')"),
      filename: 'upload.controller.spec.ts',
      options: [{ allowInTests: false }],
      errors: [error('FileInterceptor')],
    },
    {
      name: 'a non-test file is checked whatever allowInTests says',
      code: route("FileInterceptor('file')"),
      options: [{ allowInTests: true }],
      errors: [error('FileInterceptor')],
    },
  ],
});

describe('require-upload-size-limit — a limit set in MulterModule.register()', () => {
  const linter = new Linter({ configType: 'flat' });
  const count = (code: string): number =>
    linter.verify(
      code,
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tsParser as never },
        plugins: { n: { rules: { r: requireUploadSizeLimit } } as never },
        rules: { 'n/r': 'error' },
      } as never,
      'upload.controller.ts',
    ).length;

  it('silences an interceptor that sets none of its own', () => {
    expect(count(route("FileInterceptor('file')"))).toBe(1);
    project.hasModuleUploadLimit = true;
    expect(count(route("FileInterceptor('file')"))).toBe(0);
  });

  it('covers a route that leaves its own fileSize undefined', () => {
    const code = route(
      "FileInterceptor('file', { limits: { fileSize: undefined } })",
    );
    expect(count(code)).toBe(1);
    project.hasModuleUploadLimit = true;
    expect(count(code)).toBe(0);
  });

  it('does not cover a route that lifts the limit with Infinity', () => {
    project.hasModuleUploadLimit = true;
    expect(
      count(
        route("FileInterceptor('file', { limits: { fileSize: Infinity } })"),
      ),
    ).toBe(1);
  });
});
