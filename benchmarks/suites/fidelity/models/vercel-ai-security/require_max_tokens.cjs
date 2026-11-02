const { tag } = require('../../lib.cjs');

const FN = {
  GenerateText: 'generateText',
  StreamText: 'streamText',
  GenerateObject: 'generateObject',
  StreamObject: 'streamObject',
  Embed: 'embed',
  GenerateTextureAtlas: 'generateTextureAtlas',
};

module.exports = {
  rule: 'require-max-tokens',
  domain: 360, // 2 importsAi x 5 opts x 6 fns x 3 spellings x 2 targets
  traces: 4000,
  key: (s) =>
    ['importsAi', 'opts', 'fn', 'spelling', 'onlyGenerateText']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    s.onlyGenerateText ? { targetFunctions: ['generateText'] } : {},
  code: (s) => {
    const f = tag(s.fn);
    const name = FN[f];
    const sp = tag(s.spelling);
    const src = s.importsAi ? "'ai'" : "'./llm'";
    // generateTextureAtlas is a local helper, never an SDK export.
    const local = f === 'GenerateTextureAtlas';
    const imp = local
      ? `import { generateText } from ${src};\nimport { generateTextureAtlas } from './textures';`
      : {
          Named: `import { ${name} } from ${src};`,
          Namespace: `import * as ai from ${src};`,
          Aliased: `import { ${name} as callModel } from ${src};`,
        }[sp];
    const callee = local
      ? name
      : { Named: name, Namespace: `ai.${name}`, Aliased: 'callModel' }[sp];
    const base = "model: m, prompt: 'Write a story'";
    const arg = {
      NoLimit: `{ ${base} }`,
      MaxTokens: `{ ${base}, maxTokens: 4096 }`,
      MaxOutputTokens: `{ ${base}, maxOutputTokens: 4096 }`,
      QuotedMaxTokens: `{ ${base}, 'maxTokens': 4096 }`,
      SpreadBase: "{ ...LIMITS, model: m, prompt: 'Write a story' }",
    }[tag(s.opts)];
    return [
      imp,
      "import { m, LIMITS } from './config';",
      'export async function POST(req) {',
      `  return ${callee}(${arg});`,
      '}',
      '',
    ].join('\n');
  },
};
