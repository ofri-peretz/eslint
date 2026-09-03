/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which values are "stable" is decided by resolving the binding, not by its name.
 *
 * The previous implementation matched three patterns — `/^set[A-Z]/`,
 * `/dispatch/i`, `/Ref$/` — which is the defect class CLAUDE.md puts first, and
 * it failed in BOTH directions:
 *
 *   - real `useRef` bindings whose names did not fit were required as
 *     dependencies (`savedCallback`, `nextJwtToken`, `frame`, `timeout` — five
 *     findings across the pinned corpus);
 *   - reactive values whose names happened to fit were silently exempted, so a
 *     genuinely missing dependency named `setUpValue` or `dispatchTime` was
 *     dropped without a word. That is a stale closure that ships.
 *
 * Every expectation here is cross-checked against React's own
 * `react-hooks/exhaustive-deps`, which is the authority for this rule. The
 * recall cases are the ones that matter — the FP direction merely annoys.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { hooksExhaustiveDeps } from './hooks-exhaustive-deps';

const count = (code: string): number =>
  new Linter({ configType: 'flat' })
    .verify(
      code,
      [
        {
          files: ['**/*.tsx'],
          languageOptions: {
            parser: tsParser as never,
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: {
            r: {
              rules: { 'hooks-exhaustive-deps': hooksExhaustiveDeps as never },
            },
          },
          rules: { 'r/hooks-exhaustive-deps': 'error' },
        },
      ],
      'subject.tsx',
    )
    .filter((m) => m.ruleId === 'r/hooks-exhaustive-deps').length;

describe('RECALL — a reactive value is never exempted for its name', () => {
  it('reports a prop named setUpValue', () => {
    // Matched /^set[A-Z]/ and was silently dropped.
    expect(
      count(
        'function C({setUpValue}){React.useEffect(()=>{fetch(setUpValue)},[]);return null}',
      ),
    ).toBe(1);
  });

  it('reports a prop named dispatchTime', () => {
    // Matched /dispatch/i and was silently dropped.
    expect(
      count(
        'function C({dispatchTime}){React.useEffect(()=>{fetch(dispatchTime)},[]);return null}',
      ),
    ).toBe(1);
  });

  it('reports an ordinary missing dependency', () => {
    expect(
      count(
        'function C({id}){React.useEffect(()=>{fetch(id)},[]);return null}',
      ),
    ).toBe(1);
  });

  it('reports the VALUE from useState, which is reactive', () => {
    // Only the setter is stable. Position in the pattern decides, not the call.
    expect(
      count(
        'function C(){const [n,setN]=React.useState(0);React.useEffect(()=>{console.log(n)},[]);return null}',
      ),
    ).toBe(1);
  });
});

describe('genuinely stable values are not required as dependencies', () => {
  it('a useRef binding named ref', () => {
    expect(
      count(
        'function C(){const ref=React.useRef(null);React.useEffect(()=>{ref.current=1},[]);return null}',
      ),
    ).toBe(0);
  });

  it('a useRef binding whose name does not end in Ref', () => {
    // The corpus case: `savedCallback` is a ref, and React reports nothing.
    expect(
      count(
        'function C(){const savedCallback=React.useRef(null);React.useEffect(()=>{savedCallback.current()},[]);return null}',
      ),
    ).toBe(0);
  });

  it('a useState setter', () => {
    expect(
      count(
        'function C(){const [n,setN]=React.useState(0);React.useEffect(()=>{setN(1)},[]);return null}',
      ),
    ).toBe(0);
  });

  it('a useReducer dispatch', () => {
    expect(
      count(
        'function C(){const [s,dispatch]=React.useReducer(r,0);React.useEffect(()=>{dispatch({})},[]);return null}',
      ),
    ).toBe(0);
  });

  it('a setter named without the set prefix', () => {
    // The mirror of the recall cases: stability comes from the binding, so an
    // unconventionally named setter is still stable.
    expect(
      count(
        'function C(){const [n,update]=React.useState(0);React.useEffect(()=>{update(1)},[]);return null}',
      ),
    ).toBe(0);
  });
});

describe('shapes that are not a stable hook binding stay reactive', () => {
  it('useState assigned without destructuring', () => {
    // `const s = useState(0)` — the pair itself, not a setter. Nothing here is
    // exempt, so `s` remains a dependency.
    expect(
      count(
        'function C(){const s=useState(0);React.useEffect(()=>{console.log(s)},[]);return null}',
      ),
    ).toBe(1);
  });

  it('an ordinary function call, not a hook', () => {
    expect(
      count(
        'function C(){const v=compute();React.useEffect(()=>{console.log(v)},[]);return null}',
      ),
    ).toBe(1);
  });

  it('a bare useRef call, not namespaced', () => {
    // The callee is an Identifier here and a MemberExpression in the React.*
    // cases above; both resolve to the same hook.
    expect(
      count(
        'function C(){const r=useRef(null);React.useEffect(()=>{r.current=1},[]);return null}',
      ),
    ).toBe(0);
  });
});

describe('values from outside the component are not reactive', () => {
  /**
   * React's rule reports none of these: their identity is fixed for the
   * lifetime of the module, so a re-render cannot change them.
   *
   * The module-scope IMPORT case was a pre-existing false positive — the old
   * name heuristic did not exempt `api` either, it simply never came up in a
   * test. Removing the heuristic is what surfaced it.
   */
  it('an undeclared global', () => {
    expect(count('useEffect(() => { setCount(1); }, []);')).toBe(0);
  });

  it('a module-scope import', () => {
    expect(
      count(
        'import {api} from "./x";\nfunction C(){React.useEffect(()=>{api()},[]);return null}',
      ),
    ).toBe(0);
  });

  it('a module-scope constant', () => {
    expect(
      count(
        'const K=1;\nfunction C(){React.useEffect(()=>{console.log(K)},[]);return null}',
      ),
    ).toBe(0);
  });
});

describe('an unreadable hook name is treated as reactive, not as stable', () => {
  /*
   * The PRINCIPLE — unknown resolves toward REPORTING, because assuming
   * stability silently drops a real dependency and a false positive is the
   * cheaper mistake — is unchanged. What changed is which callees count as
   * unknown.
   *
   * `React['useRef']` used to be one of them, on the reasoning that "the
   * callee's property is not an Identifier, so the hook name cannot be read".
   * It can: it is a static string, and it names exactly the same hook as
   * `React.useRef`. Treating it as unreadable reported a dependency that a
   * stable ref never needed — a false positive produced by a spelling.
   */
  it('a computed member callee with a STATIC key is read, and is stable', () => {
    expect(
      count(
        "function C(){const r=React['useRef'](null);React.useEffect(()=>{use(r)},[]);return null}",
      ),
    ).toBe(0);
  });

  it('a template-literal key is read too', () => {
    expect(
      count(
        'function C(){const r=React[`useRef`](null);React.useEffect(()=>{use(r)},[]);return null}',
      ),
    ).toBe(0);
  });

  it('a callee that is neither an identifier nor a member stays a dependency', () => {
    // `getHook()(null)` — a factory. Before propertyName, this branch was
    // reached by `React['useRef']`, because a member with a non-Identifier
    // property fell all the way through. Now that such a member IS read, the
    // only thing left here is a callee of some other shape entirely, and it
    // has to keep resolving toward reporting.
    expect(
      count(
        'function C(){const r=getHook()(null);React.useEffect(()=>{use(r)},[]);return null}',
      ),
    ).toBe(1);
  });

  it('a genuinely dynamic key stays a dependency', () => {
    // `React[k]` — nothing static to read, so this is the case the principle
    // above is actually about, and it must keep reporting.
    expect(
      count(
        'function C(){const k="useRef";const r=React[k](null);React.useEffect(()=>{use(r)},[]);return null}',
      ),
    ).toBe(1);
  });
});
