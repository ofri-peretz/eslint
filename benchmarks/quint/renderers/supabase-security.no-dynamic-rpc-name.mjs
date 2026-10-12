// Renders one state of models/supabase-security.no-dynamic-rpc-name.qnt.
// Spells the shape only; the verdict is the model's `expected`.

export const plugin = 'supabase-security';
export const rule = 'no-dynamic-rpc-name';
export const dimensions = ['name', 'client'];

const NAME = {
  Literal: ['', "'get_stats'"],
  ConstLiteral: ["const FN = 'get_stats';\n", 'FN'],
  Ternary: ['', "alt ? 'match_v2' : 'match_v1'"],
  TableKnownKey: [
    "const RPC = { single: 'get_single', multi: 'get_multi' } as const;\n",
    'RPC.single',
  ],
  TableDynamicKey: [
    "const RPC = { single: 'get_single', multi: 'get_multi' } as const;\n",
    'RPC[kind]',
  ],
  TemplateFixed: ['const V = 2;\n', '`get_stats_v${V}`'],
  TemplateOfReq: ['', '`get_${req.query.kind}`'],
  ReqField: ['', 'req.query.fn'],
  StringParam: ['', 'name'],
  UnionParam: ['', 'fixed'],
  LetReassigned: ['', 'fn'],
  ImportedName: ["import { FN_NAME } from './fns';\n", 'FN_NAME'],
};

const CLIENT = {
  ConstClient: [
    "import { createClient } from '@supabase/supabase-js';\nconst db = createClient('u', 'k');\n",
    'db',
  ],
  ParamClient: [
    "import { createClient, type SupabaseClient } from '@supabase/supabase-js';\n",
    'client',
  ],
  AliasedImport: [
    "import { createClient as mk } from '@supabase/supabase-js';\nconst db = mk('u', 'k');\n",
    'db',
  ],
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const [top, expr] = NAME[c.name];
  const [head, recv] = CLIENT[c.client];
  const kindType = top.includes('RPC') ? 'keyof typeof RPC' : 'string';
  const pre =
    c.name === 'LetReassigned'
      ? "  let fn = 'get_a';\n  fn = req.query.fn;\n"
      : '';
  return [
    head + top,
    `export async function run(req: any, client: any, alt: boolean, kind: ${kindType}, name: string, fixed: 'get_a' | 'get_b') {`,
    `${pre}  return ${recv}.rpc(${expr}, {});`,
    '}',
    '',
  ].join('\n');
}
