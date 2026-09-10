/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * This rule could not report. It shipped that way, under two export names.
 *
 * `checkStaticPropertyPlacement` asked `!areInSameGroup(current, previous)` and
 * then did nothing with the answer — an empty `if` left behind when a report was
 * deleted alongside a genuinely unreachable branch next to it. 21 `valid` cases
 * passed, and none of them could have failed: a rule with no `context.report`
 * satisfies every `valid` case ever written for it.
 *
 * The ledger caught it as `rules that claim no defect at all` — zero TP and zero
 * FN cases. That is the shape of a rule nobody has proven does anything.
 *
 * The question it asked was also the wrong one. Two ADJACENT properties from
 * different groups is what correct grouping looks like; the defect is a group
 * RESUMING after another group came between.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { staticPropertyPlacement } from '../../rules/react/static-property-placement';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('static-property-placement — it reports', () => {
  ruleTester.run('a group broken by another group', staticPropertyPlacement, {
    valid: [
      {
        name: 'one group, contiguous',
        code: 'class A extends Component { static propTypes = {}; static defaultProps = {}; render() { return null; } }',
      },
      {
        name: 'two groups, each contiguous — adjacency across groups is correct, not a defect',
        code: 'class A extends Component { static propTypes = {}; static defaultProps = {}; static getDerivedStateFromProps() {} render() { return null; } }',
      },
      {
        name: 'a member of no known group between two members of one — unprovable, so not reported',
        code: 'class A extends Component { static propTypes = {}; static unrelated = 1; static defaultProps = {}; render() { return null; } }',
      },
      {
        name: 'a computed key is not the property it spells',
        code: 'class A extends Component { static propTypes = {}; static [defaultProps] = {}; static contextType = {}; render() { return null; } }',
      },
      {
        name: 'not a React component at all',
        code: 'class A { static propTypes = {}; static getDerivedStateFromProps() {} static defaultProps = {}; }',
      },
    ],
    invalid: [
      {
        name: 'propTypes group resumes after the lifecycle group',
        code: 'class A extends Component { static propTypes = {}; static getDerivedStateFromProps() {} static defaultProps = {}; render() { return null; } }',
        errors: [{ messageId: 'staticPropertyPlacement' as const }],
      },
      {
        name: 'the same, on React.Component',
        code: 'class A extends React.Component { static contextType = {}; static getDerivedStateFromError() {} static propTypes = {}; render() { return null; } }',
        errors: [{ messageId: 'staticPropertyPlacement' as const }],
      },
      {
        name: 'the same, on PureComponent',
        code: 'class A extends PureComponent { static propTypes = {}; static getDerivedStateFromProps() {} static childContextTypes = {}; render() { return null; } }',
        errors: [{ messageId: 'staticPropertyPlacement' as const }],
      },
      {
        name: 'a group interrupted twice reports each resumption',
        code: 'class A extends Component { static propTypes = {}; static getDerivedStateFromProps() {} static defaultProps = {}; static getDerivedStateFromError() {} static contextType = {}; render() { return null; } }',
        errors: [
          { messageId: 'staticPropertyPlacement' as const },
          { messageId: 'staticPropertyPlacement' as const },
          { messageId: 'staticPropertyPlacement' as const },
        ],
      },
    ],
  });
});
