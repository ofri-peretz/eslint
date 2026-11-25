const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const ELEM = {
  ElemNoKey: '<li>{item.name}</li>',
  ElemKey: '<li key={item.id}>{item.name}</li>',
  FragShort: '<>{item.name}</>',
  FragmentNoKey: '<Fragment>{item.name}</Fragment>',
  FragmentKey: '<Fragment key={item.id}>{item.name}</Fragment>',
  CreateNoKey: "React.createElement('li', null, item.name)",
  CreateKey: "React.createElement('li', { key: item.id }, item.name)",
};
const KEY = {
  IndexParam: ['(item: any, i: number)', 'i', ''],
  IndexRenamed: ['(item: any, n: number)', 'n', ''],
  NamedIndexNotParam: ['(item: any)', 'index', 'const index = item.id; '],
  Id: ['(item: any, i: number)', 'item.id', ''],
  TemplateIndex: ['(item: any, i: number)', '`row-${i}`', ''],
};

function callback(form, elem) {
  const e = form === 'Cond' ? `item.ok ? ${elem} : null` : elem;
  switch (form) {
    case 'Block':
      return `(item: any) => { return ${e}; }`;
    case 'FnExpr':
      return `function (item: any) { return ${e}; }`;
    case 'Bound':
      // The element is bound, not returned: the returned wrapper is keyed.
      return `(item: any) => { const el = ${elem}; return <li key={item.id}>{el}</li>; }`;
    default:
      return `(item: any) => ${e}`;
  }
}

function iterate(iter, cb) {
  switch (iter) {
    case 'MapComputed':
      return `items['map'](${cb})`;
    case 'FlatMap':
      return `items.flatMap(${cb})`;
    case 'ArrayFrom':
      return `Array.from(items, ${cb})`;
    case 'ChildrenMap':
      return `Children.map(children, ${cb})`;
    case 'ReactChildrenMap':
      return `React.Children.map(children, ${cb})`;
    default:
      return `items.map(${cb})`; // ArrMap
  }
}

module.exports = {
  rule: 'jsx-key',
  // Missing: 6 iterators x 5 forms x 7 elements x 2 options; Unstable: 5 keys x 2 options.
  domain: 6 * 5 * 7 * 2 + 5 * 2,
  traces: 6000,
  filename: FILE,
  key: keyOf('focus', 'iter', 'form', 'elem', 'keyExpr', 'opt'),
  config: (s) => {
    const opt = tag(s.opt);
    if (opt === 'CheckFragments') return { checkFragmentShorthand: true };
    if (opt === 'WarnUnstable') return { warnUnstableKeys: true };
    return undefined;
  },
  code: (s) => {
    let list;
    if (tag(s.focus) === 'Missing') {
      list = iterate(tag(s.iter), callback(tag(s.form), ELEM[tag(s.elem)]));
    } else {
      const [params, key, stmt] = KEY[tag(s.keyExpr)];
      list = `items.map(${params} => { ${stmt}return <li key={${key}}>{item.name}</li>; })`;
    }
    return src(
      "import React, { Children, Fragment } from 'react';",
      'export function App({ items, children }: any) {',
      `  return <ul>{${list}}</ul>;`,
      '}',
    );
  },
};
