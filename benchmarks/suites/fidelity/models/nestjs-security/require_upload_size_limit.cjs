const { tag, withTestFile } = require('../../lib.cjs');

const NAMES = {
  File: 'FileInterceptor',
  Files: 'FilesInterceptor',
  FileFields: 'FileFieldsInterceptor',
  AnyFiles: 'AnyFilesInterceptor',
  NoFiles: 'NoFilesInterceptor',
};
// What comes before the options in each signature.
const LEADING = {
  File: ["'file'"],
  Files: ["'files'", '10'],
  FileFields: ["[{ name: 'avatar', maxCount: 1 }]"],
  AnyFiles: [],
  NoFiles: [],
};
const OPTIONS = {
  Absent: null,
  NoLimits: "{ dest: './uploads' }",
  LimitsNoFileSize: '{ limits: { files: 1 } }',
  InlineFileSize: '{ limits: { fileSize: 1e6 } }',
  ConstFileSize: 'options',
  ConstNoLimit: 'options',
  Imported: 'options',
  Spread: "{ ...base, dest: './uploads' }",
};
const PRELUDE = {
  ConstFileSize: 'const options = { limits: { fileSize: 1e6 } };',
  ConstNoLimit: "const options = { dest: './uploads' };",
  Imported: "import { options } from './multer.config';",
  Spread: "import { base } from './multer.config';",
};

const base = {
  rule: 'require-upload-size-limit',
  // 5 interceptors x 8 options, of which 2 are crossed with
  // 5 spellings x 3 projects x 2 validator
  domain: 5 * 8 - 2 + 2 * 5 * 3 * 2,
  traces: 4000,
  key: (s) =>
    ['interceptor', 'opts', 'spelling', 'project', 'validator']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  files: (s) => {
    const registration = {
      NoModule: null,
      ModuleNoLimit: 'MulterModule.register({ storage: diskStorage({}) })',
      ModuleLimit: 'MulterModule.register({ limits: { fileSize: 1e6 } })',
    }[tag(s.project)];
    return {
      'package.json': '{ "name": "app" }\n',
      ...(registration && {
        'src/files.module.ts': [
          "import { Module } from '@nestjs/common';",
          "import { MulterModule } from '@nestjs/platform-express';",
          "import { diskStorage } from 'multer';",
          `@Module({ imports: [${registration}] })`,
          'export class FilesModule {}',
          '',
        ].join('\n'),
      }),
    };
  },
  code: (s) => {
    const name = NAMES[tag(s.interceptor)];
    const opts = tag(s.opts);
    const sp = tag(s.spelling);
    const imp = {
      Named: `import { ${name} } from '@nestjs/platform-express';`,
      Aliased: `import { ${name} as Upload } from '@nestjs/platform-express';`,
      Namespace: "import * as express from '@nestjs/platform-express';",
      NamespaceSubscript:
        "import * as express from '@nestjs/platform-express';",
      OtherPackage: `import { ${name} } from './upload.interceptor';`,
    }[sp];
    const callee =
      {
        Aliased: 'Upload',
        Namespace: `express.${name}`,
        NamespaceSubscript: `express['${name}']`,
      }[sp] ?? name;
    const args = [...LEADING[tag(s.interceptor)], OPTIONS[opts]].filter(
      (a) => a !== null,
    );
    const param = s.validator
      ? '@UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 1000 })] })) file: unknown'
      : '@UploadedFile() file: unknown';
    return [
      "import { Controller, MaxFileSizeValidator, ParseFilePipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';",
      imp,
      PRELUDE[opts] ?? '',
      "@Controller('files')",
      'export class FilesController {',
      "  @Post('upload')",
      `  @UseInterceptors(${callee}(${args.join(', ')}))`,
      `  upload(${param}) { return file; }`,
      '}',
      '',
    ]
      .filter((l, i, all) => l !== '' || i === all.length - 1)
      .join('\n');
  },
  filename: 'src/files.controller.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
