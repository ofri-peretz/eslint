const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');
const { classModule } = require('../../react-b.cjs');

// [module, export, use(ref)]
const API = {
  Render: ['react-dom', 'render', (r) => `${r}(<Root />, el);`],
  Hydrate: ['react-dom', 'hydrate', (r) => `${r}(<Root />, el);`],
  Unmount: ['react-dom', 'unmountComponentAtNode', (r) => `${r}(el);`],
  FindDomNode: ['react-dom', 'findDOMNode', (r) => `${r}(el);`],
  CreateClass: [
    'react',
    'createClass',
    (r) => `${r}({ render() { return null; } });`,
  ],
  PropTypes_: ['react', 'PropTypes', (r) => `const t = ${r}.string;`],
  CreateRoot: ['react-dom/client', 'createRoot', (r) => `${r}(el);`],
  CreateElement: ['react', 'createElement', (r) => `${r}('div');`],
};
const GLOBAL = {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOM',
};
const METHOD = {
  WillMount: 'componentWillMount',
  WillReceiveProps: 'componentWillReceiveProps',
  WillUpdate: 'componentWillUpdate',
  DidMount: 'componentDidMount',
};
const BASE = {
  BNamed: 'Named',
  BRenamed: 'Renamed',
  BDefault: 'Default',
  BNamespace: 'Namespace',
  BPure: 'Pure',
  BPlain: 'Plain',
  BForeign: 'Foreign',
};

module.exports = {
  rule: 'no-deprecated',
  // Apis: 8 x 9 spellings; Lifecycles: 4 x 7 bases x 3 forms.
  domain: 8 * 9 + 4 * 7 * 3,
  traces: 1400,
  filename: FILE,
  key: keyOf('focus', 'api', 'spelling', 'method', 'base', 'form'),
  code: (s) => {
    if (tag(s.focus) === 'Apis') {
      const [module, name, use] = API[tag(s.api)];
      const sp = tag(s.spelling);
      const g = GLOBAL[module];
      let ref;
      let pre = [];
      if (sp === 'Umd') ref = `${g}.${name}`;
      else if (sp === 'LocalObject') {
        pre = [`const ${g}: any = { ${name}: (...a: any[]) => a };`];
        ref = `${g}.${name}`;
      } else ({ pre, ref } = api(sp, name, module));
      return src(
        pre,
        'const Root = () => null;',
        "const el = document.getElementById('root');",
        use(ref),
      );
    }
    const m = METHOD[tag(s.method)];
    const member = {
      Method_: `${m}() {\n  this.load();\n}`,
      ArrowProp: `${m} = () => {\n  this.load();\n};`,
      Quoted: `'${m}'() {\n  this.load();\n}`,
    }[tag(s.form)];
    return classModule(
      BASE[tag(s.base)],
      [member, 'load() {}', 'render() {', '  return null;', '}'].join('\n'),
    );
  },
};
