const { tag } = require('../../lib.cjs');

const FILTER =
  "fileFilter: (req: any, file: any, cb: any) => cb(null, ['image/png', 'image/jpeg'].includes(file.mimetype))";
const LIMITS = 'limits: { fileSize: 5 * 1024 * 1024 }';

module.exports = {
  domain: 56, // 7 configs x 2 usages x 4 import styles
  traces: 900,
  rule: 'require-mime-type-validation',
  key: (s) => `${tag(s.cfg)}|${tag(s.usage)}|${tag(s.imp)}`,
  config: () => undefined,
  code: (s) => {
    const name = tag(s.imp) === 'ImportRenamed' ? 'uploader' : 'multer';
    const imp = {
      NoImport: 'declare const multer: any;',
      Require: "const multer = require('multer');",
      ImportDefault: "import multer from 'multer';",
      ImportRenamed: "import uploader from 'multer';",
    }[tag(s.imp)];
    const args = {
      NoArgs: '',
      DestOnly: "{ dest: 'uploads/' }",
      FileFilter: `{ dest: 'uploads/', ${FILTER} }`,
      LimitsOnly: `{ dest: 'uploads/', ${LIMITS} }`,
      Both: `{ dest: 'uploads/', ${LIMITS}, ${FILTER} }`,
      LimitsEmpty: "{ dest: 'uploads/', limits: {} }",
      StorageOnly: `{ storage: ${name}.diskStorage({ destination: 'uploads/' }) }`,
    }[tag(s.cfg)];
    const use =
      tag(s.usage) === 'Chained'
        ? `app.post('/photos', ${name}(${args}).array('photos'), handler);`
        : `const upload = ${name}(${args});\napp.post('/photos', upload.single('photo'), handler);`;
    return `${imp}\ndeclare const app: any;\ndeclare const handler: any;\n${use}\n`;
  },
  model: (s) => s.verdict,
};
