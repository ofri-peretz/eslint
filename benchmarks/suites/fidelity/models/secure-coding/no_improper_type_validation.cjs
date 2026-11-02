const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 32,
  traces: 300,
  rule: 'no-improper-type-validation',
  key: (s) =>
    `${tag(s.kind)}|sameRealm=${s.allowSameRealm}|loose=${s.checkLoose}`,
  config: (s) => ({
    allowInstanceofSameRealm: s.allowSameRealm,
    checkLooseEquality: s.checkLoose,
  }),
  code: (s) => {
    const cond = {
      TypeofObjNoNull: "typeof userInput === 'object'",
      TypeofObjNullChecked:
        "userInput !== null && typeof userInput === 'object'",
      TypeofString: "typeof userInput === 'string'",
      InstanceofArray: 'userInput instanceof Array',
      InstanceofClass: 'userInput instanceof Widget',
      ArrayIsArray: 'Array.isArray(userInput)',
      LooseEqTrue: 'userInput == true',
      StrictEqTrue: 'userInput === true',
    }[tag(s.kind)];
    return `class Widget {}\nexport function process(userInput: any) {\n  if (${cond}) {\n    return userInput.id;\n  }\n  return null;\n}\n`;
  },
};
