import { RuleTester } from '@typescript-eslint/rule-tester';
import { noAdjacentInlineElements } from '../../rules/react/no-adjacent-inline-elements';

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

ruleTester.run('no-adjacent-inline-elements', noAdjacentInlineElements, {
  valid: [
    // Valid - single inline element
    {
      name: 'single span',
      code: `<div><span>Hello</span></div>`,
    },
    {
      name: 'single link',
      code: `<div><a href="#">Link</a></div>`,
    },
    // Valid - inline elements separated by text
    {
      name: 'inline elements separated by text',
      code: `<div><span>Hello</span> World <span>!</span></div>`,
    },
    {
      name: 'links separated by text',
      code: `<div><a href="#">Link 1</a> | <a href="#">Link 2</a></div>`,
    },
    // Valid - inline elements separated by block elements
    {
      name: 'inline elements separated by block element',
      code: `<div><span>Hello</span><p>Paragraph</p><span>World</span></div>`,
    },
    {
      name: 'inline elements with div between',
      code: `<div><a href="#">Link</a><div>Block</div><a href="#">Link</a></div>`,
    },
    // Valid - block elements only
    {
      name: 'block elements only',
      code: `<div><p>Para 1</p><p>Para 2</p></div>`,
    },
    {
      name: 'div elements',
      code: `<div><div>Div 1</div><div>Div 2</div></div>`,
    },
    // Valid - no children
    {
      name: 'no children',
      code: `<div></div>`,
    },
    // Valid - single child
    {
      name: 'single child',
      code: `<div><span>Only one</span></div>`,
    },
    // Valid - text only
    {
      name: 'text only',
      code: `<div>Hello World</div>`,
    },
    // Valid - mixed with custom components
    {
      name: 'inline elements separated by custom component',
      code: `<div><span>Hello</span><CustomComponent /><span>World</span></div>`,
    },
    // Valid - JSX member expression (not inline element)
    {
      name: 'member expression elements',
      code: `<div><UI.Span>A</UI.Span><UI.Span>B</UI.Span></div>`,
    },
    // Note: expression containers don't reset the counter, only text nodes with content do
  ],
  invalid: [
    // Invalid - adjacent span elements
    {
      name: 'two adjacent spans',
      code: `<div><span>Hello</span><span>World</span></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
    // Invalid - adjacent link elements
    {
      name: 'two adjacent links',
      code: `<div><a href="#">Link 1</a><a href="#">Link 2</a></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
    // Invalid - mixed inline elements
    {
      name: 'span followed by strong',
      code: `<div><span>Hello</span><strong>World</strong></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
    {
      name: 'em followed by b',
      code: `<div><em>Hello</em><b>World</b></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
    // Invalid - multiple adjacent inline elements
    {
      name: 'three adjacent spans',
      code: `<div><span>A</span><span>B</span><span>C</span></div>`,
      errors: [
        { messageId: 'noAdjacentInlineElements' },
        { messageId: 'noAdjacentInlineElements' },
      ],
    },
    // Invalid - various inline elements
    {
      name: 'code followed by kbd',
      code: `<div><code>code</code><kbd>key</kbd></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
    {
      name: 'sub followed by sup',
      code: `<div><sub>sub</sub><sup>sup</sup></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
    {
      name: 'mark followed by small',
      code: `<div><mark>mark</mark><small>small</small></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
    // Invalid - adjacent inline elements with nested content
    {
      name: 'nested inline elements',
      code: `<div><span><b>Bold</b></span><span><i>Italic</i></span></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
    // Invalid - expression containers don't separate inline elements
    {
      name: 'inline elements with expression between',
      code: `<div><span>A</span>{variable}<span>B</span></div>`,
      errors: [{ messageId: 'noAdjacentInlineElements' }],
    },
  ],
});

