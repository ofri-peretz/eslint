/**
 * Comprehensive tests for jsx-key rule
 * Detect missing or incorrect React keys in JSX iterators
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxKey } from '../rules/react/jsx-key';

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
  rules: {
    // Enable JSX parsing
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
  },
});

describe('jsx-key', () => {
  describe('Array.map() iterations', () => {
    ruleTester.run('detect missing keys in map', jsxKey, {
      valid: [
        // Has key prop
        {
          code: 'items.map(item => <div key={item.id}>{item.name}</div>)',
        },
        // Has key with expression
        {
          code: 'items.map((item, index) => <Component key={`item-${index}`}>{item.name}</Component>)',
        },
        // Not in iterator context
        {
          code: '<div>No iterator here</div>',
        },
        // Single element (not in iterator)
        {
          code: 'const element = <div>Hello</div>;',
        },
      ],
      invalid: [
        // Missing key in map
        {
          code: 'items.map(item => <div>{item.name}</div>)',
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: 'items.map(item => <div key={item.id}>{item.name}</div>)',
                },
              ],
            },
          ],
        },
        // Missing key in map with component
        {
          code: 'items.map(item => <MyComponent>{item.name}</MyComponent>)',
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: 'items.map(item => <MyComponent key={item.id}>{item.name}</MyComponent>)',
                },
              ],
            },
          ],
        },
        // Multiple elements - only outer needs key
        {
          code: `
            items.map(item => (
              <div>
                <span>{item.name}</span>
                <button>{item.action}</button>
              </div>
            ))
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(item => (
              <div key={item.id}>
                <span>{item.name}</span>
                <button>{item.action}</button>
              </div>
            ))
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Unstable keys detection', () => {
    ruleTester.run('detect unstable keys', jsxKey, {
      valid: [
        // Stable keys
        {
          code: 'items.map(item => <div key={item.id}>{item.name}</div>)',
        },
        {
          code: 'items.map(item => <div key={item.key}>{item.name}</div>)',
        },
        // Index used as fallback (sometimes acceptable)
        {
          code: 'items.map((item, index) => <div key={item.id || index}>{item.name}</div>)',
        },
        // Unstable keys allowed when disabled
        {
          code: 'items.map((item, index) => <div key={index}>{item.name}</div>)',
          options: [{ warnUnstableKeys: false }],
        },
        {
          code: 'items.map((item, i) => <div key={i}>{item.name}</div>)',
          options: [{ warnUnstableKeys: false }],
        },
        {
          code: 'items.map((item, idx) => <div key={idx}>{item.name}</div>)',
          options: [{ warnUnstableKeys: false }],
        },
        {
          code: 'items.map((item, key) => <div key={key}>{item.name}</div>)',
          options: [{ warnUnstableKeys: false }],
        },
      ],
      invalid: [
        // Using index variable as key (when warnUnstableKeys is enabled)
        {
          code: 'items.map((item, index) => <div key={index}>{item.name}</div>)',
          options: [{ warnUnstableKeys: true }],
          errors: [{ messageId: 'unstableKey' }],
        },
        // Using common index names
        {
          code: 'items.map((item, i) => <div key={i}>{item.name}</div>)',
          options: [{ warnUnstableKeys: true }],
          errors: [{ messageId: 'unstableKey' }],
        },
        {
          code: 'items.map((item, idx) => <div key={idx}>{item.name}</div>)',
          options: [{ warnUnstableKeys: true }],
          errors: [{ messageId: 'unstableKey' }],
        },
        {
          code: 'items.map((item, key) => <div key={key}>{item.name}</div>)',
          options: [{ warnUnstableKeys: true }],
          errors: [{ messageId: 'unstableKey' }],
        },
      ],
    });
  });

  describe('Configuration options', () => {
    ruleTester.run('respect configuration options', jsxKey, {
      valid: [
        // Unstable keys allowed when disabled
        {
          code: 'items.map((item, index) => <div key={index}>{item.name}</div>)',
          options: [{ warnUnstableKeys: false }],
        },
      ],
      invalid: [
        // Unstable keys flagged when enabled (default)
        {
          code: 'items.map((item, index) => <div key={index}>{item.name}</div>)',
          options: [{ warnUnstableKeys: true }],
          errors: [{ messageId: 'unstableKey' }],
        },
      ],
    });
  });

  describe('Complex JSX structures', () => {
    ruleTester.run('handle complex JSX structures', jsxKey, {
      valid: [
        // Fragment with key
        {
          code: 'items.map(item => <React.Fragment key={item.id}>{item.name}</React.Fragment>)',
        },
        // Nested structures with proper keys on outer element
        {
          code: `
            items.map(item => (
              <div key={item.id}>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
            ))
          `,
        },
      ],
      invalid: [
        // Fragment without key
        {
          code: 'items.map(item => <React.Fragment>{item.name}</React.Fragment>)',
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: 'items.map(item => <React.Fragment key={item.id}>{item.name}</React.Fragment>)',
                },
              ],
            },
          ],
        },
        // Complex nested structure without key
        {
          code: `
            items.map(item => (
              <div>
                <h2>{item.title}</h2>
                <ArticleContent content={item.content} />
              </div>
            ))
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(item => (
              <div key={item.id}>
                <h2>{item.title}</h2>
                <ArticleContent content={item.content} />
              </div>
            ))
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript JSX', jsxKey, {
      valid: [
        // TypeScript with proper keys
        {
          code: 'items.map((item: Item) => <div key={item.id}>{item.name}</div>)',
          filename: '/src/component.tsx',
        },
        // Generic components
        {
          code: 'items.map(item => <MyComponent<Item> key={item.id} data={item} />)',
          filename: '/src/component.tsx',
        },
      ],
      invalid: [
        // TypeScript without keys
        {
          code: 'items.map((item: Item) => <div>{item.name}</div>)',
          filename: '/src/component.tsx',
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: 'items.map((item: Item) => <div key={item.id}>{item.name}</div>)',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Real-world patterns', () => {
    ruleTester.run('handle real-world React patterns', jsxKey, {
      valid: [
        // List rendering with proper keys
        {
          code: `
            function TodoList({ todos }) {
              return (
                <ul>
                  {todos.map(todo => (
                    <li key={todo.id}>
                      <span>{todo.text}</span>
                      <button>Delete</button>
                    </li>
                  ))}
                </ul>
              );
            }
          `,
        },
        // Conditional rendering in map
        {
          code: `
            items.map(item =>
              item.visible ? (
                <div key={item.id}>{item.name}</div>
              ) : null
            )
          `,
        },
        // Table rows
        {
          code: `
            users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
              </tr>
            ))
          `,
        },
        // Index key with unstable warning disabled
        {
          code: `
            posts.map((post, index) => (
              <article key={index}>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <time>{post.date}</time>
              </article>
            ))
          `,
          options: [{ warnUnstableKeys: false }],
        },
      ],
      invalid: [
        // Table without keys
        {
          code: `
            users.map(user => (
              <tr>
                <td>{user.name}</td>
                <td>{user.email}</td>
              </tr>
            ))
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
              </tr>
            ))
          `,
                },
              ],
            },
          ],
        },
        // Card grid without keys
        {
          code: `
            products.map(product => (
              <div className="card">
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <button>Add to cart</button>
              </div>
            ))
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            products.map(product => (
              <div key={product.id} className="card">
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <button>Add to cart</button>
              </div>
            ))
          `,
                },
              ],
            },
          ],
        },
        // Form inputs without keys
        {
          code: `
            fields.map(field => (
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={field.value}
              />
            ))
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            fields.map(field => (
              <input key={field.id}
                type={field.type}
                placeholder={field.placeholder}
                value={field.value}
              />
            ))
          `,
                },
              ],
            },
          ],
        },
        // Mixed content with unstable keys (warning enabled by default)
        {
          code: `
            posts.map((post, index) => (
              <article key={index}>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <time>{post.date}</time>
              </article>
            ))
          `,
          errors: [{ messageId: 'unstableKey' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', jsxKey, {
      valid: [
        // Not in map context
        {
          code: `
            function Component() {
              return <div>Hello</div>;
            }
          `,
        },
        // Map without JSX return
        {
          code: 'const ids = items.map(item => item.id);',
        },
        // Filter before map
        {
          code: 'items.filter(item => item.active).map(item => <div key={item.id}>{item.name}</div>)',
        },
        // Nested JSX element (not direct return from iterator)
        {
          code: `
            items.map(item => (
              <div key={item.id}>
                <span>{item.name}</span>
              </div>
            ))
          `,
        },
        // JSXFragment parent - nested elements don't need keys
        {
          code: `
            items.map(item => (
              <>
                <div key={item.id}>{item.name}</div>
              </>
            ))
          `,
        },
      ],
      invalid: [
        // Map in component return - should be detected
        {
          code: `
            const Component = () => {
              return items.map(item => <div>{item.name}</div>);
            };
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            const Component = () => {
              return items.map(item => <div key={item.id}>{item.name}</div>);
            };
          `,
                },
              ],
            },
          ],
        },
        // Nested maps - inner map needs key
        {
          code: `
            categories.map(category => (
              <div key={category.id}>
                <h2>{category.name}</h2>
                {category.items.map(item => (
                  <div>{item.name}</div>
                ))}
              </div>
            ))
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            categories.map(category => (
              <div key={category.id}>
                <h2>{category.name}</h2>
                {category.items.map(item => (
                  <div key={item.id}>{item.name}</div>
                ))}
              </div>
            ))
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Function expression callbacks', () => {
    ruleTester.run('handle function expressions in iterators', jsxKey, {
      valid: [
        // Function expression with key
        {
          code: `items.map(function(item) { return <div key={item.id}>{item.name}</div>; })`,
        },
        // Function expression with block body and key
        {
          code: `
            items.map(function(item) {
              const name = item.name.toUpperCase();
              return <div key={item.id}>{name}</div>;
            })
          `,
        },
      ],
      invalid: [
        // Function expression without key
        {
          code: `items.map(function(item) { return <div>{item.name}</div>; })`,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `items.map(function(item) { return <div key={item.id}>{item.name}</div>; })`,
                },
              ],
            },
          ],
        },
        // Function expression with block body without key
        {
          code: `
            items.map(function(item) {
              const name = item.name.toUpperCase();
              return <div>{name}</div>;
            })
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(function(item) {
              const name = item.name.toUpperCase();
              return <div key={item.id}>{name}</div>;
            })
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Conditional expressions in iterators', () => {
    ruleTester.run('handle conditional expressions', jsxKey, {
      valid: [
        // Conditional expression with key on both branches
        {
          code: `
            items.map(item =>
              item.visible ? (
                <div key={item.id}>{item.name}</div>
              ) : (
                <span key={item.id}>Hidden</span>
              )
            )
          `,
        },
        // Conditional with null
        {
          code: `
            items.map(item =>
              item.active ? <div key={item.id}>{item.name}</div> : null
            )
          `,
        },
      ],
      invalid: [
        // Conditional without key on truthy branch
        {
          code: `
            items.map(item =>
              item.visible ? <div>{item.name}</div> : null
            )
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(item =>
              item.visible ? <div key={item.id}>{item.name}</div> : null
            )
          `,
                },
              ],
            },
          ],
        },
        // Conditional without key on both branches
        {
          code: `
            items.map(item =>
              item.visible ? <div>{item.name}</div> : <span>Hidden</span>
            )
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(item =>
              item.visible ? <div key={item.id}>{item.name}</div> : <span>Hidden</span>
            )
          `,
                },
              ],
            },
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(item =>
              item.visible ? <div>{item.name}</div> : <span key={item.id}>Hidden</span>
            )
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Logical expressions in iterators', () => {
    ruleTester.run('handle logical expressions', jsxKey, {
      valid: [
        // Logical AND with key
        {
          code: `
            items.map(item =>
              item.active && <div key={item.id}>{item.name}</div>
            )
          `,
        },
        // Logical OR with key
        {
          code: `
            items.map(item =>
              item.component || <div key={item.id}>Fallback</div>
            )
          `,
        },
      ],
      invalid: [
        // Logical AND without key
        {
          code: `
            items.map(item =>
              item.active && <div>{item.name}</div>
            )
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(item =>
              item.active && <div key={item.id}>{item.name}</div>
            )
          `,
                },
              ],
            },
          ],
        },
        // Logical OR without key
        {
          code: `
            items.map(item =>
              item.component || <div>Fallback</div>
            )
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(item =>
              item.component || <div key={item.id}>Fallback</div>
            )
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('forEach iterations', () => {
    ruleTester.run('handle forEach iterations', jsxKey, {
      valid: [
        // forEach with key (even though forEach doesn't return)
        {
          code: `items.forEach(item => <div key={item.id}>{item.name}</div>)`,
        },
      ],
      invalid: [
        // forEach without key
        {
          code: `items.forEach(item => <div>{item.name}</div>)`,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `items.forEach(item => <div key={item.id}>{item.name}</div>)`,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Arrow function with block body', () => {
    ruleTester.run('handle arrow functions with block body', jsxKey, {
      valid: [
        // Arrow function with block body and return
        {
          code: `
            items.map(item => {
              const processedName = item.name.toUpperCase();
              return <div key={item.id}>{processedName}</div>;
            })
          `,
        },
      ],
      invalid: [
        // Arrow function with block body without key
        {
          code: `
            items.map(item => {
              const processedName = item.name.toUpperCase();
              return <div>{processedName}</div>;
            })
          `,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: `
            items.map(item => {
              const processedName = item.name.toUpperCase();
              return <div key={item.id}>{processedName}</div>;
            })
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Destructured parameters', () => {
    ruleTester.run('handle destructured parameters', jsxKey, {
      valid: [
        // Destructured param with key
        {
          code: `items.map(({ id, name }) => <div key={id}>{name}</div>)`,
        },
      ],
      invalid: [
        // Destructured param without key - uses fallback 'item' in suggestion
        {
          code: `items.map(({ id, name }) => <div>{name}</div>)`,
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  // Since param is destructured, fallback is 'item'
                  output: `items.map(({ id, name }) => <div key={item.id}>{name}</div>)`,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestion capabilities', () => {
    ruleTester.run('provide helpful suggestions', jsxKey, {
      valid: [],
      invalid: [
        // Missing key suggestions
        {
          code: 'items.map(item => <div>{item.name}</div>)',
          errors: [
            {
              messageId: 'missingKey',
              suggestions: [
                {
                  messageId: 'suggestKey',
                  output: 'items.map(item => <div key={item.id}>{item.name}</div>)',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
