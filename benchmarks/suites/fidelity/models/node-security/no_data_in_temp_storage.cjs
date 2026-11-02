const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'no-data-in-temp-storage',
  domain: 48, // 8 path kinds x 3 sinks x 2 fs import spellings
  traces: 600,
  key: (s) => `${tag(s.pathKind)}|${tag(s.sink)}|${tag(s.fsImport)}`,
  code: (s) => {
    const head = {
      EsmNode:
        "import fs from 'node:fs';\nimport path from 'node:path';\nimport os from 'node:os';\nimport crypto from 'node:crypto';",
      Cjs: "const fs = require('fs');\nconst path = require('path');\nconst os = require('os');\nconst crypto = require('crypto');",
    }[tag(s.fsImport)];
    const [pre, p] = {
      TmpLiteral: ['', "'/tmp/credentials.json'"],
      VarTmpViaConst: [
        "const tempTokenPath = '/var/tmp/session.token';",
        'tempTokenPath',
      ],
      TmpdirJoinConst: [
        "const file = path.join(os.tmpdir(), 'report-cache.tmp');",
        'file',
      ],
      TmpdirJoinRandom: [
        "const file = path.join(os.tmpdir(), crypto.randomUUID() + '.tmp');",
        'file',
      ],
      MkdtempDir: [
        "const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-export-'));",
        "path.join(dir, 'export.json')",
      ],
      TemplatesSubstring: ['', "'/srv/app/templates.json'"],
      HomeDir: [
        "const secureDir = path.join(os.homedir(), '.myapp', 'data');",
        "path.join(secureDir, 'session.json')",
      ],
      TempRelative: ['', "'temp/session.json'"],
    }[tag(s.pathKind)];
    const sink = {
      WriteFileSync: `fs.writeFileSync(${p}, token);`,
      WriteFileCb: `fs.writeFile(${p}, token, (err: unknown) => { if (err) throw err; });`,
      NoWrite: `console.log(\`state lives in \${${p}}\`);`,
    }[tag(s.sink)];
    return `${head}\nexport function persist(token: string) {\n  ${pre}\n  ${sink}\n}\n`;
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, {
  option: 'ignoreFiles',
  flip: ['fixtures/'],
  testFile: 'src/fixtures/app.ts',
});
