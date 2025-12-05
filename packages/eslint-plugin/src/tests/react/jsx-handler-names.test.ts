/**
 * Tests for jsx-handler-names rule
 * Enforce event handler naming conventions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxHandlerNames } from '../../rules/react/jsx-handler-names';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
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

describe('jsx-handler-names', () => {
  describe('Valid cases - proper handler names', () => {
    ruleTester.run('proper handler names are valid', jsxHandlerNames, {
      valid: [
        // handleX pattern
        {
          code: `<button onClick={handleClick}>Click</button>`,
        },
        // onX pattern
        {
          code: `<button onClick={onButtonClick}>Click</button>`,
        },
        // handleSubmit
        {
          code: `<form onSubmit={handleSubmit}>Submit</form>`,
        },
        // onSubmit
        {
          code: `<form onSubmit={onFormSubmit}>Submit</form>`,
        },
        // handleChange
        {
          code: `<input onChange={handleChange} />`,
        },
        // onChange
        {
          code: `<input onChange={onInputChange} />`,
        },
        // handleFocus
        {
          code: `<input onFocus={handleFocus} />`,
        },
        // handleBlur
        {
          code: `<input onBlur={handleBlur} />`,
        },
        // Arrow function (not an identifier)
        {
          code: `<button onClick={() => doSomething()}>Click</button>`,
        },
        // Inline function
        {
          code: `<button onClick={function() { doSomething(); }}>Click</button>`,
        },
        // Member expression (not an identifier)
        {
          code: `<button onClick={this.handleClick}>Click</button>`,
        },
        // Non-event props
        {
          code: `<button className="btn">Click</button>`,
        },
        // Short on attr (edge case)
        {
          code: `<button on={handler}>Click</button>`,
        },
        // onX without value
        {
          code: `<input onFocus />`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - improper handler names', () => {
    ruleTester.run('improper handler names trigger error', jsxHandlerNames, {
      valid: [],
      invalid: [
        // Random name
        {
          code: `<button onClick={doClick}>Click</button>`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // click (too short, no prefix)
        {
          code: `<button onClick={click}>Click</button>`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // submit (no prefix)
        {
          code: `<form onSubmit={submit}>Submit</form>`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // change (no prefix)
        {
          code: `<input onChange={change} />`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // focus (no prefix)
        {
          code: `<input onFocus={focus} />`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // blur (no prefix)
        {
          code: `<input onBlur={blur} />`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // buttonClicked (not prefixed)
        {
          code: `<button onClick={buttonClicked}>Click</button>`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // formSubmitted (not prefixed)
        {
          code: `<form onSubmit={formSubmitted}>Submit</form>`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // Multiple invalid handlers
        {
          code: `<input onChange={update} onFocus={select} />`,
          errors: [
            { messageId: 'jsxHandlerNames' },
            { messageId: 'jsxHandlerNames' },
          ],
        },
      ],
    });
  });

  describe('Various event types', () => {
    ruleTester.run('various event types', jsxHandlerNames, {
      valid: [
        // Mouse events
        {
          code: `<div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>Hover</div>`,
        },
        // Keyboard events
        {
          code: `<input onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />`,
        },
        // Touch events
        {
          code: `<div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>Touch</div>`,
        },
        // Drag events
        {
          code: `<div onDragStart={handleDragStart} onDrop={handleDrop}>Drag</div>`,
        },
      ],
      invalid: [
        // Invalid mouse event handler
        {
          code: `<div onMouseEnter={mouseEnter}>Hover</div>`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // Invalid keyboard event handler
        {
          code: `<input onKeyDown={keyDown} />`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
      ],
    });
  });

  describe('Custom components', () => {
    ruleTester.run('custom components', jsxHandlerNames, {
      valid: [
        // Custom component with proper handler
        {
          code: `<CustomButton onClick={handleCustomClick} />`,
        },
        // Custom prop with proper handler
        {
          code: `<Modal onClose={handleClose} />`,
        },
      ],
      invalid: [
        // Custom component with improper handler
        {
          code: `<CustomButton onClick={customClick} />`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
        // Custom prop with improper handler
        {
          code: `<Modal onClose={closeModal} />`,
          errors: [{ messageId: 'jsxHandlerNames' }],
        },
      ],
    });
  });
});

