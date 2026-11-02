const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-unbounded-decompression',
  domain: 320, // 10 bindings x 4 fns x 4 option shapes x literal/untrusted payload
  traces: 5000,
  key: (s) =>
    `${tag(s.binding)}|${tag(s.fn)}|${tag(s.opts)}|literal=${s.literalPayload}`,
  config: () => ({}),
  code: (s) => {
    const fn = {
      GunzipSync: 'gunzipSync',
      BrotliDecompress: 'brotliDecompress',
      InflateRawSync: 'inflateRawSync',
      CreateGunzip: 'createGunzip',
    }[tag(s.fn)];
    const payload = s.literalPayload
      ? "Buffer.from('H4sIAAAAAAAAA8tIzcnJBwCGphA2BQAAAA==', 'base64')"
      : 'body';
    const opts = {
      NoOpts: null,
      WithCap: '{ maxOutputLength: 10 * 1024 * 1024 }',
      WithoutCap: '{ chunkSize: 4096 }',
      Opaque: 'opts',
    }[tag(s.opts)];
    const args = (callee) => {
      if (fn === 'createGunzip') return `${callee}(${opts ?? ''})`;
      const a = [payload, ...(opts ? [opts] : [])];
      if (fn === 'brotliDecompress') a.push('cb');
      return `${callee}(${a.join(', ')})`;
    };
    const wrap = (pre, inner, asyncFn = false) =>
      `${pre}export ${asyncFn ? 'async ' : ''}function handle(body: Buffer, opts: any, cb: any) {\n  return ${inner};\n}\n`;
    switch (tag(s.binding)) {
      case 'RequireMember':
        return wrap("const zlib = require('zlib');\n", args('zlib.' + fn));
      case 'ImportDefault':
        return wrap("import zlib from 'node:zlib';\n", args('zlib.' + fn));
      case 'NamedImport':
        return wrap(`import { ${fn} } from 'node:zlib';\n`, args(fn));
      case 'RenamedImport':
        return wrap(
          `import { ${fn} as expand } from 'zlib';\n`,
          args('expand'),
        );
      case 'RequireDestructured':
        return wrap(`const { ${fn} } = require('node:zlib');\n`, args(fn));
      case 'InlineRequire':
        return wrap('', args(`require('node:zlib').${fn}`));
      case 'TsImportEquals':
        return wrap("import zlib = require('zlib');\n", args('zlib.' + fn));
      case 'DynamicImport':
        return `export async function handle(body: Buffer, opts: any, cb: any) {\n  const zlib = await import('node:zlib');\n  return ${args('zlib.' + fn)};\n}\n`;
      case 'LocalHelper':
        return wrap(
          `function ${fn}(...xs: any[]) {\n  return xs[0];\n}\n`,
          args(fn),
        );
      case 'ShadowParam':
        return `import { ${fn} } from 'node:zlib';\nexport const keep = ${fn};\nexport function handle(body: Buffer, opts: any, cb: any, ${fn}: (...xs: any[]) => any) {\n  return ${args(fn)};\n}\n`;
    }
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
