const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

const USE = {
  Statement: (c) => [`${c};`],
  VarInit: (c) => [`const instance = ${c};`],
  Assign: (c) => ['let instance: any;', `instance = ${c};`],
  Return: (c) => ['function mount() {', `  return ${c};`, '}'],
  Argument: (c) => [`track(${c});`],
};

module.exports = {
  rule: 'no-render-return-value',
  domain: 9 * 5,
  traces: 600,
  filename: FILE,
  key: keyOf('spelling', 'use'),
  code: (s) => {
    const sp = tag(s.spelling);
    let pre;
    let ref;
    if (sp === 'Umd') ({ pre, ref } = { pre: [], ref: 'ReactDOM.render' });
    else if (sp === 'LocalObject')
      ({ pre, ref } = {
        pre: ['const ReactDOM = { render: (...a: any[]) => a };'],
        ref: 'ReactDOM.render',
      });
    else ({ pre, ref } = api(sp, 'render', 'react-dom'));
    return src(
      pre,
      'declare function track(x: unknown): void;',
      'const App = () => null;',
      "const el = document.getElementById('root');",
      USE[tag(s.use)](`${ref}(<App />, el)`),
    );
  },
};
