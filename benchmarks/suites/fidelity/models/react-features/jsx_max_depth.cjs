const { tag, num } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

// A chain of `levels` nested elements; level 1 is spelled by `wrapper`.
function chain(levels, wrapper) {
  let inner = 'text';
  for (let k = levels - 1; k >= 0; k--) {
    if (k === 1 && wrapper === 'Fragment') {
      inner = `<>${inner}</>`;
    } else {
      const el = `<div>${inner}</div>`;
      if (k === 1 && wrapper === 'Logical') inner = `{flag && ${el}}`;
      else if (k === 1 && wrapper === 'Ternary')
        inner = `{flag ? ${el} : null}`;
      else inner = el;
    }
  }
  return inner;
}

module.exports = {
  rule: 'jsx-max-depth',
  domain: 7 * 4 * 2 + 2,
  traces: 600,
  filename: FILE,
  key: keyOf('levels', 'wrapper', 'max'),
  config: (s) => (tag(s.max) === 'Max2' ? { max: 2 } : undefined),
  code: (s) => program(chain(num(s.levels), tag(s.wrapper))),
};
