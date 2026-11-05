const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const BINDING = {
  DefaultImport: ["import React from 'react';"],
  NamespaceImport: ["import * as React from 'react';"],
  Require: ["const React = require('react');"],
  LocalVar: ['const React = (globalThis as any).preactCompat;'],
  NamedOnly: ["import { useState } from 'react';", 'void useState;'],
  TypeOnly: [
    "import type React from 'react';",
    'export type El = React.ReactNode;',
  ],
  NoBinding: [],
  OtherName: ["import R from 'react';", 'void R;'],
};
const JSX = {
  TopLevel: ['export const el = <div>Hello</div>;'],
  InComponent: ['export function App() {', '  return <div>Hello</div>;', '}'],
  Fragment: ['export function App() {', '  return <>Hello</>;', '}'],
  NoJsx: ['export function App() {', "  return 'Hello';", '}'],
};

module.exports = {
  rule: 'react-in-jsx-scope',
  domain: 8 * 4 * 2,
  traces: 600,
  filename: FILE,
  key: keyOf('binding', 'jsx', 'pragma'),
  code: (s) =>
    src(
      tag(s.pragma) === 'Automatic' ? ['/** @jsxRuntime automatic */'] : [],
      BINDING[tag(s.binding)],
      JSX[tag(s.jsx)],
    ),
};
