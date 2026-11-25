# no-webpack-loader-syntax

<!-- end auto-generated rule header -->

Forbid webpack loader syntax in imports

## Rule Details

`import css from 'style!css!./app.css'` configures webpack's loaders inside the module specifier. The module then builds only under webpack, and the loader chain is hidden from the webpack config, where every other loader is declared. This rule reports a `!` in the specifier of every way a module is loaded or re-exported: `import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`.

Declare the loaders in `module.rules` of the webpack config instead, and import the plain path.

### ❌ Incorrect

```ts
import theme from 'style!css!./theme.css';
const find = require('-babel-loader!lodash.find');
```

### ✅ Correct

```ts
import theme from './theme.css';
const find = require('lodash.find');
```

## Options

This rule has no options.

## When Not To Use It

When the code is built only by webpack and inline loader configuration is the house style.
