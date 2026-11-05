/**
 * Class-component spellings shared by the fork-C react-features models
 * (`models/react-features/`). See `react.cjs` for the API spellings.
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */

/**
 * How a class names its superclass. Returns `{ pre, ext }`: import lines and
 * the `extends` clause (empty for a plain class).
 *
 *   - `Default`   `import React from 'react'`        `extends React.Component`
 *   - `Named`     `import { Component } from 'react'` `extends Component`
 *   - `Pure`      `import { PureComponent } ...`      `extends PureComponent`
 *   - `Renamed`   `import { Component as Base } ...`  `extends Base`
 *   - `Namespace` `import * as R from 'react'`        `extends R.Component`
 *   - `Foreign`   `import { Component } from 'lit'`  — not React
 *   - `NoSuper`   a plain class
 */
const SUPER = {
  Default: {
    pre: ["import React from 'react';"],
    ext: ' extends React.Component<any, any>',
  },
  Named: {
    pre: ["import { Component } from 'react';"],
    ext: ' extends Component<any, any>',
  },
  Pure: {
    pre: ["import { PureComponent } from 'react';"],
    ext: ' extends PureComponent<any, any>',
  },
  Renamed: {
    pre: ["import { Component as Base } from 'react';"],
    ext: ' extends Base<any, any>',
  },
  Namespace: {
    pre: ["import * as R from 'react';"],
    ext: ' extends R.Component<any, any>',
  },
  Foreign: {
    pre: ["import { Component } from 'lit';"],
    ext: ' extends Component',
  },
  NoSuper: { pre: [], ext: '' },
};

/** Superclass spellings that make the class a React component. */
const REACT_SUPERS = ['Default', 'Named', 'Pure', 'Renamed', 'Namespace'];

module.exports = { SUPER, REACT_SUPERS };
