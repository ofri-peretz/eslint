const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

const HOOK = {
  UseEffect: 'useEffect',
  UseLayoutEffect: 'useLayoutEffect',
  UseCallback: 'useCallback',
  UseMemo: 'useMemo',
  UseImperativeHandle: 'useImperativeHandle',
};

// [expression the callback reads, deps argument]; deps null = no argument.
const CASE = {
  PropMissing: ['value', '[]'],
  PropListed: ['value', '[value]'],
  StateMissing: ['count', '[]'],
  SetterMissing: ['setCount', '[]'],
  SetterRenamedMissing: ['setOther', '[]'],
  RefMissing: ['box', '[]'],
  ModuleConstMissing: ['LIMIT', '[]'],
  UpperLocalMissing: ['Upper', '[]'],
  ParamUsed: ['PARAM', '[]'],
  ExtraUnused: ['LIMIT', '[value]'],
  ExtraConst: ['value', '[value, LIMIT]'],
  NonArray: ['value', 'deps'],
  NoDeps: ['value', null],
  MemberDepListed: ['props.label', '[props.label]'],
};

function call(hook, ref, read, deps) {
  const d = deps === null ? '' : `, ${deps}`;
  const param = read === 'PARAM' ? 'event: any' : '';
  const x = read === 'PARAM' ? 'event' : read;
  switch (hook) {
    case 'UseCallback':
      return `const cb = ${ref}((${param}) => ${x}${d});`;
    case 'UseMemo':
      return `const memo = ${ref}(() => ${x}${d});`;
    case 'UseImperativeHandle':
      return `${ref}(handleRef, () => ({ v: ${x} })${d});`;
    default:
      return `${ref}((${param}) => { void ${x}; }${d});`;
  }
}

module.exports = {
  rule: 'hooks-exhaustive-deps',
  // Spellings: 5 hooks x 7 spellings x 2 cases; Deps: 3 hooks x 14 cases;
  // Option: 2 hooks x 3 option values x 2 cases.
  domain: 70 + 42 + 12,
  traces: 1500,
  filename: FILE,
  key: keyOf('focus', 'hook', 'spelling', 'depCase', 'opt'),
  config: (s) =>
    ({
      OptDefault: undefined,
      OptSet: { additionalHooks: '^useCustomEffect$' },
      OptDangerous: { enableDangerousAutofixThisMayCauseInfiniteLoops: true },
    })[tag(s.opt)],
  code: (s) => {
    const hook = tag(s.hook);
    const [read, deps] = CASE[tag(s.depCase)];
    const { pre, ref } =
      hook === 'Custom'
        ? {
            pre: ["import { useCustomEffect } from './hooks';"],
            ref: 'useCustomEffect',
          }
        : api(tag(s.spelling), HOOK[hook]);
    return src(
      pre,
      "import { useState, useRef, useState as useS } from 'react';",
      'declare const handleRef: any;',
      'declare const deps: any[];',
      'const LIMIT = 10;',
      'export function App(props: any) {',
      '  const { value } = props;',
      '  const [count, setCount] = useState(0);',
      '  const [other, setOther] = useS(0);',
      '  const box = useRef(null);',
      '  const Upper = props.as;',
      `  ${call(hook, ref, read, deps)}`,
      '  return <div>{count}{other}</div>;',
      '}',
    );
  },
};
