// Shared spelling for the mcp-sdk-security renderers: how a tool handler is
// registered, how it reads its argument, and how that value is bound before
// it reaches a sink. Every function here only spells code; no verdicts.

/** How a value travels from the handler to the sink (the `Binding` dimension). */
export function bind(binding, expr, sink) {
  switch (binding) {
    case 'Inline':
      return { top: '', body: `  ${sink(expr)}` };
    case 'ViaConst':
      return { top: '', body: `  const v = ${expr};\n  ${sink('v')}` };
    case 'ViaLet':
      return {
        top: '',
        body: `  let v = 'fixed';\n  v = ${expr};\n  ${sink('v')}`,
      };
    case 'ViaHelperReturn':
      return {
        top: 'function pick(a: any) {\n  return a;\n}\n',
        body: `  ${sink(`pick(${expr})`)}`,
      };
    case 'ViaHelperSink':
      return {
        top: `async function sinkIt(a: any) {\n  ${sink('a')}\n}\n`,
        body: `  await sinkIt(${expr});`,
      };
    case 'ViaObjectField':
      return {
        top: `async function sinkIt(o: any) {\n  ${sink('o.value')}\n}\n`,
        body: `  await sinkIt({ value: ${expr}, other: 1 });`,
      };
    case 'ViaElement':
      return {
        top: '',
        body: `  for (const e of [${expr}]) {\n    ${sink('e')}\n  }`,
      };
    default:
      throw new Error(`unknown binding ${binding}`);
  }
}

/** A v1 `registerTool` whose handler destructures one string argument. */
export function v1Tool(arg, body) {
  return [
    "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';",
    "import { z } from 'zod';",
    "const server = new McpServer({ name: 'x', version: '1.0.0' });",
    `server.registerTool('t', { inputSchema: { ${arg}: z.string() } }, async ({ ${arg} }) => {`,
    body,
    '  return { content: [] };',
    '});',
  ].join('\n');
}
