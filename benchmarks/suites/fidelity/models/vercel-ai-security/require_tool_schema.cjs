const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'require-tool-schema',
  domain: 48, // 2 importsAi x 4 forms x 6 schemas
  traces: 700,
  key: (s) =>
    ['importsAi', 'form', 'schema'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: () => ({}),
  code: (s) => {
    const schema = {
      NoSchema: '',
      InputSchema: 'inputSchema: z.object({ location: z.string().max(100) }),',
      Parameters: 'parameters: z.object({ location: z.string().max(100) }),',
      QuotedInputSchema:
        "'inputSchema': z.object({ location: z.string().max(100) }),",
      SpreadDef: '...weatherBase,',
      SchemaVar: 'inputSchema: locationSchema,',
    }[tag(s.schema)];
    const body = [
      "description: 'Get weather',",
      schema,
      'execute: async (params) => getWeather(params.location),',
    ]
      .filter(Boolean)
      .map((l) => `      ${l}`)
      .join('\n');
    const head = [
      s.importsAi
        ? "import { generateText, tool } from 'ai';"
        : "import { generateText, tool } from './llm';",
      "import { z } from 'zod';",
      "import { getWeather, weatherBase, m } from './weather';",
      'const locationSchema = z.object({ location: z.string() });',
    ].join('\n');
    switch (tag(s.form)) {
      case 'PlainInCall':
        return `${head}\nexport const run = () => generateText({\n  model: m,\n  prompt: 'Weather?',\n  tools: {\n    weather: {\n${body}\n    },\n  },\n});\n`;
      case 'QuotedToolsKey':
        return `${head}\nexport const run = () => generateText({\n  model: m,\n  prompt: 'Weather?',\n  'tools': {\n    weather: {\n${body}\n    },\n  },\n});\n`;
      case 'ToolsConst':
        return `${head}\nexport const tools = {\n    weather: {\n${body}\n    },\n};\n`;
      case 'ToolHelper':
        return `${head}\nexport const weatherTool = tool({\n${body}\n});\n`;
    }
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
