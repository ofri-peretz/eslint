/**
 * Comprehensive tests for no-directive-injection rule
 * Security: CWE-96 (Improper Neutralization of Directives in Statically Saved Code)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDirectiveInjection } from '../../rules/security/no-directive-injection';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+) with JSX support
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

describe('no-directive-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe directive usage', noDirectiveInjection, {
      valid: [
        // Safe innerHTML with text content (not innerHTML)
        {
          code: 'element.textContent = userInput;',
        },
        // Trusted directive names (string literal, not user input)
        {
          code: 'Vue.directive("my-directive", { /* safe */ });',
        },
        // Static HTML (no user input variables)
        {
          code: '<div dangerouslySetInnerHTML={{ __html: "static content" }} />',
        },
        // innerHTML with non-user input
        {
          code: 'element.innerHTML = staticContent;',
        },
        // Handlebars compile with non-user input
        {
          code: 'const compiled = Handlebars.compile(staticTemplate);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - dangerouslySetInnerHTML', () => {
    ruleTester.run('invalid - dangerous innerHTML usage', noDirectiveInjection, {
      valid: [],
      invalid: [
        // userInput is a recognized user input variable
        {
          code: '<div dangerouslySetInnerHTML={{ __html: userInput }} />',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
        // req.body.content contains 'body' which is a user input variable
        {
          code: '<div dangerouslySetInnerHTML={{ __html: req.body.content }} />',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Template Injection', () => {
    ruleTester.run('invalid - template injection in JSX', noDirectiveInjection, {
      valid: [],
      invalid: [
        // Template literal with userInput in dangerouslySetInnerHTML
        // Only triggers dangerousInnerHTML (JSX context doesn't trigger templateInjection via TemplateLiteral visitor)
        {
          code: '<div dangerouslySetInnerHTML={{ __html: `Hello ${userInput}!` }} />',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - innerHTML Assignments', () => {
    ruleTester.run('invalid - unsafe innerHTML assignments', noDirectiveInjection, {
      valid: [],
      invalid: [
        {
          code: 'element.innerHTML = userInput;',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
        {
          code: 'document.getElementById("content").innerHTML = req.body.html;',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Dynamic Component Binding', () => {
    ruleTester.run('invalid - unsafe component binding', noDirectiveInjection, {
      valid: [],
      invalid: [
        // JSX is={userInput} - userInput is in user input variables
        // Rule only detects Identifiers (not MemberExpressions like req.query.x)
        {
          code: '<div is={userInput}></div>',
          errors: [
            {
              messageId: 'unsafeComponentBinding',
            },
          ],
        },
        // data is in user input variables
        {
          code: '<div is={data}></div>',
          errors: [
            {
              messageId: 'unsafeComponentBinding',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Template Compilation', () => {
    ruleTester.run('invalid - unsafe template compilation', noDirectiveInjection, {
      valid: [],
      invalid: [
        // Handlebars.compile with userInput variable
        {
          code: 'const compiled = Handlebars.compile(userInput);',
          errors: [
            {
              messageId: 'userControlledTemplate',
            },
          ],
        },
        // _.template with variable containing "input"
        {
          code: 'const template = _.template(userInput);',
          errors: [
            {
              messageId: 'userControlledTemplate',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Dynamic Directive Creation', () => {
    ruleTester.run('invalid - dynamic directive creation', noDirectiveInjection, {
      valid: [],
      invalid: [
        // Vue.directive with userInput as directive name
        {
          code: 'Vue.directive(userInput, directiveDefinition);',
          errors: [
            {
              messageId: 'unsafeDirectiveName',
            },
          ],
        },
        // directive() with userInput as directive name
        {
          code: 'directive(userInput, function() { /* ... */ });',
          errors: [
            {
              messageId: 'dynamicDirectiveCreation',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noDirectiveInjection, {
      valid: [
        // safeHtml is not a user input variable, so it's valid
        {
          code: '<div dangerouslySetInnerHTML={{ __html: safeHtml }} />',
        },
        // safeTemplate doesn't contain user input variable names
        {
          code: 'const compiled = Handlebars.compile(safeTemplate);',
        },
        // Trusted directive names (string literal)
        {
          code: 'Vue.directive("my-safe-directive", definition);',
        },
        // Static HTML string doesn't trigger
        {
          code: 'element.innerHTML = "<strong>Safe</strong>";',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - user input variables', noDirectiveInjection, {
      valid: [
        // customVar is not in default user input variables
        {
          code: '<div dangerouslySetInnerHTML={{ __html: customVar }} />',
        },
      ],
      invalid: [
        // requestData contains 'request' which is in user input variables
        {
          code: '<div dangerouslySetInnerHTML={{ __html: requestData }} />',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Directive Injection Scenarios', () => {
    ruleTester.run('complex - real-world directive injection attacks', noDirectiveInjection, {
      valid: [],
      invalid: [
        // innerHTML assignment with template literal containing user input
        {
          code: `
            element.innerHTML = \`<div>\${userInput}</div>\`;
          `,
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
            {
              messageId: 'templateInjection',
            },
          ],
        },
        // Multiple dangerous patterns in same code
        {
          code: `
            element.innerHTML = req.body.html;
            const tpl = Handlebars.compile(userInput);
          `,
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
            {
              messageId: 'userControlledTemplate',
            },
          ],
        },
      ],
    });
  });
});
