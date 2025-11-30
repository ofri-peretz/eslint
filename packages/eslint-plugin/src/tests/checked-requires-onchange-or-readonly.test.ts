import { RuleTester } from '@typescript-eslint/rule-tester';
import { checkedRequiresOnchangeOrReadonly } from '../rules/react/checked-requires-onchange-or-readonly';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('checked-requires-onchange-or-readonly', checkedRequiresOnchangeOrReadonly, {
  valid: [
    // Valid - input with checked and onChange
    {
      name: 'checkbox with checked and onChange',
      code: `<input type="checkbox" checked={isChecked} onChange={handleChange} />`,
    },
    {
      name: 'checkbox with checked and readOnly',
      code: `<input type="checkbox" checked={isChecked} readOnly />`,
    },
    {
      name: 'radio with checked and onChange',
      code: `<input type="radio" checked={isSelected} onChange={handleChange} />`,
    },
    {
      name: 'radio with checked and readOnly',
      code: `<input type="radio" checked={isSelected} readOnly />`,
    },
    // Valid - input with value and onChange
    {
      name: 'text input with value and onChange',
      code: `<input type="text" value={text} onChange={handleChange} />`,
    },
    {
      name: 'text input with value and readOnly',
      code: `<input type="text" value={text} readOnly />`,
    },
    {
      name: 'text input with value and onInput',
      code: `<input type="text" value={text} onInput={handleInput} />`,
    },
    // Valid - textarea with value and onChange
    {
      name: 'textarea with value and onChange',
      code: `<textarea value={text} onChange={handleChange} />`,
    },
    {
      name: 'textarea with value and readOnly',
      code: `<textarea value={text} readOnly />`,
    },
    // Valid - select with value and onChange
    {
      name: 'select with value and onChange',
      code: `<select value={selected} onChange={handleChange}><option>A</option></select>`,
    },
    {
      name: 'select with value and readOnly',
      code: `<select value={selected} readOnly><option>A</option></select>`,
    },
    // Valid - uncontrolled inputs (no checked or value)
    {
      name: 'uncontrolled checkbox',
      code: `<input type="checkbox" />`,
    },
    {
      name: 'uncontrolled text input',
      code: `<input type="text" />`,
    },
    {
      name: 'uncontrolled textarea',
      code: `<textarea />`,
    },
    {
      name: 'uncontrolled select',
      code: `<select><option>A</option></select>`,
    },
    // Valid - non-form elements
    {
      name: 'div element',
      code: `<div checked={true} />`,
    },
    {
      name: 'span element with value',
      code: `<span value="test" />`,
    },
    {
      name: 'button element',
      code: `<button value="Click" />`,
    },
    // Valid - custom components
    {
      name: 'custom component with checked',
      code: `<CustomInput checked={isChecked} />`,
    },
    {
      name: 'custom component with value',
      code: `<CustomInput value={text} />`,
    },
    // Valid - JSX member expression
    {
      name: 'member expression component',
      code: `<Form.Input checked={isChecked} />`,
    },
    // Valid - spread attributes
    {
      name: 'input with spread attributes',
      code: `<input {...props} />`,
    },
  ],
  invalid: [
    // Invalid - checkbox with checked but no onChange/readOnly
    {
      name: 'checkbox with checked but no onChange or readOnly',
      code: `<input type="checkbox" checked={isChecked} />`,
      errors: [{ messageId: 'checkedRequiresOnChangeOrReadOnly' }],
    },
    {
      name: 'radio with checked but no onChange or readOnly',
      code: `<input type="radio" checked={isSelected} />`,
      errors: [{ messageId: 'checkedRequiresOnChangeOrReadOnly' }],
    },
    // Invalid - input with value but no onChange/readOnly
    {
      name: 'text input with value but no onChange or readOnly',
      code: `<input type="text" value={text} />`,
      errors: [{ messageId: 'checkedRequiresOnChangeOrReadOnly' }],
    },
    {
      name: 'email input with value but no onChange or readOnly',
      code: `<input type="email" value={email} />`,
      errors: [{ messageId: 'checkedRequiresOnChangeOrReadOnly' }],
    },
    // Invalid - textarea with value but no onChange/readOnly
    {
      name: 'textarea with value but no onChange or readOnly',
      code: `<textarea value={text} />`,
      errors: [{ messageId: 'checkedRequiresOnChangeOrReadOnly' }],
    },
    // Invalid - select with value but no onChange/readOnly
    {
      name: 'select with value but no onChange or readOnly',
      code: `<select value={selected}><option>A</option></select>`,
      errors: [{ messageId: 'checkedRequiresOnChangeOrReadOnly' }],
    },
    // Invalid - multiple controlled attributes
    {
      name: 'input with both checked and value but no handler',
      code: `<input type="checkbox" checked={isChecked} value="on" />`,
      errors: [{ messageId: 'checkedRequiresOnChangeOrReadOnly' }],
    },
  ],
});

