const { tag } = require('../../lib.cjs');
const { supabaseClient, handlerFile } = require('../../orm.cjs');

/** opts -> { pre?: module-level statements, arg: the options argument }. */
const OPTS = {
  PublicTrue: { arg: '{ public: true }' },
  QuotedTrue: { arg: "{ 'public': true }" },
  ConstOptions: {
    pre: 'const OPTS = { public: true, fileSizeLimit: 1024 };',
    arg: 'OPTS',
  },
  ConstFlag: { pre: 'const PUBLIC = true;', arg: '{ public: PUBLIC }' },
  SpreadConst: {
    pre: 'const BASE = { public: true };',
    arg: '{ ...BASE, fileSizeLimit: 1024 }',
  },
  FalseThenSpreadPublic: {
    pre: 'const BASE = { public: true };',
    arg: '{ public: false, ...BASE }',
  },
  NoOptions: { arg: null },
  PublicFalse: { arg: '{ public: false }' },
  OtherOptions: {
    arg: "{ fileSizeLimit: 1024, allowedMimeTypes: ['image/png'] }",
  },
  ConstFlagFalse: { pre: 'const PUBLIC = false;', arg: '{ public: PUBLIC }' },
  SpreadThenFalse: {
    pre: 'const BASE = { public: true };',
    arg: '{ ...BASE, public: false }',
  },
  TrueThenSpreadUnknown: { arg: '{ public: true, ...req.body.overrides }' },
  SpreadRequest: { arg: '{ ...req.body }' },
  RequestFlag: { arg: '{ public: req.body.public === true }' },
};

function code(s) {
  const o = OPTS[tag(s.opts)];
  const m = tag(s.method) === 'CreateBucket' ? 'createBucket' : 'updateBucket';
  const callee =
    tag(s.call) === 'Dot' ? `db.storage.${m}` : `db.storage['${m}']`;
  const args = ["'user-documents'", o.arg].filter(Boolean).join(', ');
  return handlerFile(
    [...supabaseClient(tag(s.spelling)), o.pre ?? ''],
    `return ${callee}(${args});`,
  );
}

module.exports = {
  rule: 'no-public-storage-bucket',
  domain: 6 * 2 * 2 * 14, // spellings x methods x call spellings x options
  traces: 2500,
  key: (s) =>
    `${tag(s.spelling)}|${tag(s.method)}|${tag(s.call)}|${tag(s.opts)}`,
  code,
};
