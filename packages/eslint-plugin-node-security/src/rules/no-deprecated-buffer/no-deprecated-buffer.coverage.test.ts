/**
 * Coverage-gap tests for no-deprecated-buffer (Layer 1).
 * Targets: NewExpression whose callee is not the Buffer identifier.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedBuffer } from './index';

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

describe('no-deprecated-buffer coverage gaps', () => {
  ruleTester.run('no-deprecated-buffer', noDeprecatedBuffer, {
    valid: [
      // new expression on a non-Buffer identifier → guard returns
      { code: 'const view = new DataStore(8);' },
      // A `Buffer` binding declared without an initializer proves nothing.
      { code: 'let Buffer;\nBuffer = loadCtor();\nconst x = new Buffer(4);' },
      // Bound to something that is not the buffer module.
      { code: "const Buffer = require('./shim');\nconst x = new Buffer(4);" },
      // A namespace test only answers for a bare identifier receiver.
      { code: 'const x = new vendor.buffer.Buffer(4);' },
      // Imported from `node:buffer`, but not the constructor specifier.
      { code: "import { constants } from 'node:buffer';\nexport const max = constants.MAX_LENGTH;" },
      // Default import binds the module object, not the constructor.
      { code: "import bufferModule from 'node:buffer';\nexport const b = bufferModule.Buffer.alloc(4);" },
    ],
    invalid: [
      // The factory arm's unfixable path: `Buffer.from(number)` throws, so an
      // argument whose type cannot be established gets a report and no fix.
      {
        name: 'the deprecated Buffer() constructor with a runtime size',
        code: 'const size = readSize();\nconst page = Buffer(size);',
        output: null,
        errors: [{ messageId: 'deprecatedBufferCall' }],
      },
    ],
  });
});
