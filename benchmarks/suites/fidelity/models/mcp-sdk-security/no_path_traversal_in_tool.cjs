const { tag } = require('../../lib.cjs');
const { toolProgram } = require('../../mcp-sdk.cjs');

/** Sink tag -> [imports, statement(path)]. */
const SINKS = {
  FsPromisesNamed: [
    "import { readFile } from 'node:fs/promises';",
    (v) => `const text = await readFile(${v}, 'utf8');`,
  ],
  FsDefaultSync: [
    "import fs from 'fs';",
    (v) => `const text = fs.readFileSync(${v}, 'utf8');`,
  ],
  FsPromisesMember: [
    "import * as fs from 'node:fs';",
    (v) => `await fs.promises.writeFile(${v}, 'data');`,
  ],
  RequireUnlink: ['', (v) => `require('fs').unlinkSync(${v});`],
  FsExtra: [
    "import fse from 'fs-extra';",
    (v) => `await fse.rm(${v}, { recursive: true });`,
  ],
  GracefulFs: [
    "import gfs from 'graceful-fs';",
    (v) => `gfs.appendFileSync(${v}, 'line');`,
  ],
  RenameTarget: [
    "import { rename } from 'node:fs/promises';",
    (v) => `await rename(path.join(ROOT, 'inbox.txt'), ${v});`,
  ],
  CopyFileSource: [
    "import { copyFileSync } from 'fs';",
    (v) => `copyFileSync(${v}, path.join(ROOT, 'backup.txt'));`,
  ],
  ReadStream: [
    "import { createReadStream } from 'fs';",
    (v) => `const stream = createReadStream(${v});`,
  ],
  Readdir: [
    "import { readdir } from 'fs/promises';",
    (v) => `const names = await readdir(${v});`,
  ],
  StoreReadFile: [
    "import { store } from './store';",
    (v) => `const text = await store.readFile(${v});`,
  ],
};

/** Flow tag -> statements before the sink, the path expression, statements after. */
const FLOWS = {
  Direct: (a) => ['', a],
  Join: (a) => ['', `path.join(ROOT, ${a})`],
  Resolve: (a) => [`const target = path.resolve(ROOT, ${a});`, 'target'],
  Template: (a) => ['', `\`\${ROOT}/\${${a}}\``],
  Realpath: (a) => [
    `const target = await realpath(path.join(ROOT, ${a}));`,
    'target',
  ],
  Basename: (a) => ['', `path.join(ROOT, path.basename(${a}))`],
  RelativeCheck: (a) => [
    `const target = path.resolve(ROOT, ${a});\nconst rel = path.relative(ROOT, target);\nif (rel.startsWith('..') || path.isAbsolute(rel)) {\n  throw new Error('outside the workspace');\n}`,
    'target',
  ],
  PrefixCheck: (a) => [
    `const target = path.resolve(ROOT, ${a});\nif (!target.startsWith(ROOT + path.sep)) {\n  return { isError: true, content: [] };\n}`,
    'target',
  ],
  AllowlistCheck: (a) => [
    `if (!ALLOWED_FILES.includes(${a})) throw new Error('not allowed');`,
    `path.join(ROOT, ${a})`,
  ],
  RegexCheck: (a) => [
    `if (!/^[a-z0-9_-]+\\.md$/.test(${a})) throw new Error('bad name');`,
    `path.join(ROOT, ${a})`,
  ],
  EndsWithCheck: (a) => [
    `if (!${a}.endsWith('.md')) throw new Error('markdown only');`,
    `path.join(ROOT, ${a})`,
  ],
  ExistsCheck: (a) => [
    `if (!existsSync(path.join(ROOT, ${a}))) throw new Error('missing');`,
    `path.join(ROOT, ${a})`,
  ],
  NonExitingCheck: (a) => [
    `const target = path.resolve(ROOT, ${a});\nif (!target.startsWith(ROOT + path.sep)) {\n  console.warn('outside the workspace');\n}`,
    'target',
  ],
  Literal: () => ['', "path.join(ROOT, 'README.md')"],
};

module.exports = {
  rule: 'no-path-traversal-in-tool',
  // Wiring: 54 gate/registration pairs x 2 sinks x 2 flows = 216.
  // Sinks: 11 sinks x 14 flows = 154.
  domain: 370,
  traces: 3600,
  key: (s) =>
    `${tag(s.part)}|${tag(s.gate)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.flow)}`,
  code: (s) => {
    const [imports, stmt] = SINKS[tag(s.sink)];
    const flow = FLOWS[tag(s.flow)];
    return toolProgram(
      tag(s.gate),
      tag(s.reg),
      (a) => {
        const [p, v] = flow(a);
        return [p, stmt(v)].filter(Boolean).join('\n');
      },
      {
        arg: 'file',
        imports: [
          imports,
          "import path from 'node:path';",
          "import { existsSync } from 'node:fs';",
          "import { realpath } from 'node:fs/promises';",
        ]
          .filter(Boolean)
          .join('\n'),
        pre: "const ROOT = '/srv/docs';\nconst ALLOWED_FILES = ['README.md', 'CHANGELOG.md'];",
      },
    );
  },
};
