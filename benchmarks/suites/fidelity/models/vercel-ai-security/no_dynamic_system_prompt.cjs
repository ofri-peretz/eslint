const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-dynamic-system-prompt',
  domain: 104, // 2 importsAi x 2 keys x 13 values x 2 allowStatic
  traces: 1300,
  key: (s) =>
    ['importsAi', 'key', 'value', 'allowStatic']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({ allowStaticTemplates: s.allowStatic }),
  code: (s) => {
    const pre = [];
    const top = [];
    let value;
    switch (tag(s.value)) {
      case 'StaticString':
        value = "'You are a helpful assistant.'";
        break;
      case 'StaticConst':
        top.push("const SYSTEM = 'You are a helpful coding assistant.';");
        value = 'SYSTEM';
        break;
      case 'StaticTemplate':
        value =
          '`You are a helpful assistant.\n  You can help with coding tasks.`';
        break;
      case 'TemplateExpr':
        value = '`You are a ${role} assistant.`';
        break;
      case 'ConcatVar':
        value = "'You are a ' + role + ' assistant.'";
        break;
      case 'ExternalCall':
        value = 'getSystemPrompt(role)';
        break;
      case 'AwaitFetch':
        value = 'await fetchSystemPrompt()';
        break;
      case 'ConstOnlyTemplate':
        top.push("const BASE = 'You are a helpful assistant.';");
        value = '`${BASE} Be concise.`';
        break;
      case 'DateTemplate':
        value =
          '`You are a helpful assistant. Today is ${new Date().toISOString()}.`';
        break;
      case 'ReqBody':
        value = 'req.body.persona';
        break;
      case 'ReqJsonDestructured':
        pre.push('const { persona } = await req.json();');
        value = 'persona';
        break;
      case 'SearchParam':
        pre.push('const { searchParams } = new URL(req.url);');
        value = "searchParams.get('persona')";
        break;
      case 'SameFileStaticFn':
        top.push(
          "function buildSystemPrompt() {\n  return 'You are a helpful assistant.';\n}",
        );
        value = 'buildSystemPrompt()';
        break;
    }
    const k = tag(s.key) === 'SystemKey' ? 'system' : 'instructions';
    return [
      s.importsAi
        ? "import { generateText } from 'ai';"
        : "import { generateText } from './llm';",
      "import { getSystemPrompt, fetchSystemPrompt, m } from './prompts';",
      ...top,
      'export async function POST(req, role) {',
      ...pre.map((l) => `  ${l}`),
      `  return generateText({ model: m, ${k}: ${value}, prompt: 'Hello' });`,
      '}',
      '',
    ].join('\n');
  },
};
