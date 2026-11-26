/**
 * The option shapes eslint-config-airbnb 19.0.4 (rules/react.js) passes to six
 * rules, plus the upstream (eslint-plugin-react 7.37.5) option cases each one
 * honours. Before the schemas accepted these shapes, ESLint refused to load
 * airbnb's config at all ("should NOT have more than 0 items", "should be
 * object", "should NOT have additional properties"), and RuleTester reports
 * the same error for each case below.
 *
 * Not enforced, and so not tested as enforced:
 *   jsx-no-bind                    allowArrowFunctions, allowFunctions
 *   default-props-match-prop-types allowRequiredDefaults
 *   static-property-placement      the placement style and per-property object
 *   sort-comp                      groups
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxNoBind } from '../../rules/react/jsx-no-bind';
import { preferEs6Class } from '../../rules/react/prefer-es6-class';
import { defaultPropsMatchPropTypes } from '../../rules/react/default-props-match-prop-types';
import { stateInConstructor } from '../../rules/react/state-in-constructor';
import { staticPropertyPlacement } from '../../rules/react/static-property-placement';
import { sortComp } from '../../rules/react/sort-comp';
import { AIRBNB_OPTIONS } from './airbnb-react-options';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('airbnb option shapes', () => {
  ruleTester.run('jsx-no-bind', jsxNoBind, {
    valid: [
      {
        name: 'airbnb options: a ref callback is ignored (upstream ignoreRefs)',
        code: `<Foo ref={this._refCallback.bind(this)} />`,
        options: AIRBNB_OPTIONS['jsx-no-bind'],
      },
      {
        name: 'airbnb options: a DOM component is ignored (upstream ignoreDOMComponents)',
        code: `<div onClick={this._handleClick.bind(this)} />`,
        options: AIRBNB_OPTIONS['jsx-no-bind'],
      },
      {
        name: 'airbnb options: an arrow function is allowed',
        code: `<Foo onClick={() => this.handleClick()} />`,
        options: AIRBNB_OPTIONS['jsx-no-bind'],
      },
      {
        name: 'a namespaced tag is a DOM component',
        code: `<svg:rect onClick={this._handleClick.bind(this)} />`,
        options: AIRBNB_OPTIONS['jsx-no-bind'],
      },
      {
        name: 'allowBind lets .bind() through',
        code: `<Foo onClick={this._handleClick.bind(this)} />`,
        options: [{ allowBind: true }],
      },
    ],
    invalid: [
      {
        name: 'airbnb options: .bind() on a custom component still reports',
        code: `<Foo onClick={this._handleClick.bind(this)} />`,
        options: AIRBNB_OPTIONS['jsx-no-bind'],
        errors: [{ messageId: 'jsxNoBind' }],
      },
      {
        name: 'airbnb options: ignoreRefs does not cover other props',
        code: `<Foo ref={ref} onClick={this._handleClick.bind(this)} />`,
        options: AIRBNB_OPTIONS['jsx-no-bind'],
        errors: [{ messageId: 'jsxNoBind' }],
      },
      {
        name: 'a member-expression tag is not a DOM component',
        code: `<Foo.Bar onClick={this._handleClick.bind(this)} />`,
        options: [{ ignoreDOMComponents: true }],
        errors: [{ messageId: 'jsxNoBind' }],
      },
      {
        name: 'without ignoreDOMComponents a DOM element reports',
        code: `<div onClick={this._handleClick.bind(this)} />`,
        options: [{ ignoreRefs: true }],
        errors: [{ messageId: 'jsxNoBind' }],
      },
      {
        name: 'without ignoreRefs a ref reports',
        code: `<Foo ref={this._refCallback.bind(this)} />`,
        options: [{ ignoreDOMComponents: true }],
        errors: [{ messageId: 'jsxNoBind' }],
      },
    ],
  });

  ruleTester.run('prefer-es6-class', preferEs6Class, {
    valid: [
      {
        name: 'airbnb "always": an ES6 class component',
        code: `class Hello extends React.Component { render() { return <div />; } }`,
        options: AIRBNB_OPTIONS['prefer-es6-class'],
      },
      {
        name: '"never": a createClass component',
        code: `const Hello = React.createClass({ render() { return <div />; } });`,
        options: ['never'],
      },
      {
        name: '"never": a class that is not a React component',
        code: `class Hello extends Base { render() { return 1; } }`,
        options: ['never'],
      },
    ],
    invalid: [
      {
        name: 'airbnb "always": createClass reports',
        code: `const Hello = React.createClass({ render() { return <div />; } });`,
        options: AIRBNB_OPTIONS['prefer-es6-class'],
        errors: [{ messageId: 'preferEs6Class' }],
      },
      {
        name: '"never": an ES6 class component reports',
        code: `class Hello extends React.Component { render() { return <div />; } }`,
        options: ['never'],
        errors: [{ messageId: 'preferCreateClass' }],
      },
      {
        name: '"never": a PureComponent class reports',
        code: `import { PureComponent } from 'react';
class Hello extends PureComponent { render() { return <div />; } }`,
        options: ['never'],
        errors: [{ messageId: 'preferCreateClass' }],
      },
    ],
  });

  ruleTester.run('default-props-match-prop-types', defaultPropsMatchPropTypes, {
    valid: [
      {
        name: 'airbnb options: a default of the declared kind',
        code: `import PropTypes from 'prop-types';
class C extends React.Component {
  static propTypes = { name: PropTypes.string };
  static defaultProps = { name: 'x' };
}`,
        options: AIRBNB_OPTIONS['default-props-match-prop-types'],
      },
      {
        name: 'allowRequiredDefaults: true is accepted',
        code: `import PropTypes from 'prop-types';
class C extends React.Component {
  static propTypes = { name: PropTypes.string.isRequired };
  static defaultProps = { name: 'x' };
}`,
        options: [{ allowRequiredDefaults: true }],
      },
    ],
    invalid: [
      {
        name: 'airbnb options: a default of the wrong kind still reports',
        code: `import PropTypes from 'prop-types';
class C extends React.Component {
  static propTypes = { name: PropTypes.string };
  static defaultProps = { name: 1 };
}`,
        options: AIRBNB_OPTIONS['default-props-match-prop-types'],
        errors: [{ messageId: 'defaultPropsMatchPropTypes' }],
      },
    ],
  });

  ruleTester.run('state-in-constructor', stateInConstructor, {
    valid: [
      {
        name: 'airbnb "always": state set in the constructor',
        code: `class C extends React.Component {
  constructor(props) { super(props); this.state = { a: 1 }; }
  render() { return null; }
}`,
        options: AIRBNB_OPTIONS['state-in-constructor'],
      },
      {
        name: '"never": state as a class field',
        code: `class C extends React.Component { state = { a: 1 }; render() { return null; } }`,
        options: ['never'],
      },
      {
        name: '"never": this.state outside a constructor is not initialization',
        code: `class C extends React.Component {
  reset() { this.state = { a: 1 }; }
  render() { return null; }
}`,
        options: ['never'],
      },
      {
        name: '"never": this.state at module level or in a plain function',
        code: `this.state = {};
function f() { this.state = {}; }`,
        options: ['never'],
      },
      {
        name: '"never": a class that is not a React component',
        code: `class C { constructor() { this.state = {}; } }`,
        options: ['never'],
      },
    ],
    invalid: [
      {
        name: 'airbnb "always": a state class field without a constructor assignment',
        code: `class C extends React.Component { state = { a: 1 }; render() { return null; } }`,
        options: AIRBNB_OPTIONS['state-in-constructor'],
        errors: [{ messageId: 'stateInConstructor' }],
      },
      {
        name: '"never": this.state in the constructor reports',
        code: `class C extends React.Component {
  constructor(props) { super(props); this.state = { a: 1 }; }
  render() { return null; }
}`,
        options: ['never'],
        errors: [{ messageId: 'stateInClassProperty' }],
      },
      {
        name: '"never": an arrow function in the constructor shares its this',
        code: `class C extends React.Component {
  constructor(props) { super(props); const init = () => { this.state = {}; }; init(); }
  render() { return null; }
}`,
        options: ['never'],
        errors: [{ messageId: 'stateInClassProperty' }],
      },
      {
        name: '"never": a conditional assignment in the constructor reports',
        code: `class C extends React.Component {
  constructor(props) { super(props); if (props.a) { this.state = { a: 1 }; } }
  render() { return null; }
}`,
        options: ['never'],
        errors: [{ messageId: 'stateInClassProperty' }],
      },
    ],
  });

  ruleTester.run('static-property-placement', staticPropertyPlacement, {
    valid: [
      {
        name: 'airbnb "property assignment": statics assigned outside the class',
        code: `class C extends React.Component { render() { return null; } }
C.propTypes = {};
C.defaultProps = {};`,
        options: AIRBNB_OPTIONS['static-property-placement'],
      },
      {
        name: 'the style with a per-property override object',
        code: `class C extends React.Component { static propTypes = {}; static defaultProps = {}; }`,
        options: [
          'static public field',
          { propTypes: 'property assignment', displayName: 'static getter' },
        ],
      },
      {
        name: 'the existing object form is still accepted',
        code: `class C extends React.Component { static propTypes = {}; static defaultProps = {}; }`,
        options: [{ childClass: 'first' }],
      },
    ],
    invalid: [
      {
        name: 'airbnb "property assignment": a broken static group still reports',
        code: `class C extends React.Component {
  static propTypes = {};
  static getDerivedStateFromProps() { return null; }
  static defaultProps = {};
}`,
        options: AIRBNB_OPTIONS['static-property-placement'],
        errors: [{ messageId: 'staticPropertyPlacement' }],
      },
    ],
  });

  ruleTester.run('sort-comp', sortComp, {
    valid: [
      {
        name: 'airbnb order and groups: statics, lifecycle, handlers, render',
        code: `class C extends React.Component {
  static propTypes = {};
  constructor(props) { super(props); }
  componentDidMount() {}
  handleClick() {}
  render() { return null; }
}`,
        options: AIRBNB_OPTIONS['sort-comp'],
      },
    ],
    invalid: [
      {
        name: 'airbnb order and groups: render before a lifecycle method',
        code: `class C extends React.Component {
  render() { return null; }
  componentDidMount() {}
}`,
        options: AIRBNB_OPTIONS['sort-comp'],
        errors: [{ messageId: 'sortComp' }],
      },
    ],
  });
});
