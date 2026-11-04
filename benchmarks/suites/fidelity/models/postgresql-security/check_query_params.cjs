const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

const ONE = 'SELECT id, name FROM users WHERE id = $1';
const TWO = 'SELECT id, name FROM users WHERE id = $1 AND active = $2';

/** call shape -> the query call's arguments. */
const CALLS = {
  Missing: `'${TWO}', [id]`,
  Extra: `'${ONE}', [id, req.body.name, req.body.email]`,
  PlaceholdersNoValues: `'${ONE}'`,
  CallbackNoValues: `'${ONE}', (err: Error, r: unknown) => res.json(r)`,
  TemplateMissing: `\`${TWO}\`, [id]`,
  ConfigMissing: `{ text: '${TWO}', values: [id] }`,
  Match1: `'${ONE}', [id]`,
  Match2: `'${TWO}', [id, true]`,
  Repeated: "'SELECT id FROM users WHERE id = $1 OR parent_id = $1', [id]",
  CastMatch:
    "'SELECT id FROM users WHERE id = $1::uuid AND name = $2::text', [id, req.body.name]",
  TemplateMatch: `\`${TWO}\`, [id, true]`,
  ConfigMatch: `{ text: '${TWO}', values: [id, true] }`,
  Spread: `'${TWO}', [...params]`,
  NoParams: "'SELECT id, name FROM users'",
  Prepare: "'PREPARE find_user AS SELECT id, name FROM users WHERE id = $1'",
};

function code(s) {
  const d = tag(s.driver);
  const call = tag(s.call);
  const ctor = d === 'SinkBracket' ? 'Named' : d;
  const handle = d === 'Client' ? 'client' : 'pool';
  const sink = d === 'SinkBracket' ? `${handle}['query']` : `${handle}.query`;
  const pre = call === 'Spread' ? 'const params: unknown[] = [id];\n' : '';
  return program(ctor, `${pre}return ${sink}(${CALLS[call]});`, { handle });
}

module.exports = {
  rule: 'check-query-params',
  domain: 9 * 15,
  traces: 900,
  key: (s) => `${tag(s.driver)}|${tag(s.call)}`,
  code,
};
