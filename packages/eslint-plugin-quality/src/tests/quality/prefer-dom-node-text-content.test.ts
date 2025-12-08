/**
 * Comprehensive tests for prefer-dom-node-text-content rule
 * Prefer textContent over innerText for DOM node text access
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferDomNodeTextContent } from '../../rules/quality/prefer-dom-node-text-content';

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
  },
});

describe('prefer-dom-node-text-content', () => {
  describe('innerText detection', () => {
    ruleTester.run('detect innerText usage', preferDomNodeTextContent, {
      valid: [
        // textContent usage (preferred)
        {
          code: 'const text = element.textContent;',
        },
        // Other properties
        {
          code: 'const html = element.innerHTML;',
        },
        {
          code: 'const value = input.value;',
        },
        // Variable names
        {
          code: 'const innerText = "not a DOM property";',
        },
        // Non-element objects
        {
          code: 'const text = obj.innerText;',
        },
      ],
      invalid: [
        // Direct innerText access
        {
          code: 'const text = element.innerText;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const text = element.textContent;',
                },
              ],
            },
          ],
        },
        // innerText assignment
        {
          code: 'element.innerText = "new text";',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'element.textContent = "new text";',
                },
              ],
            },
          ],
        },
        // innerText in expressions
        {
          code: 'const length = element.innerText.length;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const length = element.textContent.length;',
                },
              ],
            },
          ],
        },
        // innerText method calls
        {
          code: 'element.innerText.trim();',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'element.textContent.trim();',
                },
              ],
            },
          ],
        },
        // Multiple innerText usages
        {
          code: `
            const text1 = div.innerText;
            const text2 = span.innerText;
          `,
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: `
            const text1 = div.textContent;
            const text2 = span.innerText;
          `,
                },
              ],
            },
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: `
            const text1 = div.innerText;
            const text2 = span.textContent;
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('fix suggestions', () => {
    ruleTester.run('fix suggestions', preferDomNodeTextContent, {
      valid: [],
      invalid: [
        // Simple property access
        {
          code: 'const text = element.innerText;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const text = element.textContent;',
                },
              ],
            },
          ],
        },
        // Assignment
        {
          code: 'element.innerText = "hello";',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'element.textContent = "hello";',
                },
              ],
            },
          ],
        },
        // In method call
        {
          code: 'console.log(element.innerText);',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'console.log(element.textContent);',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('different contexts', () => {
    ruleTester.run('different code contexts', preferDomNodeTextContent, {
      valid: [],
      invalid: [
        // In function
        {
          code: `
            function getText(element) {
              return element.innerText;
            }
          `,
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: `
            function getText(element) {
              return element.textContent;
            }
          `,
                },
              ],
            },
          ],
        },
        // In arrow function
        {
          code: 'const getText = element => element.innerText;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const getText = element => element.textContent;',
                },
              ],
            },
          ],
        },
        // In class method
        {
          code: `
            class Component {
              getText() {
                return this.element.innerText;
              }
            }
          `,
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: `
            class Component {
              getText() {
                return this.element.textContent;
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // In DOM manipulation
        {
          code: `
            function updateElement(el, text) {
              el.innerText = text;
              return el.innerText.length;
            }
          `,
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: `
            function updateElement(el, text) {
              el.textContent = text;
              return el.innerText.length;
            }
          `,
                },
              ],
            },
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: `
            function updateElement(el, text) {
              el.innerText = text;
              return el.textContent.length;
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('DOM API patterns', () => {
    ruleTester.run('DOM API patterns', preferDomNodeTextContent, {
      valid: [],
      invalid: [
        // Query selector results
        {
          code: 'const text = document.querySelector(".content").innerText;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const text = document.querySelector(".content").textContent;',
                },
              ],
            },
          ],
        },
        // getElementById
        {
          code: 'const text = document.getElementById("myDiv").innerText;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const text = document.getElementById("myDiv").textContent;',
                },
              ],
            },
          ],
        },
        // Chained calls
        {
          code: 'const text = element.querySelector("span").innerText;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const text = element.querySelector("span").textContent;',
                },
              ],
            },
          ],
        },
        // Template literals
        {
          code: 'const message = `Text: ${element.innerText}`;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const message = `Text: ${element.textContent}`;',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('edge cases', () => {
    ruleTester.run('edge cases', preferDomNodeTextContent, {
      valid: [
        // Computed property access (not flagged)
        {
          code: 'const prop = "innerText"; const text = element[prop];',
        },
      ],
      invalid: [
        // innerText with bracket notation (direct string)
        {
          code: 'const text = element["innerText"];',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const text = element["textContent"];',
                },
              ],
            },
          ],
        },
        // Complex expressions
        {
          code: 'const result = (element.innerText || "").toUpperCase();',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const result = (element.textContent || "").toUpperCase();',
                },
              ],
            },
          ],
        },
        // Optional chaining
        {
          code: 'const text = element?.innerText;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const text = element?.textContent;',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('React and framework contexts', () => {
    ruleTester.run('React and framework contexts', preferDomNodeTextContent, {
      valid: [],
      invalid: [
        // React ref access
        {
          code: 'const text = ref.current.innerText;',
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: 'const text = ref.current.textContent;',
                },
              ],
            },
          ],
        },
        // DOM manipulation in React
        {
          code: `
            function updateText(element, newText) {
              element.innerText = newText;
            }
          `,
          errors: [
            {
              messageId: 'preferDomNodeTextContent',
              suggestions: [
                {
                  messageId: 'preferDomNodeTextContent',
                  output: `
            function updateText(element, newText) {
              element.textContent = newText;
            }
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
