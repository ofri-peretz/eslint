/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-1 coverage tests (real parser via RuleTester) for branch gaps in:
 * jsx-no-script-url, jsx-no-target-blank, react-class-to-hooks,
 * static-property-placement, no-unnecessary-rerenders.
 * Each case targets a specific previously-uncovered branch.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxNoScriptUrl } from '../../rules/react/jsx-no-script-url';
import { jsxNoTargetBlank } from '../../rules/react/jsx-no-target-blank';
import { reactClassToHooks } from '../../rules/migration/react-class-to-hooks';
import { staticPropertyPlacement } from '../../rules/react/static-property-placement';
import { noUnnecessaryRerenders } from '../../rules/performance/no-unnecessary-rerenders';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('jsx-no-script-url coverage gaps', () => {
  ruleTester.run('jsx-no-script-url', jsxNoScriptUrl, {
    valid: [
      { name: 'namespaced attribute name is skipped', code: 'const a = <a xlink:href="javascript:void(0)" />;' },
      { name: 'url prop without value', code: 'const a = <a href />;' },
      { name: 'expression href with safe string', code: "const a = <a href={'https://safe.example'} />;" },
      { name: 'template href with safe prefix', code: 'const a = <a href={`https://${host}`} />;' },
      { name: 'identifier href expression', code: 'const a = <a href={url} />;' },
      { name: 'namespaced element name is skipped', code: 'const a = <svg:a href="javascript:void(0)" />;' },
      { name: 'spread attributes are skipped', code: 'const a = <a {...rest} />;' },
      { name: 'custom component prop not configured', code: 'const a = <Btn to="javascript:void(0)" />;' },
    ],
    invalid: [
      {
        name: 'expression href with javascript url',
        code: "const a = <a href={'javascript:alert(1)'} />;",
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        name: 'template href starting with javascript:',
        code: 'const a = <a href={`javascript:${code}`} />;',
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        name: 'member expression element with javascript href',
        code: 'const a = <Foo.Bar href="javascript:evil()" />;',
        errors: [{ messageId: 'noScriptUrl' }],
      },
      {
        name: 'configured custom component prop',
        code: 'const a = <Btn to="javascript:evil()" />;',
        options: [[{ name: 'Btn', props: ['to'] }], {}],
        errors: [{ messageId: 'noScriptUrl' }],
      },
    ],
  });
});

describe('jsx-no-target-blank coverage gaps', () => {
  ruleTester.run('jsx-no-target-blank', jsxNoTargetBlank, {
    valid: [
      { name: 'links disabled', code: 'const a = <a target="_blank" href="https://x.example" />;', options: [{ links: false }] },
      { name: 'dynamic target with enforceDynamicLinks never', code: 'const a = <a target={blank} href="https://x.example" />;', options: [{ enforceDynamicLinks: 'never' }] },
      { name: 'dynamic href with enforceDynamicLinks never', code: 'const a = <a target="_blank" href={url} />;', options: [{ enforceDynamicLinks: 'never' }] },
      { name: 'href attribute without value', code: 'const a = <a target="_blank" href />;' },
      { name: 'member expression element is ignored', code: 'const a = <Foo.Bar target="_blank" href="https://x.example" />;' },
      { name: 'spread attributes skipped by default', code: 'const a = <a {...rest} target="_blank" href="https://x.example" />;' },
      { name: 'form without forms option', code: 'const a = <form target="_blank" />;' },
      { name: 'noopener rel is sufficient', code: 'const a = <a target="_blank" href="https://x.example" rel="noopener" />;' },
    ],
    invalid: [
      {
        name: 'form with forms option enabled',
        code: 'const a = <form target="_blank" />;',
        options: [{ forms: true }],
        output: 'const a = <form target="_blank" rel="noopener noreferrer" />;',
        errors: [{ messageId: 'noTargetBlank' }],
      },
      {
        name: 'dynamic target reported with default enforceDynamicLinks',
        code: 'const a = <a target={blank} href="https://x.example" />;',
        output: 'const a = <a target={blank} href="https://x.example" rel="noopener noreferrer" />;',
        errors: [{ messageId: 'noTargetBlank' }],
      },
      {
        name: 'dynamic href reported with default enforceDynamicLinks',
        code: 'const a = <a target="_blank" href={url} />;',
        output: 'const a = <a target="_blank" href={url} rel="noopener noreferrer" />;',
        errors: [{ messageId: 'noTargetBlank' }],
      },
      {
        name: 'spread attributes with warnOnSpreadAttributes',
        code: 'const a = <a {...rest} target="_blank" href="https://x.example" />;',
        options: [{ warnOnSpreadAttributes: true }],
        output: 'const a = <a {...rest} target="_blank" href="https://x.example" rel="noopener noreferrer" />;',
        errors: [{ messageId: 'noTargetBlank' }],
      },
      {
        name: 'valueless rel attribute cannot be fixed',
        code: 'const a = <a target="_blank" href="https://x.example" rel />;',
        output: null,
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        name: 'dynamic rel attribute cannot be fixed',
        code: 'const a = <a target="_blank" href="https://x.example" rel={dynamicRel} />;',
        output: null,
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        name: 'existing rel literal extended with allowReferrer',
        code: 'const a = <a target="_blank" href="https://x.example" rel="external" />;',
        options: [{ allowReferrer: true }],
        output: 'const a = <a target="_blank" href="https://x.example" rel="external noopener" />;',
        errors: [{ messageId: 'noRelWithoutNoopener' }],
      },
      {
        name: 'missing rel added as noopener with allowReferrer',
        code: 'const a = <a target="_blank" href="https://x.example" />;',
        options: [{ allowReferrer: true }],
        output: 'const a = <a target="_blank" href="https://x.example" rel="noopener" />;',
        errors: [{ messageId: 'noTargetBlank' }],
      },
      {
        name: 'protocol-relative href is external',
        code: 'const a = <a target="_blank" href="//cdn.example/x" />;',
        output: 'const a = <a target="_blank" href="//cdn.example/x" rel="noopener noreferrer" />;',
        errors: [{ messageId: 'noTargetBlank' }],
      },
    ],
  });
});

