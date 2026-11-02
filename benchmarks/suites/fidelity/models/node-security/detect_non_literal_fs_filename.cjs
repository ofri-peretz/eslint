const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'detect-non-literal-fs-filename',
  domain: 400, // 10 bindings x 10 path shapes x 2 x 2 options
  traces: 4500,
  key: (s) =>
    `${tag(s.binding)}|${tag(s.pathShape)}|whole=${s.wholeOpt}|allowLit=${s.allowLit}`,
  config: (s) => ({
    reportWholeProcessValues: s.wholeOpt,
    allowLiterals: s.allowLit,
  }),
  code: (s) => {
    const p = {
      LiteralPlain: "'/etc/app/config.json'",
      LiteralDotDot: "'../config.json'",
      LiteralTraversalSensitive: "'../../etc/passwd'",
      EnvWhole: 'process.env.CA_BUNDLE',
      EnvResolveWhole: 'path.resolve(process.env.CA_BUNDLE)',
      EnvConcat: "'/etc/app/' + process.env.NAME",
      ArgvJoin: "path.join(__dirname, 'packages', process.argv[2])",
      ArgvTemplate: '`/srv/data/${process.argv[2]}.json`',
      ReqConcat: "'/uploads/' + req.params.file",
      Unresolved: "path.join('/uploads', name)",
    }[tag(s.pathShape)];
    const [head, call, tail] = {
      FsDefault: ["import fs from 'fs';", `fs.readFileSync(${p});`, ''],
      NsNode: [
        "import * as fileSystem from 'node:fs';",
        `fileSystem.readFileSync(${p});`,
        '',
      ],
      NamedPromises: [
        "import { readFile } from 'fs/promises';",
        `readFile(${p});`,
        '',
      ],
      NamedRenamedNodePromises: [
        "import { readFile as rf } from 'node:fs/promises';",
        `rf(${p});`,
        '',
      ],
      CjsDestructureNode: [
        "const { readFileSync } = require('node:fs');",
        `readFileSync(${p});`,
        '',
      ],
      PromisesSub: [
        "const fs = require('fs');",
        `fs.promises.readFile(${p});`,
        '',
      ],
      Bracket: [
        "const fs = require('node:fs');",
        `fs['readFileSync'](${p});`,
        '',
      ],
      RequireBelow: ['', `fs.readFileSync(${p});`, "const fs = require('fs');"],
      BareUnimported: ['', `fs.readFileSync(${p});`, ''],
      LocalObject: [
        'const fs = { readFileSync: (f: string) => f };',
        `fs.readFileSync(${p});`,
        '',
      ],
    }[tag(s.binding)];
    return `import path from 'node:path';\n${head}\nexport function handler(req: any, name: string) {\n  ${call}\n}\n${tail}\n`;
  },
  model: (s) => s.verdict,
};
