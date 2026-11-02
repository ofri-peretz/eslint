const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'require-stream-error-handler',
  domain: 40, // 10 shapes x 4 constructors
  traces: 700,
  key: (s) => `${tag(s.shape)}|${tag(s.ctor)}`,
  config: () => ({}),
  code: (s) => {
    const c = tag(s.ctor);
    const src = {
      FsMember: 'fs.createReadStream(filePath)',
      FsNamed: 'createReadStream(filePath)',
      Zlib: 'zlib.createGzip()',
      PassThrough: 'new PassThrough()',
    }[c];
    const dst = {
      FsMember: 'fs.createWriteStream(filePath)',
      FsNamed: 'createWriteStream(filePath)',
      Zlib: 'zlib.createGunzip()',
      PassThrough: 'new PassThrough()',
    }[c];
    const imp =
      "import fs, { createReadStream, createWriteStream } from 'node:fs';\nimport zlib from 'node:zlib';\nimport { PassThrough } from 'node:stream';\nimport { pipeline } from 'node:stream/promises';\n";
    const body = {
      InlineSource: `${src}.pipe(res);`,
      InlineDest: `file.pipe(${dst});`,
      NamedUnhandled: `const stream = ${src};\n  stream.pipe(res);`,
      NamedOnError: `const stream = ${src};\n  stream.on('error', () => res.end());\n  stream.pipe(res);`,
      NamedOnceError: `const stream = ${src};\n  stream.once('error', () => res.end());\n  stream.pipe(res);`,
      NamedErrorAfterPipe: `const stream = ${src};\n  stream.pipe(res);\n  stream.on('error', () => res.end());`,
      NamedAddListener: `const stream = ${src};\n  stream.addListener('error', () => res.end());\n  stream.pipe(res);`,
      NamedOnClose: `const stream = ${src};\n  stream.on('close', () => res.end());\n  stream.pipe(res);`,
      Pipeline: `await pipeline(${src}, res);`,
      BothParams: `file.pipe(res); // ${c}`,
    }[tag(s.shape)];
    return `${imp}export async function send(filePath: string, file: any, res: any) {\n  ${body}\n}\n`;
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
