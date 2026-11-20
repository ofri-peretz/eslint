const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const JSX = {
  Element: '<div />',
  Fragment: '<></>',
  Nested: '<div><span /></div>',
};

module.exports = {
  rule: 'jsx-uses-react',
  domain: 3 * 2,
  traces: 300,
  filename: FILE,
  key: keyOf('shape', 'pragma'),
  code: (s) =>
    program(JSX[tag(s.shape)], {
      pre:
        tag(s.pragma) === 'JsxComment'
          ? ['/** @jsx h */', "import { h } from 'preact';"]
          : ["import React from 'react';"],
    }),
};