describe('react-class-to-hooks coverage gaps', () => {
  ruleTester.run('react-class-to-hooks', reactClassToHooks, {
    valid: [
      { name: 'class extends call expression', code: 'class A extends mixin() { render() { return null; } }' },
      { name: 'class extends non-React member', code: 'class A extends Foo.Component { render() { return null; } }' },
      { name: 'anonymous default export class', code: 'export default class extends Component { render() { return null; } }' },
      {
        name: 'complex lifecycle skipped when allowed',
        code: 'class A extends Component { static getDerivedStateFromProps() { return null; } render() { return null; } }',
        options: [{ allowComplexLifecycle: true }],
      },
    ],
    invalid: [
      {
        name: 'React.PureComponent class is flagged',
        code: 'class A extends React.PureComponent { render() { return null; } }',
        errors: [{ messageId: 'migrateToHooks' }],
      },
      {
        name: 'three lifecycle methods marks medium complexity',
        code: 'class A extends Component { componentDidMount() {} componentDidUpdate() {} componentWillUnmount() {} render() { return null; } }',
        errors: [{ messageId: 'migrateToHooks', data: { componentName: 'A', complexity: 'medium' } }],
      },
      {
        name: 'simple component suggestion rewrites this.state and this.props',
        // Class-property arrow keeps the rewritten output parseable
        // (method shorthand would not survive the naive text transform).
        code: 'class Simple extends Component { handle = () => this.state.count + this.props.step; }',
        errors: [
          {
            messageId: 'migrateToHooks',
            suggestions: [
              {
                messageId: 'convertToFunction',
                output: 'function Simple(props) { handle = () => count + props.step; }',
              },
            ],
          },
        ],
      },
    ],
  });
});

describe('static-property-placement coverage gaps', () => {
  ruleTester.run('static-property-placement', staticPropertyPlacement, {
    valid: [
      {
        name: 'adjacent named statics from different groups',
        code: 'class A extends Component { static propTypes = {}; static getDerivedStateFromProps() {} render() { return null; } }',
      },
      {
        name: 'computed static key has no name',
        code: 'class A extends Component { static propTypes = {}; static [dynamicKey] = 1; static defaultProps = {}; render() { return null; } }',
      },
      {
        name: 'single named static returns early',
        code: 'class A extends Component { static propTypes = {}; render() { return null; } }',
      },
    ],
    invalid: [],
  });
});

describe('no-unnecessary-rerenders coverage gaps', () => {
  ruleTester.run('no-unnecessary-rerenders', noUnnecessaryRerenders, {
    valid: [
      { name: 'attribute without value', code: 'function App() { return <div hidden />; }' },
      { name: 'string attribute value', code: 'function App() { return <div id="a" />; }' },
      {
        name: 'test file skipped by default',
        code: 'function App() { return <div handler={() => {}} />; }',
        filename: 'component.test.tsx',
      },
      { name: 'small object below minSize', code: 'function App() { return <div opts={{ a: 1 }} />; }' },
      { name: 'small sparse array below minSize', code: 'function App() { return <div opts={[1, , 2]} />; }' },
    ],
    invalid: [
      {
        name: 'big object literal in JSX prop',
        code: 'function App() { return <div opts={{ a: 1, b: 2, c: 3, d: 4, e: 5 }} />; }',
        errors: [{ messageId: 'unnecessaryRerender' }],
      },
      {
        name: 'big array literal in JSX prop',
        code: 'function App() { return <div opts={[1, 2, 3, 4, 5]} />; }',
        errors: [{ messageId: 'unnecessaryRerender' }],
      },
      {
        name: 'arrow function prop reports useCallback suggestion',
        code: 'function App() { return <div onClick={() => {}} />; }',
        errors: [{ messageId: 'unnecessaryRerender' }],
      },
      {
        name: 'function expression prop in test file with ignoreInTests false',
        code: 'function App() { return <div onClick={function () {}} />; }',
        options: [{ ignoreInTests: false }],
        filename: 'component.test.tsx',
        errors: [{ messageId: 'unnecessaryRerender' }],
      },
      {
        name: 'small object with minSize 1',
        code: 'function App() { return <div opts={{ a: 1 }} />; }',
        options: [{ minSize: 1 }],
        errors: [{ messageId: 'unnecessaryRerender' }],
      },
    ],
  });
});
