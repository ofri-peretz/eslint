const { tag } = require('../../lib.cjs');
const { supabaseClient } = require('../../orm.cjs');

/**
 * name -> { pre?: module-level statements, body?: handler statements before
 * the call, args: the rpc arguments, fn?: a wrapper `(name: <type>)` }.
 */
const NAMES = {
  Literal: { args: "'get_user_profile', { id }" },
  TemplatePlain: { args: '`get_user_profile`, { id }' },
  TemplateConstHole: { pre: 'const V = 2;', args: '`stats_v${V}`, { id }' },
  TemplateNumberHole: { args: '`stats_v${2}`, { id }' },
  ConstName: { pre: "const FN = 'get_user_profile';", args: 'FN, { id }' },
  TernaryFixed: {
    args: "req.query.full ? 'get_user_profile' : 'get_user_summary', { id }",
  },
  Lookup: {
    pre: "const RPC = { profile: 'get_user_profile', orders: 'get_user_orders' };",
    args: 'RPC[req.query.kind as keyof typeof RPC], { id }',
  },
  LookupAsConst: {
    pre: "const RPC = { profile: 'get_user_profile', orders: 'get_user_orders' } as const;",
    args: 'RPC[req.query.kind as keyof typeof RPC], { id }',
  },
  LookupDot: {
    pre: "const RPC = { single: 'get_user_profile' };",
    args: 'RPC.single, { id }',
  },
  UnionParam: {
    fn: "'get_user_profile' | 'get_user_orders'",
    args: 'name, { id }',
  },
  UnionAlias: {
    pre: "type Fn = 'get_user_profile' | 'get_user_orders';",
    fn: 'Fn',
    args: 'name, { id }',
  },
  SpreadArg: {
    body: 'const args = req.body.call as [string, object];',
    args: '...args',
  },
  ReqField: { args: 'req.body.fn, { id }' },
  TemplateReq: { args: '`get_${req.query.kind}`, { id }' },
  StringParam: { fn: 'string', args: 'name, { id }' },
  ReassignedLet: {
    body: "let fn = 'get_user_profile';\nif (req.query.orders) fn = 'get_user_orders';",
    args: 'fn, { id }',
  },
  TableComputed: {
    pre: "const KEY = 'orders';",
    body: "const RPC = { profile: 'get_user_profile', [KEY]: req.body.fn };",
    args: 'RPC[req.query.kind as keyof typeof RPC], { id }',
  },
  TableSpread: {
    body: "const RPC = { ...req.body.extra, profile: 'get_user_profile' };",
    args: 'RPC[req.query.kind], { id }',
  },
  Imported: {
    pre: "import { PROFILE_FN } from './rpc-names';",
    args: 'PROFILE_FN, { id }',
  },
  TernaryReq: {
    args: "req.query.full ? 'get_user_profile' : req.body.fn, { id }",
  },
};

function code(s) {
  const n = NAMES[tag(s.name)];
  const callee = tag(s.call) === 'Dot' ? 'db.rpc' : "db['rpc']";
  const call = `return ${callee}(${n.args});`;
  const lines = [...supabaseClient(tag(s.spelling)), n.pre ?? ''];
  if (n.fn)
    return (
      [
        ...lines,
        `export async function load(name: ${n.fn}, id: string) {\n  ${call}\n}`,
      ]
        .filter(Boolean)
        .join('\n') + '\n'
    );
  const body = [n.body, call].filter(Boolean).join('\n');
  return (
    [
      ...lines,
      `export async function handle(req: any, res: any, id: string) {\n${body
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}\n}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

module.exports = {
  rule: 'no-dynamic-rpc-name',
  domain: 6 * 2 * 20, // spellings x call spellings x names
  traces: 1500,
  key: (s) => `${tag(s.spelling)}|${tag(s.call)}|${tag(s.name)}`,
  code,
};
