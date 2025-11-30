/**
 * Tests for no-danger rule
 * Disallow dangerouslySetInnerHTML usage (XSS prevention)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDanger } from '../rules/react/no-danger';

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

describe('no-danger', () => {
  describe('Basic Functionality', () => {
    ruleTester.run('no-danger validation', noDanger, {
      valid: [
        // Regular JSX content
        {
          code: '<div>Hello World</div>',
        },
        {
          code: '<p>Regular text content</p>',
        },
        // Other props
        {
          code: '<div className="safe" id="content"></div>',
        },
        {
          code: '<input type="text" value="safe" />',
        },
        // Safe HTML attributes
        {
          code: '<meta httpEquiv="X-UA-Compatible" content="IE=edge" />',
        },
      ],
      invalid: [
        // dangerouslySetInnerHTML usage
        {
          code: '<div dangerouslySetInnerHTML={{ __html: "<script>alert(1)</script>" }} />',
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // dangerouslySetInnerHTML with variable
        {
          code: '<div dangerouslySetInnerHTML={{ __html: htmlContent }} />',
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // dangerouslySetInnerHTML with function call
        {
          code: '<div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />',
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // dangerouslySetInnerHTML with complex expression
        {
          code: '<div dangerouslySetInnerHTML={{ __html: condition ? safeHtml : unsafeHtml }} />',
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // dangerouslySetInnerHTML with multiline
        {
          code: `
            <div
              dangerouslySetInnerHTML={{
                __html: '<strong>Bold text</strong>'
              }}
            />
          `,
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
      ],
    });
  });

  describe('Complex JSX Structures', () => {
    ruleTester.run('complex JSX structures', noDanger, {
      valid: [
        // Safe component with regular props
        {
          code: `
            <Component
              title="Safe Title"
              content="Safe content"
            />
          `,
        },
        // Safe HTML elements
        {
          code: `
            <div>
              <h1>Safe heading</h1>
              <p>Safe paragraph</p>
            </div>
          `,
        },
      ],
      invalid: [
        // dangerouslySetInnerHTML in complex component
        {
          code: `
            <article
              className="post"
              dangerouslySetInnerHTML={{ __html: postContent }}
            >
              <footer>Footer content</footer>
            </article>
          `,
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // Multiple dangerouslySetInnerHTML
        {
          code: `
            <div>
              <header dangerouslySetInnerHTML={{ __html: headerHtml }} />
              <main dangerouslySetInnerHTML={{ __html: mainHtml }} />
              <footer dangerouslySetInnerHTML={{ __html: footerHtml }} />
            </div>
          `,
          errors: [
            {
              messageId: 'noDanger',
            },
            {
              messageId: 'noDanger',
            },
            {
              messageId: 'noDanger',
            },
          ],
        },
        // dangerouslySetInnerHTML with TypeScript
        {
          code: '<div dangerouslySetInnerHTML={{ __html: content as string }} />',
          filename: '/src/component.tsx',
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
      ],
    });
  });

  describe('Security Anti-patterns', () => {
    ruleTester.run('security anti-patterns', noDanger, {
      valid: [
        // Safe alternatives
        {
          code: `
            import DOMPurify from 'dompurify';

            <div>{DOMPurify.sanitize(dirtyHtml)}</div>
          `,
        },
      ],
      invalid: [
        // Direct HTML injection
        {
          code: `
            function DangerousComponent({ html }) {
              return <div dangerouslySetInnerHTML={{ __html: html }} />;
            }
          `,
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // User input without sanitization
        {
          code: `
            function Comment({ userComment }) {
              return (
                <div className="comment">
                  <strong>Comment:</strong>
                  <div dangerouslySetInnerHTML={{ __html: userComment }} />
                </div>
              );
            }
          `,
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // API response rendering
        {
          code: `
            function NewsArticle({ article }) {
              return (
                <article>
                  <h1>{article.title}</h1>
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </article>
              );
            }
          `,
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // Markdown rendering without proper sanitization
        {
          code: `
            import { marked } from 'marked';

            function MarkdownRenderer({ markdown }) {
              const html = marked(markdown);
              return <div dangerouslySetInnerHTML={{ __html: html }} />;
            }
          `,
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noDanger, {
      valid: [
        // dangerouslySetInnerHTML as variable name (not JSX prop)
        {
          code: `
            const dangerouslySetInnerHTML = 'not a prop';
            console.log(dangerouslySetInnerHTML);
          `,
        },
        // dangerouslySetInnerHTML in destructuring (not JSX)
        {
          code: `
            function process({ dangerouslySetInnerHTML }) {
              return dangerouslySetInnerHTML;
            }
          `,
        },
      ],
      invalid: [
        // dangerouslySetInnerHTML with empty object
        {
          code: '<div dangerouslySetInnerHTML={{}} />',
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // dangerouslySetInnerHTML with null
        {
          code: '<div dangerouslySetInnerHTML={null} />',
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
        // dangerouslySetInnerHTML with undefined
        {
          code: '<div dangerouslySetInnerHTML={undefined} />',
          errors: [
            {
              messageId: 'noDanger',
            },
          ],
        },
      ],
    });
  });
});
