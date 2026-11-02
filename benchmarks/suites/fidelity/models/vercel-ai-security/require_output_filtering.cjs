const { tag } = require('../../lib.cjs');

const RET = {
  DbQuery: 'db.query(sql)',
  PrismaFind: 'prisma.user.findUnique({ where: { id } })',
  SupabaseSelect: "supabase.from('users').select('*')",
  UsersFindById: 'users.findById(id)',
  GetWeather: 'getWeather(id)',
  FetchData: 'fetchData(id)',
  Filtered: 'filterSensitive(await db.query(sql))',
  RemovePII: 'removePII(await prisma.user.findUnique({ where: { id } }))',
};

module.exports = {
  rule: 'require-output-filtering',
  domain: 128, // 2 importsAi x 4 exec forms x 8 returns x 2 containers
  traces: 1600,
  key: (s) =>
    ['importsAi', 'execForm', 'ret', 'container']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const r = RET[tag(s.ret)];
    const exec = {
      ArrowExpr: `execute: async ({ id, sql }) => ${r},`,
      BlockReturn: `execute: async ({ id, sql }) => {\n      return ${r};\n    },`,
      BlockVar: `execute: async ({ id, sql }) => {\n      const rows = await ${r};\n      return rows;\n    },`,
      MethodForm: `async execute({ id, sql }) {\n      return ${r};\n    },`,
    }[tag(s.execForm)];
    const body = `    description: 'Look up a user',\n    inputSchema: z.object({ id: z.string(), sql: z.string() }),\n    ${exec}`;
    const def =
      tag(s.container) === 'ToolHelper'
        ? `export const lookup = tool({\n${body}\n});`
        : `export const tools = {\n  lookup: {\n${body}\n  },\n};`;
    return [
      s.importsAi
        ? "import { tool } from 'ai';"
        : "import { tool } from './llm';",
      "import { z } from 'zod';",
      "import { db, prisma, supabase, users, getWeather, fetchData, filterSensitive, removePII } from './data';",
      def,
      '',
    ].join('\n');
  },
};
