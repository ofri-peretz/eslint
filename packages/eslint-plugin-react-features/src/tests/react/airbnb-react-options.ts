/**
 * The entries eslint-config-airbnb 19.0.4 (`rules/react.js`, tag
 * `eslint-config-airbnb-v19.0.4`) sets, as ESLint `[severity, ...options]`
 * tuples, for the six rules whose schemas used to reject them. Copied
 * verbatim; do not tidy.
 */
const sortComp = {
  order: [
    'static-variables',
    'static-methods',
    'instance-variables',
    'lifecycle',
    '/^handle.+$/',
    '/^on.+$/',
    'getters',
    'setters',
    '/^(get|set)(?!(InitialState$|DefaultProps$|ChildContext$)).+$/',
    'instance-methods',
    'everything-else',
    'rendering',
  ],
  groups: {
    lifecycle: [
      'displayName',
      'propTypes',
      'contextTypes',
      'childContextTypes',
      'mixins',
      'statics',
      'defaultProps',
      'constructor',
      'getDefaultProps',
      'getInitialState',
      'state',
      'getChildContext',
      'getDerivedStateFromProps',
      'componentWillMount',
      'UNSAFE_componentWillMount',
      'componentDidMount',
      'componentWillReceiveProps',
      'UNSAFE_componentWillReceiveProps',
      'shouldComponentUpdate',
      'componentWillUpdate',
      'UNSAFE_componentWillUpdate',
      'getSnapshotBeforeUpdate',
      'componentDidUpdate',
      'componentDidCatch',
      'componentWillUnmount',
    ],
    rendering: ['/^render.+$/', 'render'],
  },
};

/** Rule name (unprefixed) to the options after the severity. */
export const AIRBNB_OPTIONS = {
  'jsx-no-bind': [
    {
      ignoreRefs: true,
      allowArrowFunctions: true,
      allowFunctions: false,
      allowBind: false,
      ignoreDOMComponents: true,
    },
  ],
  'prefer-es6-class': ['always'],
  'default-props-match-prop-types': [{ allowRequiredDefaults: false }],
  'state-in-constructor': ['always'],
  'static-property-placement': ['property assignment'],
  'sort-comp': [sortComp],
} as const;
