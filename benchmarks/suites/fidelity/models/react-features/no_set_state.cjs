const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE } = require('../../react.cjs');
const { lifecycleCall } = require('../../react-b.cjs');

module.exports = {
  rule: 'no-set-state',
  // Named base: 4 places x 3 forms x 4 calls; 6 other bases: 4 places.
  domain: 4 * 3 * 4 + 6 * 4,
  traces: 2000,
  filename: FILE,
  key: keyOf('base', 'where', 'form', 'call'),
  code: (s) =>
    lifecycleCall(tag(s.base), 'handleClick', {
      where: tag(s.where),
      form: tag(s.form),
      call: tag(s.call),
    }),
};
