/**
 * Tests for jsx-max-depth rule
 * Limit JSX nesting depth
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxMaxDepth } from '../../rules/react/jsx-max-depth';

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

describe('jsx-max-depth', () => {
  describe('Valid cases - within depth limit', () => {
    ruleTester.run('JSX within depth limit is valid', jsxMaxDepth, {
      valid: [
        // Depth 0
        {
          code: `const el = <div>Hello</div>;`,
        },
        // Depth 1 (default max is 5)
        {
          code: `
            const el = (
              <div>
                <span>Hello</span>
              </div>
            );
          `,
        },
        // Depth 2
        {
          code: `
            const el = (
              <div>
                <section>
                  <span>Hello</span>
                </section>
              </div>
            );
          `,
        },
        // Depth 4 (still within default max of 5)
        {
          code: `
            const el = (
              <div>
                <main>
                  <section>
                    <article>
                      <p>Content</p>
                    </article>
                  </section>
                </main>
              </div>
            );
          `,
        },
        // Depth 5 (exactly at default max)
        {
          code: `
            const el = (
              <div>
                <main>
                  <section>
                    <article>
                      <div>
                        <p>Content</p>
                      </div>
                    </article>
                  </section>
                </main>
              </div>
            );
          `,
        },
        // With custom max of 2
        {
          code: `
            const el = (
              <div>
                <span>
                  <strong>Hello</strong>
                </span>
              </div>
            );
          `,
          options: [{ max: 2 }],
        },
        // Siblings don't increase depth
        {
          code: `
            const el = (
              <div>
                <span>A</span>
                <span>B</span>
                <span>C</span>
              </div>
            );
          `,
        },
        // Empty elements
        {
          code: `const el = <div />;`,
        },
        // Text only
        {
          code: `const el = <div>Just text</div>;`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid cases - exceeding depth limit', () => {
    ruleTester.run('JSX exceeding depth limit triggers error', jsxMaxDepth, {
      valid: [],
      invalid: [
        // Depth 6 (exceeds default max of 5)
        {
          code: `
            const el = (
              <div>
                <main>
                  <section>
                    <article>
                      <div>
                        <span>
                          <p>Too deep</p>
                        </span>
                      </div>
                    </article>
                  </section>
                </main>
              </div>
            );
          `,
          errors: [{ messageId: 'jsxMaxDepth' }],
        },
        // Depth 3 with max of 2
        {
          code: `
            const el = (
              <div>
                <section>
                  <article>
                    <p>Too deep</p>
                  </article>
                </section>
              </div>
            );
          `,
          options: [{ max: 2 }],
          errors: [{ messageId: 'jsxMaxDepth' }],
        },
        // Depth 2 with max of 1
        {
          code: `
            const el = (
              <div>
                <span>
                  <strong>Too deep</strong>
                </span>
              </div>
            );
          `,
          options: [{ max: 1 }],
          errors: [{ messageId: 'jsxMaxDepth' }],
        },
      ],
    });
  });

  describe('JSX in expressions', () => {
    ruleTester.run('JSX in expressions', jsxMaxDepth, {
      valid: [
        // JSX in expression within depth limit
        {
          code: `
            const el = (
              <div>
                {showContent && <span>Content</span>}
              </div>
            );
          `,
        },
        // Conditional rendering
        {
          code: `
            const el = (
              <div>
                {condition ? <span>A</span> : <span>B</span>}
              </div>
            );
          `,
        },
        // Note: JSX inside && or ?: operators is not counted as nesting by this rule
        // since the rule only checks direct JSXElement children and JSXExpressionContainer with direct JSXElement
      ],
      invalid: [],
    });
  });

  describe('Component composition', () => {
    ruleTester.run('component composition', jsxMaxDepth, {
      valid: [
        // Components within depth limit
        {
          code: `
            const el = (
              <Container>
                <Header>
                  <Logo />
                </Header>
              </Container>
            );
          `,
        },
        // Mix of HTML and components
        {
          code: `
            const el = (
              <div>
                <CustomComponent>
                  <span>Content</span>
                </CustomComponent>
              </div>
            );
          `,
        },
      ],
      invalid: [
        // Deep component composition - reports on each element exceeding depth
        {
          code: `
            const el = (
              <App>
                <Layout>
                  <Main>
                    <Section>
                      <Card>
                        <Content>
                          <Text>Too deep</Text>
                        </Content>
                      </Card>
                    </Section>
                  </Main>
                </Layout>
              </App>
            );
          `,
          options: [{ max: 4 }],
          // Content and Text both exceed depth 4
          errors: [
            { messageId: 'jsxMaxDepth' },
            { messageId: 'jsxMaxDepth' },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', jsxMaxDepth, {
      valid: [
        // Self-closing elements
        {
          code: `
            const el = (
              <div>
                <img />
                <input />
                <br />
              </div>
            );
          `,
        },
        // Fragments
        {
          code: `
            const el = (
              <>
                <div>A</div>
                <div>B</div>
              </>
            );
          `,
        },
      ],
      invalid: [],
    });
  });
});

