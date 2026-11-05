const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const KIND = {
  NsReact: ["import * as React from 'react';", 'React.useState'],
  NsLocal: ["import * as utils from './utils';", 'utils.format'],
  NsType: ["import type * as T from './types';", 'null as unknown as T.Props'],
  Named: ["import { useState } from 'react';", 'useState'],
  Default: ["import React from 'react';", 'React.useState'],
  ExportNs: ["export * as utils from './utils';", 'null'],
};

module.exports = {
  rule: 'no-namespace',
  domain: 6,
  traces: 100,
  filename: FILE,
  key: keyOf('kind'),
  code: (s) => {
    const [line, use] = KIND[tag(s.kind)];
    return src(line, `export const value = ${use};`);
  },
};
