const { verifyOptionModel } = require('../../jwt.cjs');

module.exports = verifyOptionModel({
  rule: 'require-max-age',
  options: (v) =>
    v === 'Jose'
      ? {
          x: "maxTokenAge: '15m'",
          alt: 'maxTokenAge: 900',
          other: 'clockTolerance: 30',
        }
      : { x: "maxAge: '1h'", alt: 'maxAge: 3600', other: 'clockTolerance: 30' },
});
