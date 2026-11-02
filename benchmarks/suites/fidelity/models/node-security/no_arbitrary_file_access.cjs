const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-arbitrary-file-access',
  domain: 96, // 8 bindings x 12 path sources
  traces: 1100,
  key: (s) => `${tag(s.binding)}|${tag(s.pathSrc)}`,
  code: (s) => {
    const [head, sink] = {
      FsDefault: [
        "import fs from 'fs';",
        (x) => `fs.readFileSync(${x}, 'utf8')`,
      ],
      RenamedDefaultNode: [
        "import fileSys from 'node:fs';",
        (x) => `fileSys.readFileSync(${x}, 'utf8')`,
      ],
      FspDefault: [
        "import fsp from 'fs/promises';",
        (x) => `fsp.readFile(${x})`,
      ],
      NamedNodePromises: [
        "import { readFile } from 'node:fs/promises';",
        (x) => `readFile(${x})`,
      ],
      RequirePromises: [
        "const fsp = require('fs').promises;",
        (x) => `fsp.readFile(${x})`,
      ],
      FsPromisesSub: [
        "import fs from 'node:fs';",
        (x) => `fs.promises.readFile(${x})`,
      ],
      CjsDestructureNode: [
        "const { readFileSync } = require('node:fs');",
        (x) => `readFileSync(${x}, 'utf8')`,
      ],
      LocalObject: [
        'const fs = { readFileSync: (p: string, e?: string) => [p, e] };',
        (x) => `fs.readFileSync(${x}, 'utf8')`,
      ],
    }[tag(s.binding)];
    let helper = '';
    const [pre, x] = {
      Literal: ['', "'./config.json'"],
      ReqQuery: ['', 'req.query.file'],
      Argv: ['', 'process.argv[2]'],
      Env: ['', 'process.env.CA_BUNDLE'],
      Destructured: ['const { file } = req.query;', 'file'],
      LetAssigned: ['let target;\n  target = req.query.file;', 'target'],
      Basename: ['', 'path.basename(req.query.file)'],
      JoinAllBasename: ['', 'path.join(ROOT, path.basename(req.query.file))'],
      JoinPartial: [
        '',
        'path.join(ROOT, req.query.folder, path.basename(req.query.name))',
      ],
      StartsWithGuard: [
        "const target = path.resolve(ROOT, req.query.file);\n  if (!target.startsWith(ROOT + path.sep)) throw new Error('outside root');",
        'target',
      ],
      UnresolvedParam: ['', 'userFile'],
      ParamFilledInFile: ['', null],
    }[tag(s.pathSrc)];
    let call;
    if (x === null) {
      helper = `function readSafe(safePath: string) {\n  return ${sink('safePath')};\n}`;
      call = 'return readSafe(req.query.file);';
    } else {
      call = `return ${sink(x)};`;
    }
    return `${head}\nimport path from 'node:path';\nconst ROOT = '/srv/files';\n${helper}\nexport async function handler(req: any, userFile: string) {\n  ${pre}\n  ${call}\n}\n`;
  },
  model: (s) => s.verdict,
};
