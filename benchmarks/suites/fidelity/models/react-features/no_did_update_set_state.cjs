const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE } = require('../../react.cjs');
const { lifecycleCall } = require('../../react-b.cjs');

const METHOD = {
  DidMount: 'componentDidMount',
  DidUpdate: 'componentDidUpdate',
};

module.exports = {
  rule: 'no-did-update-set-state',
  // Named base: 5 places x 3 forms x 4 calls; 6 other bases: 5 places.
  domain: (5 * 3 * 4 + 6 * 5) * 2 * 2,
  traces: 7000,
  filename: FILE,
  key: keyOf('base', 'where', 'form', 'call', 'method', 'opt'),
  config: (s) =>
    tag(s.opt) === 'AllowInCallback' ? { allowInCallback: true } : undefined,
  code: (s) =>
    lifecycleCall(tag(s.base), METHOD[tag(s.method)], {
      where: tag(s.where),
      form: tag(s.form),
      call: tag(s.call),
    }),
};
