const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const CONSTRUCT = {
  Require: ["const util = require('./util');", 'console.log(util);'],
  RequireDynamic: [
    'declare const name: string;',
    'const util = require(name);',
    'console.log(util);',
  ],
  RequireCreated: [
    "import { createRequire } from 'node:module';",
    'const require = createRequire(import.meta.url);',
    "const data = require('./data.json');",
    'console.log(data);',
  ],
  RequireParam: [
    'function load(require: (id: string) => unknown) {',
    "  return require('./util');",
    '}',
    'console.log(load);',
  ],
  ImportEquals: ["import util = require('./util');", 'console.log(util);'],
  ModuleExports: ['module.exports = { a: 1 };'],
  ModuleExportsComputed: ["module['exports'] = { a: 1 };"],
  ModuleExportsProp: ['module.exports.a = 1;'],
  ExportsProp: ['exports.a = 1;'],
  ExportsComputed: ["exports['a'] = 1;"],
  ExportsLocal: [
    'const exports: Record<string, number> = {};',
    'exports.a = 1;',
    'console.log(exports);',
  ],
  Dirname: ['console.log(__dirname);'],
  DirnameShim: [
    "import { dirname } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    'const __dirname = dirname(fileURLToPath(import.meta.url));',
    'console.log(__dirname);',
  ],
  DirnameMember: [
    'declare const config: { __dirname: string };',
    'console.log(config.__dirname);',
  ],
  EsmImport: ["import util from './util';", 'console.log(util);'],
};
const OPTS = {
  AllowRequire: { allowRequire: true },
  AllowModuleExports: { allowModuleExports: true },
  AllowExports: { allowExports: true },
  AllowInFilesMatch: { allowInFiles: ['**/app.*'] },
  AllowInFilesOther: { allowInFiles: ['**/legacy/**'] },
};

module.exports = {
  rule: 'no-commonjs',
  domain: 15 * 6 * 2,
  traces: 1600,
  key: keyOf('construct', 'opts', 'file'),
  config: (s) => OPTS[tag(s.opts)],
  filename: (s) => (tag(s.file) === 'Cjs' ? 'src/app.cjs' : 'src/app.ts'),
  code: (s) => src(CONSTRUCT[tag(s.construct)]),
};
