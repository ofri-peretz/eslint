const { tag, withTestFile } = require('../../lib.cjs');
const { program, callee } = require('../../mongodb.cjs');

// [extra imports, filter]
const PATTERNS = {
  RegexQuery: ['', '{ name: { $regex: req.query.search } }'],
  RegexBodyWithOptions: [
    '',
    "{ name: { $regex: req.body.pattern, $options: 'i' } }",
  ],
  RegexTemplateReq: ['', '{ name: { $regex: `^${req.query.search}` } }'],
  NewRegExpReq: ['', '{ name: new RegExp(req.query.search) }'],
  RegExpCallReq: ['', "{ name: RegExp(req.query.search, 'i') }"],
  RegexInOr: [
    '',
    '{ $or: [{ name: { $regex: req.query.search } }, { active: true }] }',
  ],
  EscapedCall: [
    "import escapeRegex from 'escape-string-regexp';",
    "{ name: { $regex: escapeRegex(req.query.search), $options: 'i' } }",
  ],
  EscapedTemplate: [
    "import escapeRegex from 'escape-string-regexp';",
    '{ name: { $regex: `^${escapeRegex(req.query.search)}` } }',
  ],
  LodashEscaped: [
    "import _ from 'lodash';",
    '{ name: { $regex: `^${_.escapeRegExp(req.query.search)}$` } }',
  ],
  DefaultImportEscaper: [
    "import quote from 'escape-string-regexp';",
    '{ name: { $regex: quote(req.query.search) } }',
  ],
  TextSearch: ['', '{ $text: { $search: req.query.search } }'],
  LiteralString: ['', "{ name: { $regex: '^admin' } }"],
  RegexLiteral: ['', '{ name: /^admin/i }'],
};

const base = {
  rule: 'no-unsafe-regex-query',
  domain: 78, // 6 receivers x 13 patterns
  traces: 520,
  key: (s) => `${tag(s.receiver)}|${tag(s.pattern)}`,
  code: (s) => {
    const r = tag(s.receiver);
    const [imports, f] = PATTERNS[tag(s.pattern)];
    return program(r, `return ${callee(r, 'find')}(${f});`, { imports });
  },
};

module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
