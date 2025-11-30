/**
 * Comprehensive tests for no-direct-mutation-state rule
 * Prevent direct mutation of this.state that breaks React reconciliation
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDirectMutationState } from '../rules/react/no-direct-mutation-state';

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

describe('no-direct-mutation-state', () => {
  describe('Basic state mutation detection', () => {
    ruleTester.run('detect direct state assignments', noDirectMutationState, {
      valid: [
        // Not in class component
        {
          code: 'this.state.count = 5;',
        },
        // Functional component (no this.state)
        {
          code: 'function Component() { const [count, setCount] = useState(0); }',
        },
        // Proper setState usage
        {
          code: `
            class Component extends React.Component {
              increment() {
                this.setState({ count: this.state.count + 1 });
              }
            }
          `,
        },
        // Functional setState
        {
          code: `
            class Component extends React.Component {
              increment() {
                this.setState(prevState => ({ count: prevState.count + 1 }));
              }
            }
          `,
        },
      ],
      invalid: [
        // Direct assignment to state property
        {
          code: `
            class Component extends React.Component {
              increment() {
                this.state.count = 5;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              increment() {
                // TODO: Use setState instead of direct mutation
                this.state.count = 5;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              increment() {
                // TODO: Use functional setState for immutable updates
                this.state.count = 5;
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Direct assignment with complex expression
        {
          code: `
            class Component extends React.Component {
              update() {
                this.state.data = { ...this.state.data, updated: true };
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              update() {
                // TODO: Use setState instead of direct mutation
                this.state.data = { ...this.state.data, updated: true };
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              update() {
                // TODO: Use functional setState for immutable updates
                this.state.data = { ...this.state.data, updated: true };
              }
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

  describe('State mutation methods', () => {
    ruleTester.run('detect mutating array methods', noDirectMutationState, {
      valid: [
        // Non-mutating methods
        {
          code: `
            class Component extends React.Component {
              getItems() {
                return this.state.items.map(item => item * 2);
              }
            }
          `,
        },
        // Proper immutable updates
        {
          code: `
            class Component extends React.Component {
              addItem(item) {
                this.setState({
                  items: [...this.state.items, item]
                });
              }
            }
          `,
        },
      ],
      invalid: [
        // Array push
        {
          code: `
            class Component extends React.Component {
              addItem(item) {
                this.state.items.push(item);
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (push)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              addItem(item) {
                // TODO: Use setState instead of direct mutation
                this.state.items.push(item);
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              addItem(item) {
                // TODO: Use functional setState for immutable updates
                this.state.items.push(item);
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Array pop
        {
          code: `
            class Component extends React.Component {
              removeItem() {
                this.state.items.pop();
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (pop)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              removeItem() {
                // TODO: Use setState instead of direct mutation
                this.state.items.pop();
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              removeItem() {
                // TODO: Use functional setState for immutable updates
                this.state.items.pop();
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Array splice
        {
          code: `
            class Component extends React.Component {
              removeItem(index) {
                this.state.items.splice(index, 1);
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (splice)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              removeItem(index) {
                // TODO: Use setState instead of direct mutation
                this.state.items.splice(index, 1);
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              removeItem(index) {
                // TODO: Use functional setState for immutable updates
                this.state.items.splice(index, 1);
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Array sort
        {
          code: `
            class Component extends React.Component {
              sortItems() {
                this.state.items.sort();
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (sort)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              sortItems() {
                // TODO: Use setState instead of direct mutation
                this.state.items.sort();
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              sortItems() {
                // TODO: Use functional setState for immutable updates
                this.state.items.sort();
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Array reverse
        {
          code: `
            class Component extends React.Component {
              reverseItems() {
                this.state.items.reverse();
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (reverse)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              reverseItems() {
                // TODO: Use setState instead of direct mutation
                this.state.items.reverse();
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              reverseItems() {
                // TODO: Use functional setState for immutable updates
                this.state.items.reverse();
              }
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

  describe('Update expressions', () => {
    ruleTester.run('updateExpressions', noDirectMutationState, {
      valid: [
        // Using setState
        {
          code: `
            class Component extends React.Component {
              increment() {
                this.setState({ count: this.state.count + 1 });
              }
            }
          `,
        },
      ],
      invalid: [
        // Increment operator
        {
          code: `
            class Component extends React.Component {
              increment() {
                this.state.count++;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'update',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              increment() {
                // TODO: Use setState instead of direct mutation
                this.state.count++;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              increment() {
                // TODO: Use functional setState for immutable updates
                this.state.count++;
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Decrement operator
        {
          code: `
            class Component extends React.Component {
              decrement() {
                this.state.count--;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'update',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              decrement() {
                // TODO: Use setState instead of direct mutation
                this.state.count--;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              decrement() {
                // TODO: Use functional setState for immutable updates
                this.state.count--;
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Prefix increment
        {
          code: `
            class Component extends React.Component {
              increment() {
                ++this.state.count;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'update',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              increment() {
                // TODO: Use setState instead of direct mutation
                ++this.state.count;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              increment() {
                // TODO: Use functional setState for immutable updates
                ++this.state.count;
              }
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

  describe('Delete operator', () => {
    ruleTester.run('detect delete operations on state', noDirectMutationState, {
      valid: [
        // Proper state updates
        {
          code: `
            class Component extends React.Component {
              removeProperty() {
                const { prop, ...rest } = this.state;
                this.setState(rest);
              }
            }
          `,
        },
      ],
      invalid: [
        // Delete operator on state property
        {
          code: `
            class Component extends React.Component {
              removeProperty() {
                delete this.state.someProp;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'delete operator',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              removeProperty() {
                // TODO: Use setState instead of direct mutation
                delete this.state.someProp;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              removeProperty() {
                // TODO: Use functional setState for immutable updates
                delete this.state.someProp;
              }
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

  describe('Lifecycle methods', () => {
    ruleTester.run('lifecycle methods', noDirectMutationState, {
      valid: [
        // Direct mutation allowed in lifecycle methods
        {
          code: `
            class Component extends React.Component {
              componentDidMount() {
                this.state.initialized = true;
              }
            }
          `,
          options: [{ allowInLifecycleMethods: true }],
        },
        {
          code: `
            class Component extends React.Component {
              componentWillUpdate() {
                this.state.updating = true;
              }
            }
          `,
          options: [{ allowInLifecycleMethods: true }],
        },
      ],
      invalid: [
        // Direct mutation not allowed in lifecycle methods by default
        {
          code: `
            class Component extends React.Component {
              componentDidMount() {
                this.state.initialized = true;
              }
            }
          `,
          options: [{ allowInLifecycleMethods: false }],
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'lifecycle method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              componentDidMount() {
                // TODO: Use setState instead of direct mutation
                this.state.initialized = true;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              componentDidMount() {
                // TODO: Use functional setState for immutable updates
                this.state.initialized = true;
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Direct mutation in regular methods (not allowed even with lifecycle allowance)
        {
          code: `
            class Component extends React.Component {
              someMethod() {
                this.state.value = 42;
              }
            }
          `,
          options: [{ allowInLifecycleMethods: true }],
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              someMethod() {
                // TODO: Use setState instead of direct mutation
                this.state.value = 42;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              someMethod() {
                // TODO: Use functional setState for immutable updates
                this.state.value = 42;
              }
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

  describe('Component types', () => {
    ruleTester.run('different component types', noDirectMutationState, {
      valid: [
        // Functional component
        {
          code: `
            function Component() {
              const [count, setCount] = useState(0);
              count = 5; // This is fine in functional components
            }
          `,
        },
        // Not extending React.Component
        {
          code: `
            class MyClass {
              constructor() {
                this.state = {};
                this.state.value = 42; // Not a React component
              }
            }
          `,
        },
      ],
      invalid: [
        // React.Component extension
        {
          code: `
            class Component extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
                this.state.count = 5; // Direct mutation
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
                // TODO: Use setState instead of direct mutation
                this.state.count = 5; // Direct mutation
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
                // TODO: Use functional setState for immutable updates
                this.state.count = 5; // Direct mutation
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // PureComponent extension
        {
          code: `
            class Component extends React.PureComponent {
              update() {
                this.state.data.push('item');
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (push)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.PureComponent {
              update() {
                // TODO: Use setState instead of direct mutation
                this.state.data.push('item');
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.PureComponent {
              update() {
                // TODO: Use functional setState for immutable updates
                this.state.data.push('item');
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Component import and extension
        {
          code: `
            import { Component } from 'react';
            class MyComponent extends Component {
              method() {
                this.state.value++;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'update',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            import { Component } from 'react';
            class MyComponent extends Component {
              method() {
                // TODO: Use setState instead of direct mutation
                this.state.value++;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            import { Component } from 'react';
            class MyComponent extends Component {
              method() {
                // TODO: Use functional setState for immutable updates
                this.state.value++;
              }
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

  describe('Complex state mutations', () => {
    ruleTester.run('complex state structures', noDirectMutationState, {
      valid: [
        // Proper nested state updates
        {
          code: `
            class Component extends React.Component {
              updateNested() {
                this.setState({
                  user: {
                    ...this.state.user,
                    name: 'new name'
                  }
                });
              }
            }
          `,
        },
      ],
      invalid: [
        // Direct nested object mutation
        {
          code: `
            class Component extends React.Component {
              updateNested() {
                this.state.user.name = 'new name';
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              updateNested() {
                // TODO: Use setState instead of direct mutation
                this.state.user.name = 'new name';
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              updateNested() {
                // TODO: Use functional setState for immutable updates
                this.state.user.name = 'new name';
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Array element mutation
        {
          code: `
            class Component extends React.Component {
              updateArrayItem() {
                this.state.items[0].completed = true;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              updateArrayItem() {
                // TODO: Use setState instead of direct mutation
                this.state.items[0].completed = true;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              updateArrayItem() {
                // TODO: Use functional setState for immutable updates
                this.state.items[0].completed = true;
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Deep object mutation
        {
          code: `
            class Component extends React.Component {
              updateDeep() {
                this.state.config.database.host = 'localhost';
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              updateDeep() {
                // TODO: Use setState instead of direct mutation
                this.state.config.database.host = 'localhost';
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              updateDeep() {
                // TODO: Use functional setState for immutable updates
                this.state.config.database.host = 'localhost';
              }
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

  describe('Suggestion capabilities', () => {
    ruleTester.run('helpful suggestions', noDirectMutationState, {
      valid: [],
      invalid: [
        // Assignment suggestions
        {
          code: `
            class Component extends React.Component {
              update() {
                this.state.count = 5;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              update() {
                // TODO: Use setState instead of direct mutation
                this.state.count = 5;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              update() {
                // TODO: Use functional setState for immutable updates
                this.state.count = 5;
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Array method suggestions
        {
          code: `
            class Component extends React.Component {
              addItem(item) {
                this.state.items.push(item);
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (push)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              addItem(item) {
                // TODO: Use setState instead of direct mutation
                this.state.items.push(item);
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              addItem(item) {
                // TODO: Use functional setState for immutable updates
                this.state.items.push(item);
              }
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

  describe('TypeScript support', () => {
    ruleTester.run('TypeScript constructs', noDirectMutationState, {
      valid: [
        // TypeScript interfaces
        {
          code: `
            interface State {
              count: number;
            }
            class Component extends React.Component<{}, State> {
              update() {
                this.setState({ count: 5 });
              }
            }
          `,
        },
      ],
      invalid: [
        // TypeScript with state mutation
        {
          code: `
            interface State {
              count: number;
            }
            class Component extends React.Component<{}, State> {
              update() {
                this.state.count = 5;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            interface State {
              count: number;
            }
            class Component extends React.Component<{}, State> {
              update() {
                // TODO: Use setState instead of direct mutation
                this.state.count = 5;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            interface State {
              count: number;
            }
            class Component extends React.Component<{}, State> {
              update() {
                // TODO: Use functional setState for immutable updates
                this.state.count = 5;
              }
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

  describe('Real-world patterns', () => {
    ruleTester.run('real world React patterns', noDirectMutationState, {
      valid: [
        // Proper state management
        {
          code: `
            class Counter extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
              }

              increment() {
                this.setState(prevState => ({
                  count: prevState.count + 1
                }));
              }

              decrement() {
                this.setState({ count: this.state.count - 1 });
              }
            }
          `,
        },
        // Immutable array updates
        {
          code: `
            class TodoList extends React.Component {
              addTodo(text) {
                this.setState({
                  todos: [...this.state.todos, { text, id: Date.now() }]
                });
              }

              toggleTodo(id) {
                this.setState({
                  todos: this.state.todos.map(todo =>
                    todo.id === id ? { ...todo, completed: !todo.completed } : todo
                  )
                });
              }
            }
          `,
        },
      ],
      invalid: [
        // Common anti-patterns
        {
          code: `
            class Counter extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
              }

              increment() {
                this.state.count++;
              }

              decrement() {
                this.state.count--;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'update',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Counter extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
              }

              increment() {
                // TODO: Use setState instead of direct mutation
                this.state.count++;
              }

              decrement() {
                this.state.count--;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Counter extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
              }

              increment() {
                // TODO: Use functional setState for immutable updates
                this.state.count++;
              }

              decrement() {
                this.state.count--;
              }
            }
          `,
                },
              ],
            },
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'update',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Counter extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
              }

              increment() {
                this.state.count++;
              }

              decrement() {
                // TODO: Use setState instead of direct mutation
                this.state.count--;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Counter extends React.Component {
              constructor() {
                super();
                this.state = { count: 0 };
              }

              increment() {
                this.state.count++;
              }

              decrement() {
                // TODO: Use functional setState for immutable updates
                this.state.count--;
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Array manipulation anti-patterns
        {
          code: `
            class TodoList extends React.Component {
              addTodo(text) {
                this.state.todos.push({ text, id: Date.now() });
              }

              removeTodo(id) {
                const index = this.state.todos.findIndex(todo => todo.id === id);
                this.state.todos.splice(index, 1);
              }

              markAllComplete() {
                this.state.todos.forEach(todo => {
                  todo.completed = true;
                });
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (push)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class TodoList extends React.Component {
              addTodo(text) {
                // TODO: Use setState instead of direct mutation
                this.state.todos.push({ text, id: Date.now() });
              }

              removeTodo(id) {
                const index = this.state.todos.findIndex(todo => todo.id === id);
                this.state.todos.splice(index, 1);
              }

              markAllComplete() {
                this.state.todos.forEach(todo => {
                  todo.completed = true;
                });
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class TodoList extends React.Component {
              addTodo(text) {
                // TODO: Use functional setState for immutable updates
                this.state.todos.push({ text, id: Date.now() });
              }

              removeTodo(id) {
                const index = this.state.todos.findIndex(todo => todo.id === id);
                this.state.todos.splice(index, 1);
              }

              markAllComplete() {
                this.state.todos.forEach(todo => {
                  todo.completed = true;
                });
              }
            }
          `,
                },
              ],
            },
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (splice)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class TodoList extends React.Component {
              addTodo(text) {
                this.state.todos.push({ text, id: Date.now() });
              }

              removeTodo(id) {
                const index = this.state.todos.findIndex(todo => todo.id === id);
                // TODO: Use setState instead of direct mutation
                this.state.todos.splice(index, 1);
              }

              markAllComplete() {
                this.state.todos.forEach(todo => {
                  todo.completed = true;
                });
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class TodoList extends React.Component {
              addTodo(text) {
                this.state.todos.push({ text, id: Date.now() });
              }

              removeTodo(id) {
                const index = this.state.todos.findIndex(todo => todo.id === id);
                // TODO: Use functional setState for immutable updates
                this.state.todos.splice(index, 1);
              }

              markAllComplete() {
                this.state.todos.forEach(todo => {
                  todo.completed = true;
                });
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // Object mutation anti-patterns
        {
          code: `
            class UserProfile extends React.Component {
              updateName(newName) {
                this.state.user.name = newName;
              }

              updateSettings(settings) {
                Object.assign(this.state.settings, settings);
              }

              clearCache() {
                delete this.state.cache;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'assignment',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class UserProfile extends React.Component {
              updateName(newName) {
                // TODO: Use setState instead of direct mutation
                this.state.user.name = newName;
              }

              updateSettings(settings) {
                Object.assign(this.state.settings, settings);
              }

              clearCache() {
                delete this.state.cache;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class UserProfile extends React.Component {
              updateName(newName) {
                // TODO: Use functional setState for immutable updates
                this.state.user.name = newName;
              }

              updateSettings(settings) {
                Object.assign(this.state.settings, settings);
              }

              clearCache() {
                delete this.state.cache;
              }
            }
          `,
                },
              ],
            },
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'delete operator',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class UserProfile extends React.Component {
              updateName(newName) {
                this.state.user.name = newName;
              }

              updateSettings(settings) {
                Object.assign(this.state.settings, settings);
              }

              clearCache() {
                // TODO: Use setState instead of direct mutation
                delete this.state.cache;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class UserProfile extends React.Component {
              updateName(newName) {
                this.state.user.name = newName;
              }

              updateSettings(settings) {
                Object.assign(this.state.settings, settings);
              }

              clearCache() {
                // TODO: Use functional setState for immutable updates
                delete this.state.cache;
              }
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

  describe('Edge cases', () => {
    ruleTester.run('edge cases', noDirectMutationState, {
      valid: [
        // Not a React component
        {
          code: `
            class NotAComponent {
              constructor() {
                this.state = {};
                this.state.value = 42; // This is fine
              }
            }
          `,
        },
        // State-like properties that aren't React state
        {
          code: `
            class Component extends React.Component {
              constructor() {
                super();
                this.internalState = {};
                this.internalState.value = 42; // This is fine
              }
            }
          `,
        },
      ],
      invalid: [
        // Edge case with complex expressions
        {
          code: `
            class Component extends React.Component {
              update() {
                (this.state.items || []).push('item');
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'mutating method (push)',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              update() {
                // TODO: Use setState instead of direct mutation
                (this.state.items || []).push('item');
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              update() {
                // TODO: Use functional setState for immutable updates
                (this.state.items || []).push('item');
              }
            }
          `,
                },
              ],
            },
          ],
        },
        // State mutation in arrow function
        {
          code: `
            class Component extends React.Component {
              method = () => {
                this.state.count++;
              }
            }
          `,
          errors: [
            {
              messageId: 'noDirectMutationState',
              data: {
                mutationType: 'update',
                context: 'regular method',
              },
              suggestions: [
                {
                  messageId: 'suggestSetState',
                  output: `
            class Component extends React.Component {
              method = () => {
                // TODO: Use setState instead of direct mutation
                this.state.count++;
              }
            }
          `,
                },
                {
                  messageId: 'suggestFunctionalUpdate',
                  output: `
            class Component extends React.Component {
              method = () => {
                // TODO: Use functional setState for immutable updates
                this.state.count++;
              }
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
