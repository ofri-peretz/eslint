import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedBuffer } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-deprecated-buffer', () => {
  ruleTester.run('no-deprecated-buffer', noDeprecatedBuffer, {
    valid: [
      { code: 'Buffer.from("hello")' },
      { code: 'Buffer.alloc(1024)' },
      { code: 'Buffer.allocUnsafe(512)' },
      { code: 'Buffer.concat([a, b])' },
      { code: 'const buf = Buffer.from(data, "utf8")' },

      // ── Binding resolution (rule-corpus regressions) ────────────────────
      // `Buffer` is a LOCAL class — an audio ring buffer, not Node's.
      // benchmarks/rule-corpus/node-security__no-deprecated-buffer/safe/08-*
      {
        code: [
          'class Buffer {',
          '  constructor(capacity) { this.samples = new Float32Array(capacity); }',
          '}',
          'export const ring = new Buffer(1024);',
        ].join('\n'),
      },
      // `Buffer` imported from a LOCAL module. safe/09-*
      {
        code: [
          "import { Buffer } from './lib/frame-buffer.js';",
          'export const fb = new Buffer(8);',
        ].join('\n'),
      },
      // A local FACTORY named `Buffer`, called without `new`. safe/12-*
      {
        code: [
          'function Buffer(initialText) { return { text: initialText }; }',
          "export const doc = Buffer('hello');",
        ].join('\n'),
      },
      // A destructured sibling export is not the constructor.
      { code: "const { byteLength } = require('node:buffer'); byteLength('a');" },
      // The module object itself is not the constructor.
      { code: "const buffer = require('node:buffer'); buffer.Buffer.alloc(4);" },
      // Feature detection + the remediated static call. safe/11-*
      {
        code: "if (typeof Buffer !== 'undefined') { Buffer.from('a', 'utf8'); }",
      },
    ],
    invalid: [
      // new Buffer() — auto-fixed to Buffer.from()
      {
        code: 'new Buffer("hello")',
        output: 'Buffer.from("hello")',
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      {
        code: 'new Buffer(data, "utf8")',
        output: 'Buffer.from(data, "utf8")',
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      // new Buffer(number) — auto-fixed to Buffer.alloc()
      {
        code: 'new Buffer(1024)',
        output: 'Buffer.alloc(1024)',
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      // Buffer() without new — auto-fixed
      {
        code: 'Buffer("hello")',
        output: 'Buffer.from("hello")',
        errors: [{ messageId: 'deprecatedBufferCall' }],
      },
      {
        code: 'Buffer(512)',
        output: 'Buffer.alloc(512)',
        errors: [{ messageId: 'deprecatedBufferCall' }],
      },

      // ── Aliased / required bindings (rule-corpus regressions) ───────────
      // `import { Buffer as NodeBuffer } from 'node:buffer'`. vulnerable/08-*
      {
        code: "import { Buffer as NodeBuffer } from 'node:buffer';\nconst b = new NodeBuffer(64);",
        output: "import { Buffer as NodeBuffer } from 'node:buffer';\nconst b = NodeBuffer.alloc(64);",
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      // `const BufferCtor = require('buffer').Buffer`. vulnerable/09-*
      {
        code: "const BufferCtor = require('buffer').Buffer;\nconst r = new BufferCtor(8);",
        output: "const BufferCtor = require('buffer').Buffer;\nconst r = BufferCtor.alloc(8);",
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      // `const { Buffer } = require('buffer')`. vulnerable/04-*
      {
        code: "const { Buffer } = require('buffer');\nconst d = new Buffer('ff', 'hex');",
        output: "const { Buffer } = require('buffer');\nconst d = Buffer.from('ff', 'hex');",
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      // The destructure may be renamed too.
      {
        code: "const { Buffer: B } = require('node:buffer');\nconst d = new B(16);",
        output: "const { Buffer: B } = require('node:buffer');\nconst d = B.alloc(16);",
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      // `new buffer.Buffer(n)` — the callee is a member expression, which a
      // callee-identifier test cannot see at all. vulnerable/07-*
      {
        code: "const buffer = require('node:buffer');\nconst f = new buffer.Buffer(32);",
        output: "const buffer = require('node:buffer');\nconst f = buffer.Buffer.alloc(32);",
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      {
        code: "import * as nb from 'node:buffer';\nconst f = new nb.Buffer(32);",
        output: "import * as nb from 'node:buffer';\nconst f = nb.Buffer.alloc(32);",
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      { code: 'const f = new global.Buffer(4);', output: 'const f = global.Buffer.alloc(4);', errors: [{ messageId: 'deprecatedBufferConstructor' }] },
      { code: "globalThis.Buffer('x');", output: "globalThis.Buffer.from('x');", errors: [{ messageId: 'deprecatedBufferCall' }] },

      // ── Autofix safety ─────────────────────────────────────────────────
      // `Buffer.from(number)` THROWS. When the argument's type cannot be
      // established the report stands but no fix is offered.
      {
        code: 'const size = readSize();\nconst page = new Buffer(size);',
        output: null,
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      { code: 'new Buffer(...parts);', output: null, errors: [{ messageId: 'deprecatedBufferConstructor' }] },
      { code: 'new Buffer();', output: null, errors: [{ messageId: 'deprecatedBufferConstructor' }] },
      // A `const` alias IS resolvable, so this one still fixes.
      {
        code: 'const SIZE = 1024;\nconst page = new Buffer(SIZE);',
        output: 'const SIZE = 1024;\nconst page = Buffer.alloc(SIZE);',
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      { code: 'new Buffer([1, 2, 3]);', output: 'Buffer.from([1, 2, 3]);', errors: [{ messageId: 'deprecatedBufferConstructor' }] },
      { code: 'new Buffer(`a${x}b`);', output: 'Buffer.from(`a${x}b`);', errors: [{ messageId: 'deprecatedBufferConstructor' }] },
    ],
  });
});
