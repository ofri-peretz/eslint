const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 22,
  traces: 250,
  rule: 'no-unsafe-deserialization',
  key: (s) => `${tag(s.sink)}|${tag(s.input)}`,
  config: () => ({}),
  code: (s) => {
    const v = tag(s.input) === 'ReqBody' ? 'req.body.payload' : '\'{"a":1}\'';
    const call = {
      Eval: `eval(${v})`,
      NewFunction: `new Function(${v})`,
      SetTimeoutStr: `setTimeout('run(' + ${v} + ')', 100)`,
      SetTimeoutFn: `setTimeout(() => run(${v}), 100)`,
      Unserialize: `serialize.unserialize(${v})`,
      JsYamlLoad: `yaml.load(${v})`,
      JsYamlSafeSchema: `yaml.load(${v}, { schema: yaml.JSON_SCHEMA })`,
      JsYamlSafeLoad: `yaml.safeLoad(${v})`,
      YamlParse: `YAML.parse(${v})`,
      JsonParse: `JSON.parse(${v})`,
      DeserializeCall: `Codec.deserialize(${v})`,
    }[tag(s.sink)];
    return `const serialize = require('node-serialize');\nimport yaml from 'js-yaml';\nimport YAML from 'yaml';\ndeclare function run(x: unknown): void;\nclass Base { static deserialize(ctx: unknown): unknown { return ctx; } }\nclass Codec extends Base {\n  static deserialize(ctx: unknown) { return super.deserialize(ctx); }\n}\nexport function handler(req: any, res: any) {\n  const out = ${call};\n  res.json(out);\n}\n`;
  },
};
