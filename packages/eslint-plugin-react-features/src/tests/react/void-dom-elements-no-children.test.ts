/**
 * @fileoverview Tests for void-dom-elements-no-children rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { voidDomElementsNoChildren } from '../../rules/react/void-dom-elements-no-children';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('void-dom-elements-no-children', () => {
  ruleTester.run('void-dom-elements-no-children', voidDomElementsNoChildren, {
    valid: [
      // Void elements without children
      { name: 'a void element with no children', code: '<img src="image.png" alt="Image" />' },
      '<br />',
      '<hr />',
      '<input type="text" />',
      '<meta charset="UTF-8" />',
      '<link rel="stylesheet" href="styles.css" />',
      '<area shape="rect" coords="0,0,100,100" />',
      '<base href="https://example.com" />',
      '<col span="2" />',
      '<embed src="video.mp4" />',
      '<param name="autoplay" value="true" />',
      '<source src="audio.mp3" />',
      '<track src="captions.vtt" />',
      '<wbr />',
      // Non-void elements with children
      '<div>Content</div>',
      '<span>Text</span>',
      '<p>Paragraph</p>',
      // Custom components (not void elements)
      { name: 'a custom component is never a DOM element', code: '<MyComponent>Content</MyComponent>' },
      // A component whose name only differs from a void element by case is a
      // component, not that element: JSX resolves capitalized names to bindings.
      {
        name: "next/link's <Link> is a component, not the void <link>",
        code: 'import Link from "next/link"; const a = <Link href="/docs">Read the floor</Link>;',
      },
      { name: 'a capitalized <Img> component may wrap children', code: '<Img src="x.png">caption</Img>' },
      { name: 'a capitalized <Input> component may take a children prop', code: '<Input children={label} />' },
    ],
    invalid: [
      {
        name: 'children on a void element — the DOM discards them',
        code: '<img src="image.png">Content</img>',
        errors: [{ messageId: 'voidNoChildren' }],
      },
      {
        code: '<br>Line break</br>',
        errors: [{ messageId: 'voidNoChildren' }],
      },
      {
        code: '<input type="text">Value</input>',
        errors: [{ messageId: 'voidNoChildren' }],
      },
      {
        code: '<hr><span>Divider</span></hr>',
        errors: [{ messageId: 'voidNoChildren' }],
      },
      {
        code: '<img src="x" children="text" />',
        errors: [{ messageId: 'voidNoChildren' }],
      },
      {
        code: '<img src="x" dangerouslySetInnerHTML={{ __html: "text" }} />',
        errors: [{ messageId: 'voidNoChildren' }],
      },
      {
        code: '<input>{value}</input>',
        errors: [{ messageId: 'voidNoChildren' }],
      },
    ],
  });
});
