/**
 * Comprehensive tests for no-missing-aria-labels rule
 * Accessibility: Detects elements missing ARIA labels
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingAriaLabels } from '../rules/no-missing-aria-labels';

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
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-missing-aria-labels', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - elements with ARIA labels', noMissingAriaLabels, {
      valid: [
        // An intrinsic <img>/<area> with a non-empty alt is the button's name.
        {
          name: "an img with alt is the button's name",
          code: '<button><img alt="Save" /></button>',
        },
        {
          name: 'an img with alt nested in a span names the button',
          code: '<button><span><img alt="Save" /></span></button>',
        },
        {
          name: 'the string alt="false" is still a name',
          code: '<button><img alt="false" /></button>',
        },
        {
          name: 'a visible styled wrapper still passes its img name through',
          code: '<button><span style={{ display: \'block\' }}><img alt="Save" /></span></button>',
        },
        {
          name: 'a hidden={false} wrapper is visible',
          code: '<button><span hidden={false}><img alt="Save" /></span></button>',
        },
        {
          name: 'a non-object style does not hide the wrapper',
          code: '<button><span style={styles}><img alt="Save" /></span></button>',
        },
        {
          name: 'a computed style key is not read as hiding',
          code: '<button><span style={{ [k]: "none" }}><img alt="Save" /></span></button>',
        },
        {
          name: 'a spread style does not hide the wrapper',
          code: '<button><span style={{ ...s }}><img alt="Save" /></span></button>',
        },
        {
          name: 'a dynamic style value is not read as hiding',
          code: '<button><span style={{ display }}><img alt="Save" /></span></button>',
        },
        {
          name: 'a string style value on another property is visible',
          code: '<button><span style={{ color: "none" }}><img alt="Save" /></span></button>',
        },
        {
          name: 'a string literal alt expression names the button',
          code: '<button><img alt={"Save"} /></button>',
        },
        {
          name: 'an area with alt names the button',
          code: '<button><area alt="Save" /></button>',
        },
        // A dynamic alt counts as a name (the file cannot prove it empty),
        // matching givesValue() and control-has-associated-label.
        {
          name: 'a dynamic alt counts as a name',
          code: '<button><img alt={label} /></button>',
        },
        // Button with aria-label
        {
          name: 'an aria-label is present',
          code: '<button aria-label="Close dialog">X</button>',
        },
        // Input with aria-labelledby
        {
          code: '<input aria-labelledby="label-id" />',
        },
        // Elements not requiring labels
        {
          code: '<div>Content</div>',
        },
        // A wrapping <label> names its first labelable descendant (HTML label element)
        {
          name: 'input wrapped in a label is named by it',
          code: '<label>Email <input type="text" /></label>',
        },
        // type=hidden is never rendered
        {
          name: 'hidden input needs no accessible name',
          code: '<input type="hidden" name="token" />',
        },
        // HTML-AAM gives submit and reset buttons a default name
        {
          name: 'submit input has a default accessible name',
          code: '<input type="submit" />',
        },
        // #1563: the label this rule looks for may arrive through a spread
        // the call site cannot see into
        {
          name: 'a spread-prop input needs no label at the call site',
          code: 'function Field(props) { return <input {...props} />; }',
        },
        // Test files (if ignoreInTests is true)
        {
          code: '<button><Icon /></button>',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
        {
          // burgee sweep 2026-09-23: ignoreInTests missed .[cm]js/.[cm]ts test files
          // (compat-oracle/vendor/commander/tests/*.test.cjs); matches reliability #1080.
          name: 'ignoreInTests also skips an ESM test file (.test.mjs)',
          code: '<button><Icon /></button>',
          filename: 'test.test.mjs',
          options: [{ ignoreInTests: true }],
        },
        // Text children provide an accessible name — no aria-label needed.
        {
          code: '<button>Click</button>',
        },
        // title attribute also provides an accessible name.
        {
          code: '<button title="Close dialog"></button>',
        },
        // Expression containers with identifier/string/number are also text content.
        {
          code: '<button>{label}</button>',
        },
        // #1563: a ternary between two string literals is text either branch
        // resolves to, so the button's accessible name is text regardless of
        // which arm renders.
        {
          name: 'a ternary between two string literals is text content',
          code: '<button>{on ? "Turn off" : "Turn on"}</button>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing ARIA Labels', () => {
    ruleTester.run(
      'invalid - elements without ARIA labels',
      noMissingAriaLabels,
      {
        valid: [],
        invalid: [
          // An img only names its parent through a non-empty, visible alt.
          {
            name: 'an empty alt gives no name',
            code: '<button><img alt="" /></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'an img without alt gives no name',
            code: '<button><img /></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'an aria-hidden img gives no name',
            code: '<button><img alt="Save" aria-hidden="true" /></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'an img inside a hidden wrapper gives no name',
            code: '<button><span aria-hidden="true"><img alt="Save" /></span></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'an img inside a display:none wrapper gives no name',
            code: '<button><span style={{ display: \'none\' }}><img alt="Save" /></span></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'an img inside a visibility:hidden wrapper gives no name',
            code: '<button><span style={{ visibility: \'hidden\' }}><img alt="Save" /></span></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'an img inside a hidden-attribute wrapper gives no name',
            code: '<button><span hidden><img alt="Save" /></span></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'a boolean alt={false} is not rendered, so it gives no name',
            code: '<button><img alt={false} /></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'a boolean alt={true} is not rendered, so it gives no name',
            code: '<button><img alt={true} /></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'a hidden={true} wrapper gives no name',
            code: '<button><span hidden={true}><img alt="Save" /></span></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'a quoted display key still hides the wrapper',
            code: '<button><span style={{ "display": "none" }}><img alt="Save" /></span></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'a computed string display key still hides the wrapper',
            code: '<button><span style={{ ["display"]: "none" }}><img alt="Save" /></span></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            name: 'a custom Img component is not proven to name the button',
            code: '<button><Img alt="Save" /></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          // An empty aria-label yields no accessible name (accname 1.2)
          {
            name: 'empty aria-label is not a name',
            code: '<input type="text" aria-label="" />',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          // Icon-only button — no text child, no aria-label/aria-labelledby/title,
          // so it has no accessible name. (Buttons WITH text children, e.g.
          // `<button>Click</button>`, are exempted — see hasTextContent() below.)
          {
            name: 'an icon-only button with no accessible name',
            code: '<button><Icon /></button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          // Same icon-only case wrapped in a JSX expression container — must
          // still be flagged; only string-like expressions (Literal,
          // TemplateLiteral, Identifier) are treated as text content.
          {
            code: '<button>{<Icon />}</button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            code: '<button>{true}</button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            code: '<input type="text" />',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            code: '<select><option>Option</option></select>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          {
            code: '<textarea></textarea>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
          // A ternary between two blank strings resolves to text on neither
          // branch — only a non-whitespace string literal counts as a name.
          {
            name: 'a ternary between two blank string literals is not a name',
            code: '<button>{on ? "" : " "}</button>',
            errors: [{ messageId: 'missingAriaLabel' }],
          },
        ],
      },
    );
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noMissingAriaLabels, {
      valid: [
        // Icon-only button (no accessible name) is still valid here because
        // ignoreInTests exempts test files — not because of text content.
        {
          code: '<button><Icon /></button>',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: '<button><Icon /></button>',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingAriaLabel' }],
        },
      ],
    });

    ruleTester.run('options - requireLabels', noMissingAriaLabels, {
      valid: [
        {
          code: '<div>Content</div>',
          options: [{ requireLabels: ['button', 'input'] }], // div not required
        },
      ],
      invalid: [
        {
          code: '<button><Icon /></button>',
          options: [{ requireLabels: ['button', 'input'] }],
          errors: [{ messageId: 'missingAriaLabel' }],
        },
      ],
    });
  });
});
