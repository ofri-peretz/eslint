const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const PROP = {
  PropOn: ['button', 'onClick'],
  PropOnComp: ['Modal', 'onClose'],
  PropNotEvent: ['Modal', 'only'],
  PropBareOn: ['Modal', 'on'],
};
const VALUE = {
  HandleName: 'handleClick',
  OnName: 'onSelect',
  Other: 'clickHandler',
  Undefined: 'undefined',
  Member: 'actions.clickHandler',
  Inline: '() => clickHandler()',
  Call: 'makeHandler()',
};

module.exports = {
  rule: 'jsx-handler-names',
  domain: 4 * 7,
  traces: 300,
  filename: FILE,
  key: keyOf('prop', 'value'),
  code: (s) => {
    const [el, prop] = PROP[tag(s.prop)];
    return src(
      "import { Modal } from './ui';",
      'declare const actions: any;',
      'declare function makeHandler(): any;',
      'export function App({ onSelect }: any) {',
      '  const handleClick = () => {};',
      '  const clickHandler = () => {};',
      `  return <${el} ${prop}={${VALUE[tag(s.value)]}} />;`,
      '}',
    );
  },
};
