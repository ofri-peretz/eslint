/**
 * Shared React spellings for the react-features models
 * (`models/react-features/`). JSX spellings live in `jsx.cjs`.
 *
 * Every input is a real module in a `.tsx` file, so `@typescript-eslint/parser`
 * parses JSX. The point of these helpers is the many ways real code names the
 * same React API, which a rule must resolve by binding rather than by name.
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */

/** The file every react-features model lints: `.tsx` turns on JSX parsing. */
const FILE = 'src/App.tsx';

/**
 * How a module names one React export `name` (from `react` unless `module` is
 * given). Each spelling returns `{ pre, ref }`: the import lines and the
 * expression the code uses for the export.
 *
 *   - `Named`     `import { useEffect } from 'react'`            `useEffect`
 *   - `Renamed`   `import { useEffect as useFx } from 'react'`   `useFx`
 *   - `Default`   `import React from 'react'`                    `React.useEffect`
 *   - `Namespace` `import * as R from 'react'`                   `R.useEffect`
 *   - `Computed`  `import React from 'react'`                    `React['useEffect']`
 *   - `Require`   `const React = require('react')`               `React.useEffect`
 *   - `Shadowed`  a local function with the same name: NOT React's
 *   - `Foreign`   the same name imported from another module: NOT React's
 */
const GLOBAL = { react: 'React', 'react-dom': 'ReactDOM' };
function api(spelling, name, module = 'react') {
  const ns = GLOBAL[module] ?? 'React';
  const alias = `${name}Alias`;
  switch (spelling) {
    case 'Named':
      return { pre: [`import { ${name} } from '${module}';`], ref: name };
    case 'Renamed':
      return {
        pre: [`import { ${name} as ${alias} } from '${module}';`],
        ref: alias,
      };
    case 'Default':
      return { pre: [`import ${ns} from '${module}';`], ref: `${ns}.${name}` };
    case 'Namespace':
      return { pre: [`import * as R from '${module}';`], ref: `R.${name}` };
    case 'Computed':
      return {
        pre: [`import ${ns} from '${module}';`],
        ref: `${ns}['${name}']`,
      };
    case 'Require':
      return {
        pre: [`const ${ns} = require('${module}');`],
        ref: `${ns}.${name}`,
      };
    case 'Shadowed':
      return {
        pre: [`function ${name}(...args: any[]): any { return args; }`],
        ref: name,
      };
    case 'Foreign':
      return { pre: [`import { ${name} } from './local';`], ref: name };
    default:
      throw new Error(`unknown spelling ${spelling}`);
  }
}

/** Spellings that name React's export. */
const REACT_SPELLINGS = [
  'Named',
  'Renamed',
  'Default',
  'Namespace',
  'Computed',
  'Require',
];

/** Join source lines into a file that ends with a newline. */
const src = (...lines) => [...lines.flat(), ''].join('\n');

/** Indent every non-empty line of `text` by `n` spaces. */
const indent = (text, n) =>
  text
    .split('\n')
    .map((l) => (l ? ' '.repeat(n) + l : l))
    .join('\n');

/**
 * Who receives a JSX prop: the element the inputs write it on, and the
 * module-level lines that define it. `memo` receivers compare props by
 * identity (React's `memo`, a `PureComponent` class); `plain` ones re-render
 * with their parent regardless; `dom` is a host element.
 */
const RECEIVER = {
  Dom: { kind: 'dom', tag: 'div', pre: [] },
  CustomEl: { kind: 'dom', tag: 'my-widget', pre: [] },
  MemoNamed: {
    kind: 'memo',
    tag: 'Row',
    pre: [
      "import { memo } from 'react';",
      'const Row = memo(function Row(p: any) { return <i>{p.x}</i>; });',
    ],
  },
  MemoDefault: {
    kind: 'memo',
    tag: 'Row',
    pre: [
      "import React from 'react';",
      'const Row = React.memo((p: any) => <i>{p.x}</i>);',
    ],
  },
  MemoRenamed: {
    kind: 'memo',
    tag: 'Row',
    pre: [
      "import { memo as pure } from 'react';",
      'const Row = pure((p: any) => <i>{p.x}</i>);',
    ],
  },
  MemoForwardRef: {
    kind: 'memo',
    tag: 'Row',
    pre: [
      "import * as R from 'react';",
      'const Row = R.memo(R.forwardRef((p: any, ref: any) => <i ref={ref}>{p.x}</i>));',
    ],
  },
  PureClass: {
    kind: 'memo',
    tag: 'Row',
    pre: [
      "import { PureComponent } from 'react';",
      'class Row extends PureComponent<any> { render() { return <i>{this.props.x}</i>; } }',
    ],
  },
  PlainFn: {
    kind: 'plain',
    tag: 'Row',
    pre: ['function Row(p: any) { return <i>{p.x}</i>; }'],
  },
  PlainArrow: {
    kind: 'plain',
    tag: 'Row',
    pre: ['const Row = (p: any) => <i>{p.x}</i>;'],
  },
  ForwardRef: {
    kind: 'plain',
    tag: 'Row',
    pre: [
      "import { forwardRef } from 'react';",
      'const Row = forwardRef((p: any, ref: any) => <i ref={ref}>{p.x}</i>);',
    ],
  },
  PlainClass: {
    kind: 'plain',
    tag: 'Row',
    pre: [
      "import { Component } from 'react';",
      'class Row extends Component<any> { render() { return <i>{this.props.x}</i>; } }',
    ],
  },
};

module.exports = { FILE, api, REACT_SPELLINGS, RECEIVER, src, indent };
