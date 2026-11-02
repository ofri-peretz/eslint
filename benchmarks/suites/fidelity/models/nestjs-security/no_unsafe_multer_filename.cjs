const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'no-unsafe-multer-filename',
  // (2 values x 3 forms x 2 cb names x 3 spellings + 9 values) x 2 keys x 2 nestImport
  domain: (36 + 9) * 4,
  traces: 3500,
  key: (s) =>
    ['form', 'value', 'cbIsCd', 'spelling', 'key', 'nestImport']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const cb = s.cbIsCd ? 'cd' : 'cb';
    const v = tag(s.value);
    const fileParam = v === 'Destructured' ? '{ originalname }' : 'file';
    const body = {
      Raw: [`${cb}(null, file.originalname);`],
      TemplatePrefix: [
        `${cb}(null, \`\${Date.now()}-\${file.originalname}\`);`,
      ],
      Concat: [
        `${cb}(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + file.originalname);`,
      ],
      ViaLocal: ['const name = file.originalname;', `${cb}(null, name);`],
      ViaLocalConcat: [
        'let original = file.originalname;',
        `${cb}(null, Date.now() + '-' + original);`,
      ],
      Destructured: [`${cb}(null, originalname);`],
      Bracket: [`${cb}(null, file['originalname']);`],
      Extname: [
        `${cb}(null, \`\${randomUUID()}\${extname(file.originalname)}\`);`,
      ],
      Basename: [`${cb}(null, basename(file.originalname));`],
      MethodCall: [`${cb}(null, file.originalname.toLowerCase());`],
      Generated: [`${cb}(null, randomUUID());`],
    }[v]
      .map((l) => `      ${l}`)
      .join('\n');
    const k = tag(s.key) === 'FilenameKey' ? 'filename' : 'destination';
    const params = `req, ${fileParam}, ${cb}`;
    const prop = {
      MethodForm: `${k}(${params}) {\n${body}\n    }`,
      ArrowProp: `${k}: (${params}) => {\n${body}\n    }`,
      AsyncArrowProp: `${k}: async (${params}) => {\n${body}\n    }`,
    }[tag(s.form)];
    const sp = tag(s.spelling);
    const imp = {
      NamedImport: "import { diskStorage } from 'multer';",
      NamespaceImport: "import * as multer from 'multer';",
      RequireDestructure: "const { diskStorage } = require('multer');",
    }[sp];
    const ds = sp === 'NamespaceImport' ? 'multer.diskStorage' : 'diskStorage';
    return [
      s.nestImport ? "import { Injectable } from '@nestjs/common';" : '',
      imp,
      "import { randomUUID } from 'node:crypto';",
      "import { basename, extname } from 'node:path';",
      `export const storage = ${ds}({`,
      `    ${prop},`,
      '});',
      '',
    ]
      .filter((l, i) => l !== '' || i > 0)
      .join('\n');
  },
  filename: 'src/upload.module.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
