/**
 * Comprehensive tests for require-optimization rule
 * Require performance optimizations for React components
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireOptimization } from '../../rules/react/require-optimization';

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

describe('require-optimization', () => {
  describe('React.memo suggestions', () => {
    ruleTester.run('suggest React.memo for components with many props', requireOptimization, {
      valid: [
        // Already memoized
        {
          code: 'const Component = React.memo((props) => <div>{props.name}</div>);',
        },
        // Few props (under threshold)
        {
          code: 'const Button = ({ children }) => <button>{children}</button>;',
          options: [{ minPropsForMemo: 3 }],
        },
        // Class components (different optimization)
        {
          code: 'class Component extends React.Component { render() { return <div />; } }',
        },
        // Non-React components
        {
          code: 'function utilityFunction() { return "hello"; }',
        },
      ],
      invalid: [
        // Many props - should suggest memo
        {
          code: `
            const UserCard = ({ name, age, email, avatar, onClick, onEdit }) => (
              <div onClick={onClick}>
                <img src={avatar} alt={name} />
                <h2>{name}</h2>
                <p>{email}</p>
                <span>{age} years old</span>
                <button onClick={onEdit}>Edit</button>
              </div>
            );
          `,
          options: [{ minPropsForMemo: 3 }],
          errors: [
            {
              messageId: 'considerMemo',
              data: {
                componentName: 'UserCard',
                propsCount: 6,
                reason: 'receives 6 props and may re-render unnecessarily',
              },
            },
          ],
        },
        // Component with props usage
        {
          code: `
            const ProductList = ({ products, loading, error, onRefresh, onProductClick }) => {
              if (loading) return <div>Loading...</div>;
              if (error) return <div>Error: {error}</div>;

              return (
                <div>
                  <button onClick={onRefresh}>Refresh</button>
                  {products.map(product => (
                    <div key={product.id} onClick={() => onProductClick(product.id)}>
                      {product.name}
                    </div>
                  ))}
                </div>
              );
            };
          `,
          options: [{ minPropsForMemo: 3 }],
          errors: [
            {
              messageId: 'considerMemo',
              data: {
                componentName: 'ProductList',
                propsCount: 5,
                reason: 'receives 5 props and may re-render unnecessarily',
              },
            },
          ],
        },
      ],
    });
  });

  describe('useMemo suggestions', () => {
    ruleTester.run('suggest useMemo for expensive computations', requireOptimization, {
      valid: [
        // Already using useMemo
        {
          code: `
            const Component = () => {
              const expensiveValue = useMemo(() => computeExpensiveValue(), [deps]);
              return <div>{expensiveValue}</div>;
            };
          `,
        },
        // No expensive computations
        {
          code: 'const Component = () => <div>Hello</div>;',
        },
        // Class components (different pattern)
        {
          code: 'class Component extends React.Component { render() { return <div />; } }',
        },
      ],
      invalid: [
        // Array operations
        {
          code: `
            const TodoList = ({ todos }) => {
              const completedTodos = todos.filter(todo => todo.completed);
              const pendingTodos = todos.filter(todo => !todo.completed);
              const totalCount = todos.length;

              return (
                <div>
                  <h2>Total: {totalCount}</h2>
                  <h3>Completed: {completedTodos.length}</h3>
                  <ul>
                    {pendingTodos.map(todo => <li key={todo.id}>{todo.text}</li>)}
                  </ul>
                </div>
              );
            };
          `,
          errors: [
            {
              messageId: 'considerUseMemo',
              data: {
                componentName: 'TodoList',
                reason: 'contains array operations that could be expensive',
              },
            },
          ],
        },
        // Complex computations
        {
          code: `
            const DataTable = ({ data }) => {
              const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
              const groupedData = sortedData.reduce((groups, item) => {
                const key = item.category;
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
                return groups;
              }, {});

              return (
                <div>
                  {Object.entries(groupedData).map(([category, items]) => (
                    <div key={category}>
                      <h3>{category}</h3>
                      {items.map(item => <div key={item.id}>{item.name}</div>)}
                    </div>
                  ))}
                </div>
              );
            };
          `,
          errors: [
            {
              messageId: 'considerUseMemo',
              data: {
                componentName: 'DataTable',
                reason: 'contains array operations that could be expensive',
              },
            },
          ],
        },
      ],
    });
  });

  describe('useCallback suggestions', () => {
    ruleTester.run('suggest useCallback for inline event handlers', requireOptimization, {
      valid: [
        // Already using useCallback
        {
          code: `
            const Component = () => {
              const handleClick = useCallback(() => setCount(c => c + 1), []);
              return <button onClick={handleClick}>Click</button>;
            };
          `,
        },
        // No event handlers
        {
          code: 'const Component = () => <div>Static content</div>;',
        },
        // Event handlers from props (not inline)
        {
          code: 'const Component = ({ onClick }) => <button onClick={onClick}>Click</button>;',
        },
      ],
      invalid: [
        // Inline arrow function event handler
        {
          code: `
            const Counter = ({ initialValue }) => {
              const [count, setCount] = useState(initialValue);
              return (
                <div>
                  <span>{count}</span>
                  <button onClick={() => setCount(count + 1)}>+</button>
                  <button onClick={() => setCount(count - 1)}>-</button>
                </div>
              );
            };
          `,
          errors: [
            {
              messageId: 'considerUseCallback',
              data: {
                componentName: 'Counter',
                reason: 'has inline event handlers that create new functions on each render',
              },
            },
          ],
        },
        // Inline function expression event handler
        {
          code: `
            const Form = ({ onSubmit }) => {
              const [value, setValue] = useState('');

              return (
                <form onSubmit={function(e) {
                  e.preventDefault();
                  onSubmit(value);
                }}>
                  <input value={value} onChange={e => setValue(e.target.value)} />
                  <button type="submit">Submit</button>
                </form>
              );
            };
          `,
          errors: [
            {
              messageId: 'considerUseCallback',
              data: {
                componentName: 'Form',
                reason: 'has inline event handlers that create new functions on each render',
              },
            },
          ],
        },
      ],
    });
  });

  describe('PureComponent suggestions', () => {
    ruleTester.run('suggest PureComponent for class components', requireOptimization, {
      valid: [
        // Already PureComponent
        {
          code: 'class Component extends React.PureComponent { render() { return <div />; } }',
        },
        // Functional component (different optimization)
        {
          code: 'const Component = () => <div />;',
        },
        // Not a React component
        {
          code: 'class Utility { method() {} }',
        },
      ],
      invalid: [
        // Class component with many props usage
        {
          code: `
            class UserProfile extends React.Component {
              render() {
                const { name, email, avatar, settings, onUpdate, onDelete } = this.props;
                return (
                  <div>
                    <img src={avatar} alt={name} />
                    <h1>{name}</h1>
                    <p>{email}</p>
                    <button onClick={() => onUpdate(settings)}>Update</button>
                    <button onClick={onDelete}>Delete</button>
                  </div>
                );
              }
            }
          `,
          errors: [
            {
              messageId: 'considerPureComponent',
              data: {
                componentName: 'UserProfile',
                reason: 'has 6 props and may benefit from shallow comparison',
              },
            },
          ],
        },
        // Class component with expensive computations
        {
          code: `
            class DataTable extends React.Component {
              render() {
                const filteredData = this.props.data.filter(item => item.active);
                const sortedData = filteredData.sort((a, b) => a.name.localeCompare(b.name));

                return (
                  <table>
                    {sortedData.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.value}</td>
                      </tr>
                    ))}
                  </table>
                );
              }
            }
          `,
          errors: [
            {
              messageId: 'considerPureComponent',
              data: {
                componentName: 'DataTable',
                reason: 'contains expensive computations',
              },
            },
          ],
        },
      ],
    });
  });

  describe('React.lazy suggestions', () => {
    ruleTester.run('suggest React.lazy for large components', requireOptimization, {
      valid: [
        // Small component
        {
          code: 'const Button = ({ children }) => <button>{children}</button>;',
        },
        // Already lazy
        {
          code: 'const LazyComponent = React.lazy(() => import("./Component"));',
        },
      ],
      invalid: [
        // Large component (simulated with many lines)
        {
          code: `
            const LargeDashboard = ({ user, data, settings, onRefresh, onExport, onSettingsChange }) => {
              const [activeTab, setActiveTab] = useState('overview');
              const [filters, setFilters] = useState({});

              const processedData = useMemo(() => {
                return data.filter(item => {
                  return Object.entries(filters).every(([key, value]) => {
                    return item[key]?.toLowerCase().includes(value.toLowerCase());
                  });
                });
              }, [data, filters]);

              const stats = useMemo(() => {
                return {
                  total: processedData.length,
                  active: processedData.filter(item => item.status === 'active').length,
                  completed: processedData.filter(item => item.status === 'completed').length,
                  pending: processedData.filter(item => item.status === 'pending').length,
                };
              }, [processedData]);

              const handleTabChange = useCallback((tab) => {
                setActiveTab(tab);
              }, []);

              const handleFilterChange = useCallback((newFilters) => {
                setFilters(newFilters);
              }, []);

              const handleRefresh = useCallback(() => {
                onRefresh();
              }, [onRefresh]);

              const handleExport = useCallback(() => {
                const csvData = processedData.map(item => ({
                  id: item.id,
                  name: item.name,
                  status: item.status,
                  createdAt: item.createdAt,
                }));
                // Export logic would go here
                console.log('Exporting:', csvData);
              }, [processedData]);

              return (
                <div className="dashboard">
                  <header>
                    <h1>Welcome, {user.name}!</h1>
                    <div className="actions">
                      <button onClick={handleRefresh}>Refresh</button>
                      <button onClick={handleExport}>Export</button>
                      <button onClick={() => onSettingsChange(settings)}>Settings</button>
                    </div>
                  </header>

                  <nav>
                    <button onClick={() => handleTabChange('overview')} className={activeTab === 'overview' ? 'active' : ''}>
                      Overview
                    </button>
                    <button onClick={() => handleTabChange('details')} className={activeTab === 'details' ? 'active' : ''}>
                      Details
                    </button>
                    <button onClick={() => handleTabChange('analytics')} className={activeTab === 'analytics' ? 'active' : ''}>
                      Analytics
                    </button>
                  </nav>

                  <main>
                    {activeTab === 'overview' && (
                      <div className="overview">
                        <div className="stats-grid">
                          <div className="stat-card">
                            <h3>Total Items</h3>
                            <span className="stat-value">{stats.total}</span>
                          </div>
                          <div className="stat-card">
                            <h3>Active</h3>
                            <span className="stat-value">{stats.active}</span>
                          </div>
                          <div className="stat-card">
                            <h3>Completed</h3>
                            <span className="stat-value">{stats.completed}</span>
                          </div>
                          <div className="stat-card">
                            <h3>Pending</h3>
                            <span className="stat-value">{stats.pending}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'details' && (
                      <div className="details">
                        <div className="filters">
                          <input
                            type="text"
                            placeholder="Search..."
                            onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
                          />
                          <select onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}>
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                          </select>
                        </div>

                        <div className="data-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processedData.map(item => (
                                <tr key={item.id}>
                                  <td>{item.name}</td>
                                  <td>
                                    <span className={\`status status-\${item.status}\`}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                                  <td>
                                    <button onClick={() => console.log('Edit', item.id)}>Edit</button>
                                    <button onClick={() => console.log('Delete', item.id)}>Delete</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeTab === 'analytics' && (
                      <div className="analytics">
                        <div className="chart-placeholder">
                          <p>Analytics charts would go here</p>
                          <p>This component is quite large and would benefit from code splitting</p>
                        </div>
                      </div>
                    )}
                  </main>
                </div>
              );
            };
          `,
          errors: [
            {
              messageId: 'considerMemo',
              data: {
                componentName: 'LargeDashboard',
                propsCount: 6,
                reason: 'receives 6 props and may re-render unnecessarily',
              },
            },
            {
              messageId: 'considerUseCallback',
              data: {
                componentName: 'LargeDashboard',
                reason: 'has inline event handlers that create new functions on each render',
              },
            },
            {
              messageId: 'considerLazy',
              data: {
                componentName: 'LargeDashboard',
                linesOfCode: 150,
                reason: 'component has 150 lines and may benefit from code splitting',
              },
            },
          ],
        },
      ],
    });
  });


  describe('Multiple optimizations needed', () => {
    ruleTester.run('suggest multiple optimizations when needed', requireOptimization, {
      valid: [],
      invalid: [
        // Component needing all optimizations
        {
          code: `
            const ComplexComponent = ({ data, onItemClick, onRefresh, filter, sortBy }) => {
              const filteredData = data.filter(item =>
                filter ? item.name.includes(filter) : true
              );

              const sortedData = [...filteredData].sort((a, b) => {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
                return 0;
              });

              const handleItemClick = (item) => {
                onItemClick(item.id);
              };

              const handleRefresh = () => {
                onRefresh();
              };

              return (
                <div>
                  <button onClick={handleRefresh}>Refresh</button>
                  <ul>
                    {sortedData.map(item => (
                      <li key={item.id} onClick={() => handleItemClick(item)}>
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            };
          `,
          errors: [
            {
              messageId: 'considerMemo',
              data: {
                componentName: 'ComplexComponent',
                propsCount: 5,
                reason: 'receives 5 props and may re-render unnecessarily',
              },
            },
            {
              messageId: 'considerUseMemo',
              data: {
                componentName: 'ComplexComponent',
                reason: 'contains array operations that could be expensive',
              },
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', requireOptimization, {
      valid: [
        // TypeScript component with proper typing
        {
          code: `
            interface Props {
              name: string;
              onClick: () => void;
            }
            const Button: React.FC<Props> = ({ name, onClick }) => (
              <button onClick={onClick}>{name}</button>
            );
          `,
        },
      ],
      invalid: [
        // TypeScript component needing optimization
        {
          code: `
            interface TodoListProps {
              todos: Todo[];
              onToggle: (id: string) => void;
              onDelete: (id: string) => void;
              filter: string;
            }

            const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, onDelete, filter }) => {
              const filteredTodos = todos.filter(todo =>
                todo.text.toLowerCase().includes(filter.toLowerCase())
              );

              return (
                <ul>
                  {filteredTodos.map(todo => (
                    <li key={todo.id}>
                      <span>{todo.text}</span>
                      <button onClick={() => onToggle(todo.id)}>Toggle</button>
                      <button onClick={() => onDelete(todo.id)}>Delete</button>
                    </li>
                  ))}
                </ul>
              );
            };
          `,
          errors: [
            {
              messageId: 'considerMemo',
              data: {
                componentName: 'TodoList',
                propsCount: 4,
                reason: 'receives 4 props and may re-render unnecessarily',
              },
            },
            {
              messageId: 'considerUseMemo',
              data: {
                componentName: 'TodoList',
                reason: 'contains array operations that could be expensive',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', requireOptimization, {
      valid: [
        // Non-component functions
        {
          code: 'function utility() { return data.map(item => item * 2); }',
        },
        // Anonymous components
        {
          code: 'export default () => <div>Anonymous</div>;',
        },
        // Components with few props
        {
          code: 'const Link = ({ href, children }) => <a href={href}>{children}</a>;',
          options: [{ minPropsForMemo: 5 }],
        },
      ],
      invalid: [
        // Component with exactly threshold props
        {
          code: 'const Component = ({ a, b, c }) => <div>{a + b + c}</div>;',
          options: [{ minPropsForMemo: 3 }],
          errors: [
            {
              messageId: 'considerMemo',
              data: {
                componentName: 'Component',
                propsCount: 3,
                reason: 'receives 3 props and may re-render unnecessarily',
              },
            },
          ],
        },
      ],
    });
  });
});
