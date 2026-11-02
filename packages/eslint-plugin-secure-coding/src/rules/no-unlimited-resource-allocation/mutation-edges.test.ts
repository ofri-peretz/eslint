/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnlimitedResourceAllocation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const userSize = [{ messageId: 'userControlledResourceSize' as const }];
const bufferSize = [{ messageId: 'unlimitedBufferAllocation' as const }];
const fileOps = [{ messageId: 'unlimitedFileOperations' as const }];

/**
 * The taint walk spends one level of its twelve-level budget per AST level.
 * `wrap(n)` nests `req.body.size` `n` levels deep in one expression shape, so
 * the request root sits at depth `n + 2`: n = 10 is followed, n = 11 is not.
 */
const nest = (n: number, open: string, close: string): string =>
  `${open.repeat(n)}req.body.size${close.repeat(n)}`;

describe('no-unlimited-resource-allocation (mutation edges)', () => {
  ruleTester.run(
    'no-unlimited-resource-allocation',
    noUnlimitedResourceAllocation,
    {
      valid: [
        {
          name: 'a test file is skipped',
          filename: 'src/upload.test.ts',
          code: 'Buffer.alloc(req.body.size);',
        },
        {
          name: 'a request value nested past the walk budget through + is not followed',
          code: `Buffer.alloc(${nest(11, '(', ' + 1)')});`,
        },
        {
          name: 'a request value nested past the walk budget on the right of + is not followed',
          code: `Buffer.alloc(${nest(11, '(1 + ', ')')});`,
        },
        {
          name: 'a request value nested past the walk budget through ?: consequents is not followed',
          code: `Buffer.alloc(${nest(11, '(ok ? ', ' : 1)')});`,
        },
        {
          name: 'a request value nested past the walk budget through ?: alternates is not followed',
          code: `Buffer.alloc(${nest(11, '(ok ? 1 : ', ')')});`,
        },
        {
          name: 'a request value nested past the walk budget through unary + is not followed',
          code: `Buffer.alloc(${nest(11, '+(', ')')});`,
        },
        {
          name: 'a request value nested past the walk budget through as-casts is not followed',
          code: `Buffer.alloc(${nest(11, '(', ' as number)')});`,
        },
        {
          name: 'a request value nested past the walk budget through computed keys is not followed',
          code: `Buffer.alloc(${nest(11, 'sizes[', ']')});`,
        },
        {
          name: 'a request value nested past the walk budget through member reads is not followed',
          code: 'Buffer.alloc(req.body.a.b.c.d.e.f.g.h.i.j.k.size);',
        },
        {
          name: 'a request value nested past the walk budget through call callees is not followed',
          code: "Buffer.alloc(req.query.get('a').get('b').get('c').get('d').get('e').get('f'));",
        },
        {
          name: 'a lower-bound check is not an upper bound',
          code: `
          const size = Number(req.query.n);
          if (size < MAX) throw new Error('too small');
          if (MAX_SIZE < size) throw new Error('too large');
          Buffer.alloc(size);
        `,
        },
        {
          name: 'an unknown term makes the size estimate unknown',
          code: 'Buffer.alloc(headerSize + 2 * 1024 * 1024);',
        },
        {
          name: 'a difference that lands exactly on the limit is within it',
          code: 'Buffer.alloc(2 * 1024 * 1024 - 1024 * 1024);',
        },
        {
          name: 'a quotient that lands exactly on the limit is within it',
          code: 'Buffer.alloc(4 * 1024 * 1024 / 4);',
        },
        {
          name: 'fs.open is not an archive open',
          code: "import fs from 'node:fs'; fs.open(file, 'r', cb);",
        },
        {
          name: 'a module whose name only ends in tar is not the tar library',
          code: "import guitar from 'guitar'; guitar.open();",
        },
        {
          name: 'a module whose name only starts with tar is not the tar library',
          code: "import tarot from 'tarot'; tarot.open();",
        },
        {
          name: 'a non-require call taking a module-like string binds nothing',
          code: "const dialog = createDialog('zlib'); dialog.open();",
        },
        {
          name: 'a require with no argument binds nothing',
          code: 'const nothing = require(); nothing.open();',
        },
        {
          name: 'an allocation in a for-loop init runs once',
          code: 'for (let b = Buffer.alloc(8), i = 0; i < req.body.count; i++) { use(b); }',
        },
        {
          name: 'Array with two arguments builds those elements, not a length',
          code: 'const pair = Array(req.body.a, req.body.b);',
        },
        {
          name: 'an array length exactly at the limit is within it',
          code: 'const a = Array(1048576);',
        },
        {
          name: 'an ArrayBuffer exactly at the limit is within it',
          code: 'const a = new ArrayBuffer(1048576);',
        },
        {
          name: 'a template of request values is content to new Buffer, not a size',
          code: 'const b = new Buffer(`${req.body.user}:${req.body.pass}`);',
        },
        {
          name: 'a string fallback marks the operand as content, not a size',
          code: "const b = new Buffer(req.body.text || '');",
        },
        {
          name: 'a logical not yields a boolean, not a size',
          code: 'const b = new Buffer(!req.body.raw);',
        },
        {
          name: 'a string method on a module is content, not a size',
          code: 'const b = new Buffer(querystring.unescape(req.query.s));',
        },
        {
          name: 'an indirect (0, fn)(x) call is not a Math call',
          code: 'const b = new Buffer((0, decode)(req.body.data));',
        },
        {
          name: 'a numeric string is content to new Buffer, not a byte count',
          code: "const b = new Buffer('20000000');",
        },
        {
          name: 'an alloc method on a non-Buffer object is not Buffer.alloc',
          code: 'pool.alloc(req.body.size);',
        },
        {
          name: 'Buffer.from copies content, it does not reserve a size',
          code: 'Buffer.from(req.body.data);',
        },
        {
          name: 'a multer config passed by reference is not inspected',
          code: 'const upload = multer(uploadOptions);',
        },
        {
          name: 'limits alongside other multer options still bounds the upload',
          code: 'const upload = multer({ storage, limits: { fileSize: 1e6 } });',
        },
        {
          name: 'a spread before fileSize in multer limits still bounds the upload',
          code: 'const upload = multer({ limits: { ...defaults, fileSize: 1e6 } });',
        },
        {
          name: 'a readFile method on a non-fs object is not an fs read',
          code: 'storage.readFile(req.params.key);',
        },
        {
          name: 'a decompression limit among other options bounds the stream',
          code: 'zlib.createGunzip({ chunkSize: 1024, maxOutputLength: 1e6 });',
        },
      ],
      invalid: [
        {
          name: 'a request value at the edge of the walk budget is still followed',
          code: `Buffer.alloc(${nest(10, '(', ' + 1)')});`,
          errors: userSize,
        },
        {
          name: 'a request value in a later template slot taints the path',
          code: 'fs.readFileSync(`${dir}/${req.params.name}`);',
          errors: fileOps,
        },
        {
          name: 'a numeric fallback marks the operand as a size',
          code: 'const b = new Buffer(req.body.n || 10);',
          errors: userSize,
        },
        {
          name: 'a negated request value is arithmetic, so a size',
          code: 'const b = new Buffer(-req.body.n);',
          errors: userSize,
        },
        {
          name: 'a clamp elsewhere in the file does not bound this allocation',
          code: 'const n = Math.min(a, b); Buffer.alloc(req.body.size);',
          errors: userSize,
        },
        {
          name: 'a lower-bound guard with the size on the right does not bound it',
          code: `
          const size = Number(req.query.n);
          if (0 >= size) throw new Error('too small');
          Buffer.alloc(size);
        `,
          errors: userSize,
        },
        {
          name: 'a difference above the limit is reported',
          code: 'Buffer.alloc(4 * 1024 * 1024 - 4);',
          errors: bufferSize,
        },
        {
          name: 'a quotient above the limit is reported',
          code: 'Buffer.alloc(8 * 1024 * 1024 / 2);',
          errors: bufferSize,
        },
        {
          name: 'a namespace import of an archive library is that library',
          code: "import * as unzipper from 'unzipper'; unzipper.Extract({ path: dest });",
          errors: fileOps,
        },
        {
          name: 'multer limits without fileSize leave the file size unbounded',
          code: 'const upload = multer({ limits: { files: 1 } });',
          errors: fileOps,
        },
        {
          name: 'a limits object passed by reference is not seen as a fileSize limit',
          code: 'const upload = multer({ limits });',
          errors: fileOps,
        },
        {
          name: 'a plain assignment of a length is not a running byte count',
          code: 'const s = zlib.createGunzip(); let n; n = buf.length; if (n > max) stop();',
          errors: fileOps,
        },
        {
          name: 'adding a non-length field is not a byte count',
          code: 'const s = zlib.createGunzip(); let n = 0; n += buf.count; if (n > max) stop();',
          errors: fileOps,
        },
        {
          name: 'an equality check on the counter is not a bound',
          code: 'const s = zlib.createGunzip(); let n = 0; n += buf.length; if (n === max) stop();',
          errors: fileOps,
        },
      ],
    },
  );
});
