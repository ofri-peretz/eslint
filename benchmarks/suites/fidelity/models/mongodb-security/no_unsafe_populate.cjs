const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee } = require('../../mongodb.cjs');

const PATHS = {
  QueryValue: 'req.query.include',
  BodyMember: 'req.body.populateOptions',
  ObjectPathReq: '{ path: req.body.path, select: req.body.fields }',
  ObjectSelectReq: "{ path: 'author', select: req.body.fields }",
  TemplateReq: '`${req.query.relation}`',
  ArrayReq: "[req.query.relation, 'author']",
  NestedReq: "{ path: 'author', populate: { path: req.query.nested } }",
  Literal: "'author'",
  ConstLiteral: 'AUTHOR',
  ArrayLiteral: "['author', 'comments']",
  ObjectLiteral: "{ path: 'author', select: 'name' }",
  NestedLiteral: "{ path: 'author', populate: { path: 'org' } }",
};

const base = {
  rule: 'no-unsafe-populate',
  domain: 72, // 6 receivers x 12 paths
  traces: 480,
  key: (s) => `${tag(s.receiver)}|${tag(s.path)}`,
  code: (s) => {
    const r = tag(s.receiver);
    const p = PATHS[tag(s.path)];
    // `Document`: populate on a loaded document, not on the query.
    const body =
      r === 'Document'
        ? `const doc = await ${callee('Model', 'findById')}(id);\nreturn doc.populate(${p});`
        : `return ${callee(r, 'findById')}(id).populate(${p});`;
    return program(r === 'Document' ? 'Model' : r, body, {
      pre: "const AUTHOR = 'author';",
    });
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
