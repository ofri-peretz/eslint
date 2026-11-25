/**
 * Tests for jsx-key's options as eslint-plugin-react spells them
 * (`checkKeyMustBeforeSpread`, `checkFragmentShorthand`, `warnOnDuplicates`),
 * the array-literal check, and `Children.toArray`. The case list follows
 * eslint-plugin-react's tests/lib/rules/jsx-key.js (the full set is in
 * upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { jsxKey } from '../../rules/react/jsx-key';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const beforeSpread = [{ checkKeyMustBeforeSpread: true }] as const;
const duplicates = [{ warnOnDuplicates: true }] as const;
const fragments = [{ checkFragmentShorthand: true }] as const;

ruleTester.run('jsx-key options', jsxKey, {
  valid: [
    {
      name: 'a key before a spread',
      options: beforeSpread,
      code: '<App key="k" {...props} />;',
    },
    {
      name: 'a key after a spread passes unless asked about',
      code: '[<App {...props} key="k" />];',
    },
    {
      name: 'a spread and no key in an iterator callback is a missing key, not a spread problem',
      options: beforeSpread,
      code: '<div>{list.map(x => <div key={x} {...spread} />)}</div>',
    },
    {
      name: 'an array literal of keyed elements',
      code: '[<App key="a" />, <App key="b" />];',
    },
    {
      name: 'an array literal with a hole and a non-element',
      code: '[, "text", <App key="a" />];',
    },
    {
      name: 'distinct keys with warnOnDuplicates',
      options: duplicates,
      code: '[<App key="a" />, <App key="b" />];',
    },
    {
      name: 'a key with no value is not compared',
      options: duplicates,
      code: '[<App key />, <App key="b" />];',
    },
    {
      name: 'a namespaced attribute is not a key',
      code: '[<App xlink:key="a" key="b" />];',
    },
    {
      name: 'siblings written out in JSX need no key',
      code: '<div><App /><App /></div>;',
    },
    {
      name: 'a shorthand fragment in an array is not asked about by default',
      code: '[<></>];',
    },
    {
      name: 'Children.toArray keys what it returns',
      code: `import { Children } from 'react'; Children.toArray([1, 2].map(x => <App />));`,
    },
    {
      name: 'React.Children.toArray keys an array literal too',
      code: `import React from 'react'; React.Children.toArray([<App />, <>x</>]);`,
      options: fragments,
    },
    {
      name: 'Children.toArray with a fragment from map and createElement',
      code: `import React from 'react'; React.Children.toArray([1].map(x => <>{x}</>).concat([1].map(x => React.createElement(App)))); React.Children.toArray([1].map(x => <App {...a} key={x} />), [2].map(x => <div />));`,
      options: [
        { checkFragmentShorthand: true, checkKeyMustBeforeSpread: true },
      ],
    },
  ],
  invalid: [
    {
      name: 'an element with no key in an array literal',
      code: '[<App />];',
      errors: [{ messageId: 'missingArrayKey' }],
    },
    {
      name: 'only the keyless element of an array is reported',
      code: '[<App key={0} />, <App />];',
      errors: [{ messageId: 'missingArrayKey' }],
    },
    {
      name: 'a spread with no key in an array',
      code: '[<App {...key} />];',
      errors: [{ messageId: 'missingArrayKey' }],
    },
    {
      name: 'a shorthand fragment in an array with checkFragmentShorthand',
      options: fragments,
      code: '[<></>];',
      errors: [{ messageId: 'missingArrayKey' }],
    },
    {
      name: 'a shorthand fragment in an iterator with checkFragmentShorthand',
      options: fragments,
      code: '[1, 2, 3].map(x => <>{x}</>);',
      errors: [{ messageId: 'missingKey' }],
    },
    {
      name: 'a key after a spread in an array',
      options: beforeSpread,
      code: '[<App {...obj} key="k" />];',
      errors: [{ messageId: 'keyBeforeSpread' }],
    },
    {
      name: 'a key after a spread in an iterator',
      options: beforeSpread,
      code: '<div>{list.map(x => <div {...spread} key={x} />)}</div>',
      errors: [{ messageId: 'keyBeforeSpread' }],
    },
    {
      name: 'a key after a spread in a returned iterator element',
      options: beforeSpread,
      code: 'list.map(x => { return <div {...spread} key={x} />; });',
      errors: [{ messageId: 'keyBeforeSpread' }],
    },
    {
      name: 'a key after a spread among sibling elements',
      options: beforeSpread,
      code: '<div><App {...obj} key="k" /></div>;',
      errors: [{ messageId: 'keyBeforeSpread' }],
    },
    {
      name: 'duplicate keys in an array',
      options: duplicates,
      code: '[<span key="notunique" />, <span key="notunique" />];',
      errors: [{ messageId: 'nonUniqueKeys' }, { messageId: 'nonUniqueKeys' }],
    },
    {
      name: 'duplicate keys among sibling elements, each reported once',
      options: duplicates,
      code: '<div><span key="notunique" /><span key="notunique" /><span key="other" /></div>;',
      errors: [{ messageId: 'nonUniqueKeys' }, { messageId: 'nonUniqueKeys' }],
    },
  ],
});
