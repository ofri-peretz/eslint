const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-cryptojs-weak-random',
  domain: 21, // 3 sources x 7 calls
  traces: 400,
  key: (s) => `${tag(s.source)}|${tag(s.call)}`,
  config: () => ({}),
  code: (s) => {
    const imp = {
      DefaultImport: "import CryptoJS from 'crypto-js';",
      NamespaceImport: "import * as CryptoJS from 'crypto-js';",
      Require: "const CryptoJS = require('crypto-js');",
    }[tag(s.source)];
    const body = {
      LibWordArrayRandom:
        'export const salt = CryptoJS.lib.WordArray.random(16);',
      LocalWordArrayRandom:
        'const WordArray = CryptoJS.lib.WordArray;\nexport const iv = WordArray.random(16);',
      CryptoJSRandom: 'export const key = CryptoJS.random(32);',
      BracketRandom:
        "export const salt = CryptoJS.lib.WordArray['random'](16);",
      AliasedFn:
        'const rand = CryptoJS.lib.WordArray.random;\nexport const salt = rand(16);',
      Create:
        'export const words = CryptoJS.lib.WordArray.create([1, 2, 3, 4]);',
      UnrelatedWordArray:
        "import { WordArray } from './bytes';\nexport const sample = WordArray.random(16);\nexport const lib = CryptoJS;",
    }[tag(s.call)];
    return `${imp}\n${body}`;
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
