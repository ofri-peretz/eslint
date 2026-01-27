/**
 * Tests for aria-role rule
 * Accessibility: WCAG 4.1.2 Name, Role, Value (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { ariaRole } from '../rules/aria-role';

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

describe('aria-role', () => {
  describe('Valid Code - Valid ARIA Roles', () => {
    ruleTester.run('valid - standard ARIA roles', ariaRole, {
      valid: [
        // Landmark roles
        { code: '<div role="banner"></div>' },
        { code: '<div role="complementary"></div>' },
        { code: '<div role="contentinfo"></div>' },
        { code: '<div role="main"></div>' },
        { code: '<div role="navigation"></div>' },
        { code: '<div role="region"></div>' },
        { code: '<div role="search"></div>' },
        // Widget roles
        { code: '<div role="button"></div>' },
        { code: '<div role="checkbox"></div>' },
        { code: '<div role="dialog"></div>' },
        { code: '<div role="gridcell"></div>' },
        { code: '<div role="link"></div>' },
        { code: '<div role="menuitem"></div>' },
        { code: '<div role="menuitemcheckbox"></div>' },
        { code: '<div role="menuitemradio"></div>' },
        { code: '<div role="option"></div>' },
        { code: '<div role="progressbar"></div>' },
        { code: '<div role="radio"></div>' },
        { code: '<div role="scrollbar"></div>' },
        { code: '<div role="slider"></div>' },
        { code: '<div role="spinbutton"></div>' },
        { code: '<div role="switch"></div>' },
        { code: '<div role="tab"></div>' },
        { code: '<div role="tabpanel"></div>' },
        { code: '<div role="textbox"></div>' },
        { code: '<div role="treeitem"></div>' },
        // Composite roles
        { code: '<div role="combobox"></div>' },
        { code: '<div role="grid"></div>' },
        { code: '<div role="listbox"></div>' },
        { code: '<div role="menu"></div>' },
        { code: '<div role="menubar"></div>' },
        { code: '<div role="radiogroup"></div>' },
        { code: '<div role="tablist"></div>' },
        { code: '<div role="tree"></div>' },
        { code: '<div role="treegrid"></div>' },
        // Document structure roles
        { code: '<div role="article"></div>' },
        { code: '<div role="definition"></div>' },
        { code: '<div role="directory"></div>' },
        { code: '<div role="document"></div>' },
        { code: '<div role="group"></div>' },
        { code: '<div role="heading"></div>' },
        { code: '<div role="img"></div>' },
        { code: '<div role="list"></div>' },
        { code: '<div role="listitem"></div>' },
        { code: '<div role="math"></div>' },
        { code: '<div role="none"></div>' },
        { code: '<div role="note"></div>' },
        { code: '<div role="presentation"></div>' },
        { code: '<div role="separator"></div>' },
        { code: '<div role="toolbar"></div>' },
        { code: '<div role="tooltip"></div>' },
        // Live region roles
        { code: '<div role="alert"></div>' },
        { code: '<div role="alertdialog"></div>' },
        { code: '<div role="log"></div>' },
        { code: '<div role="marquee"></div>' },
        { code: '<div role="status"></div>' },
        { code: '<div role="timer"></div>' },
        // No role attribute (should not trigger)
        { code: '<div></div>' },
        { code: '<button></button>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Invalid ARIA Roles', () => {
    ruleTester.run('invalid - non-existent roles', ariaRole, {
      valid: [],
      invalid: [
        // Typos
        {
          code: '<div role="buton"></div>',
          errors: [{ messageId: 'invalidRole' }],
        },
        {
          code: '<div role="chekbox"></div>',
          errors: [{ messageId: 'invalidRole' }],
        },
        // Made-up roles
        {
          code: '<div role="container"></div>',
          errors: [{ messageId: 'invalidRole' }],
        },
        {
          code: '<div role="wrapper"></div>',
          errors: [{ messageId: 'invalidRole' }],
        },
        {
          code: '<div role="custom"></div>',
          errors: [{ messageId: 'invalidRole' }],
        },
        // Common mistakes
        {
          code: '<div role="input"></div>',
          errors: [{ messageId: 'invalidRole' }],
        },
        {
          code: '<div role="label"></div>',
          errors: [{ messageId: 'invalidRole' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', ariaRole, {
      valid: [
        // Dynamic role (can't validate at lint time)
        { code: '<div role={dynamicRole}></div>' },
        // Multiple valid roles (space-separated)
        // Note: This is actually valid per ARIA spec
      ],
      invalid: [],
    });
  });
});
