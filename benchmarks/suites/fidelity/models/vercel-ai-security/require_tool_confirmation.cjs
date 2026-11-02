const { tag } = require('../../lib.cjs');

const NAME = {
  DeleteFile: 'deleteFile',
  TransferFunds: 'transferFunds',
  SendEmail: 'sendEmail',
  ExecuteCommand: 'executeCommand',
  UpdateRecord: 'updateRecord',
  CreateChart: 'createChart',
  GetWeather: 'getWeather',
  RunReport: 'runReport',
  DropdownOptions: 'dropdownOptions',
};
const FLAG = {
  RequiresConfirmation: 'requiresConfirmation: true,',
  RequiresApproval: 'requiresApproval: true,',
  ConfirmTrue: 'confirm: true,',
  NeedsApproval: 'needsApproval: true,',
};

module.exports = {
  rule: 'require-tool-confirmation',
  domain: 252, // 2 importsAi x 9 names x 7 confirmations x 2 forms
  traces: 3000,
  key: (s) =>
    ['importsAi', 'toolName', 'confirm', 'form']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const c = tag(s.confirm);
    const body = [
      "description: 'Performs the action',",
      'inputSchema: z.object({ id: z.string() }),',
      FLAG[c] ?? '',
      c === 'NoExecute'
        ? ''
        : 'execute: async ({ id }) => backend.perform(id),',
    ]
      .filter(Boolean)
      .map((l) => `      ${l}`)
      .join('\n');
    const def =
      tag(s.form) === 'ToolHelper'
        ? `tool({\n${body}\n    })`
        : `{\n${body}\n    }`;
    return [
      s.importsAi
        ? "import { generateText, tool } from 'ai';"
        : "import { generateText, tool } from './llm';",
      "import { z } from 'zod';",
      "import { backend, m, approveTool } from './deps';",
      'export async function POST(req) {',
      '  return generateText({',
      '    model: m,',
      "    prompt: 'Handle the request',",
      c === 'CallToolApproval' ? '    toolApproval: approveTool,' : '',
      '    tools: {',
      `    ${NAME[tag(s.toolName)]}: ${def},`,
      '    },',
      '  });',
      '}',
      '',
    ]
      .filter((l) => l !== '')
      .join('\n');
  },
};
