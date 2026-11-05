const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const VALUE = {
  Plain: '"javascript:void(0)"',
  Upper: '"JavaScript:void(0)"',
  Tab: "{'java\\tscript:void(0)'}",
  Braced: "{'javascript:void(0)'}",
  Template: '{`javascript:void(0)`}',
  TemplatePlaceholder: '{`javascript:${value}`}',
  CondSame: "{flag ? 'javascript:void(0)' : 'javascript:void(0)'}",
  CondOne: "{flag ? 'javascript:void(0)' : '/home'}",
  Safe: '"/home"',
  Dynamic: '{value}',
};
const ELEM = {
  Href: ['a', 'href'],
  Src: ['iframe', 'src'],
  Action: ['form', 'action'],
  FormAction: ['button', 'formAction'],
  XlinkHref: ['use', 'xlink:href'],
  Title: ['a', 'title'],
  To: ['Link', 'to'],
};

module.exports = {
  rule: 'jsx-no-script-url',
  // Values: 10; Props: 6 props x 2 values; Config: 2 configs x 2 values.
  domain: 10 + 12 + 4,
  traces: 600,
  filename: FILE,
  key: keyOf('focus', 'prop', 'value', 'cfg'),
  config: (s) =>
    tag(s.cfg) === 'Configured' ? [{ name: 'Link', props: ['to'] }] : undefined,
  code: (s) => {
    const [el, prop] = ELEM[tag(s.prop)];
    return program(`<${el} ${prop}=${VALUE[tag(s.value)]} />`, {
      pre: ["import { Link } from './router';"],
    });
  },
};
