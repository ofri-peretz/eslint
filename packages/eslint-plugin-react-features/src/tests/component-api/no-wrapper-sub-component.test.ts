/**
 * Tests for no-wrapper-sub-component (R12)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWrapperSubComponent } from '../../rules/component-api/no-wrapper-sub-component';

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

describe('no-wrapper-sub-component', () => {
  ruleTester.run('no-wrapper-sub-component', noWrapperSubComponent, {
    valid: [
      {
        name: 'a component with no props spreads something else',
        code: 'const defaults = { size: 2 }; function MyTrigger() { return <Trigger {...defaults} />; }',
      },
      {
        name: 'a single destructured prop is not the props whole',
        code: 'function MyTrigger({ a }) { return <Trigger {...a} />; }',
      },
      {
        name: 'spreading something other than the props is not a passthrough',
        code: 'const defaults = { size: 2 }; function MyTrigger(props) { return <Trigger {...defaults} />; }',
      },
      {
        name: 'a wrapper that drops a named prop filters the props',
        code: 'function MyTrigger({ label, ...rest }) { return <Trigger {...rest} />; }',
      },
      // Adds className — structural behavior
      {
        name: 'a wrapper that adds a class',
        code: `function MyButton(props) { return <Button className="x" {...props} />; }`,
      },
      // Adds data-slot — structural behavior
      {
        code: `function Dialog(props) { return <BaseDialog.Root data-slot="dialog" {...props} />; }`,
      },
      // Adds children
      {
        code: `function MyBtn(props) { return <Button {...props}>Submit</Button>; }`,
      },
      // Uses a hook — non-trivial logic
      {
        code: `function MyBtn(props) { const [x] = useState(0); return <Button {...props} />; }`,
      },
      // Lowercase identifier — not a React component
      {
        code: `function myFn(props) { return <Button {...props} />; }`,
      },
      // Lowercase JSX (native el) — not a wrapper concern
      {
        code: `function Wrap(props) { return <div {...props} />; }`,
      },
    ],
    invalid: [
      {
        name: 'a rest-only parameter is the props whole',
        code: 'function MyTrigger({ ...rest }) { return <Trigger {...rest} />; }',
        errors: [{ messageId: 'wrapperSubComponent' }],
      },
      {
        name: 'a passthrough wrapped in memo',
        code: "import { memo } from 'react'; const MyTrigger = memo((props) => <Trigger {...props} />);",
        errors: [{ messageId: 'wrapperSubComponent' }],
      },
      // Pure passthrough wrapper — function declaration
      {
        name: 'a wrapper that adds nothing but a spread',
        code: `function MyButton(props) { return <Button {...props} />; }`,
        errors: [{ messageId: 'wrapperSubComponent' }],
      },
      // Pure passthrough — arrow function with block body
      {
        code: `const MyButton = (props) => { return <Button {...props} />; };`,
        errors: [{ messageId: 'wrapperSubComponent' }],
      },
      // Pure passthrough — arrow with concise body
      {
        code: `const MyButton = (props) => <Button {...props} />;`,
        errors: [{ messageId: 'wrapperSubComponent' }],
      },
      // Member expression target (compound component)
      {
        code: `const MyTrigger = (props) => <Dialog.Trigger {...props} />;`,
        errors: [{ messageId: 'wrapperSubComponent' }],
      },
    ],
  });
});
