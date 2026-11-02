const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 56,
  traces: 500,
  rule: 'no-disabled-template-escaping',
  key: (s) => `${tag(s.target)}|${tag(s.value)}|${tag(s.op)}`,
  config: () => undefined,
  code: (s) => {
    const lhs = {
      Dot: 'view.escapeMarkup',
      BracketStr: "view['escapeMarkup']",
      BracketTpl: 'view[`escapeMarkup`]',
      BracketVar: 'view[escapeMarkup]',
      BareVar: 'escapeMarkup',
      ThisChain: 'this.options.escapeMarkup',
      OtherProp: 'view.escapeHtml',
    }[tag(s.target)];
    const v = {
      FalseLit: 'false',
      TrueLit: 'true',
      StrFalse: "'false'",
      Zero: '0',
    }[tag(s.value)];
    const stmt =
      tag(s.op) === 'Assign'
        ? `${lhs} = ${v};`
        : `if (${lhs} === ${v}) this.flag = 1;`;
    return `declare const view: any;\nlet escapeMarkup: any = 'escapeMarkup';\nexport class Renderer {\n  options: any = {};\n  flag = 0;\n  configure() {\n    ${stmt}\n  }\n}\nexport { escapeMarkup };\n`;
  },
};
