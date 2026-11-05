/**
 * Shared JSX spellings for the react-a11y models (`models/react-a11y/`).
 *
 * Every input is a real React component in a `.tsx` file, so
 * `@typescript-eslint/parser` parses JSX (it enables JSX from the extension).
 * The component takes props the inputs use for dynamic values:
 *
 *   - `value`   an attribute value the rule cannot know statically
 *   - `flag`    a boolean for conditional values (`flag ? 'a' : 'b'`)
 *   - `handler` an event handler
 *   - `rest`    an object spread onto the element (`{...rest}`)
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */

/** The file every react-a11y model lints: `.tsx` turns on JSX parsing. */
const FILE = 'src/App.tsx';

const indent = (text, n) =>
  text
    .split('\n')
    .map((l) => (l ? ' '.repeat(n) + l : l))
    .join('\n');

/**
 * A module exporting one component that returns `jsx`. `pre` lines go at
 * module level before the component (imports, helper components).
 */
function program(jsx, { pre = [] } = {}) {
  return [
    ...pre,
    'export function App({ value, flag, handler, rest }: any) {',
    '  return (',
    indent(jsx, 4),
    '  );',
    '}',
    '',
  ].join('\n');
}

/**
 * How a JSX attribute value is written. `v` is the static string the value
 * stands for; `Dynamic` ignores it (the rule cannot know it).
 *
 *   - `Lit`      `"v"`
 *   - `Braced`   `{"v"}`
 *   - `Template` `{`v`}` (no expressions: still static)
 *   - `Cond`     `{flag ? "v" : "v"}` (both branches the same static value)
 *   - `Dynamic`  `{value}`
 */
const SPELL = {
  Lit: (v) => `"${v}"`,
  Braced: (v) => `{"${v}"}`,
  Template: (v) => `{\`${v}\`}`,
  Cond: (v) => `{flag ? "${v}" : "${v}"}`,
  Dynamic: () => '{value}',
};

/** `name=<value spelled as `spelling`>`. */
const attr = (name, v, spelling = 'Lit') => `${name}=${SPELL[spelling](v)}`;

/**
 * `<tag a b>children</tag>`, or self-closing when `children` is empty.
 * `attrs` is an array of already-spelled attributes (falsy entries dropped).
 */
function el(tag, attrs = [], children = '') {
  const a = attrs.filter(Boolean);
  const open = a.length ? `${tag} ${a.join(' ')}` : tag;
  return children ? `<${open}>${children}</${tag}>` : `<${open} />`;
}

module.exports = { FILE, program, SPELL, attr, el };
