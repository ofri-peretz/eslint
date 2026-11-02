const { tag } = require('../../lib.cjs');

// [prefix, suffix] around the single dynamic value.
const PARTS = {
  OpQuery: ['\nquery {\n  user(id: "', '") {\n    name\n  }\n}\n'],
  OpMutation: ['\nmutation {\n  deleteUser(id: "', '") {\n    id\n  }\n}\n'],
  Selection: ['{ user(id: "', '") { name email } }'],
  Introspection: ['{ __schema { types(filter: "', '") { name } } }'],
  ProseType: ['Invalid type ', ' supplied to the parser'],
  MidSentence: ['Please specify the query ', ' or a mutation name'],
  NestedMsg: ['resolve.fallback: { "', '": require.resolve("x") }'],
};

module.exports = {
  domain: 42,
  traces: 400,
  rule: 'no-graphql-injection',
  key: (s) => `${tag(s.shape)}|${tag(s.build)}|allowIntro=${s.allowIntro}`,
  config: (s) => ({ allowIntrospection: s.allowIntro }),
  code: (s) => {
    const [a, b] = PARTS[tag(s.shape)];
    const expr = {
      Template: '`' + a + '${userId}' + b + '`',
      Concat: `${JSON.stringify(a)} + userId + ${JSON.stringify(b)}`,
      Static: '`' + a + '42' + b + '`',
    }[tag(s.build)];
    return `declare const userId: string;\nexport const doc = ${expr};\n`;
  },
};
