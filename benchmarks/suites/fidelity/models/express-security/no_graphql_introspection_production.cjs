const { tag, withTestFile } = require('../../lib.cjs');

const VALUE = {
  IntroTrue: 'introspection: true,',
  IntroFalse: 'introspection: false,',
  EnvNotProd: "introspection: process.env.NODE_ENV !== 'production',",
  EnvIsDev: "introspection: process.env.NODE_ENV === 'development',",
  EnvIsProd: "introspection: process.env.NODE_ENV === 'production',",
  Absent: '',
  FromVariable: 'introspection: enableIntrospection,',
};
const IMPORT = {
  WithExpress: [
    "import express from 'express';",
    "import { ApolloServer } from 'apollo-server-express';",
  ],
  ApolloExpressOnly: ["import { ApolloServer } from 'apollo-server-express';"],
  ApolloServer4: [
    "import express from 'express';",
    "import { ApolloServer } from '@apollo/server';",
    "import { expressMiddleware } from '@apollo/server/express4';",
  ],
  Standalone: ["import { ApolloServer } from 'apollo-server';"],
  RenamedImport: [
    "import express from 'express';",
    "import { ApolloServer as GraphServer } from 'apollo-server-express';",
  ],
  RequireApollo: [
    "const express = require('express');",
    "const { ApolloServer } = require('apollo-server-express');",
  ],
};
const GUARD = {
  NoGuard: (l) => l,
  IfDev: (l) => [
    "if (process.env.NODE_ENV === 'development') {",
    ...l.map((x) => `  ${x}`),
    '}',
  ],
  IfProd: (l) => [
    "if (process.env.NODE_ENV === 'production') {",
    ...l.map((x) => `  ${x}`),
    '}',
  ],
};

const base = {
  rule: 'no-graphql-introspection-production',
  // Values 7; Imports 6 x 2; Guards 3 x 2.
  domain: 7 + 12 + 6,
  traces: 1200,
  key: (s) =>
    ['focus', 'value', 'imp', 'guard', 'allowDev']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({ allowInDevelopment: s.allowDev }),
  code: (s) => {
    const ctor =
      tag(s.imp) === 'RenamedImport' ? 'GraphServer' : 'ApolloServer';
    const make = [
      `const server = new ${ctor}({`,
      '  typeDefs,',
      '  resolvers,',
      `  ${VALUE[tag(s.value)]}`,
      '});',
      'server.start();',
    ];
    return [
      ...IMPORT[tag(s.imp)],
      "import { typeDefs, resolvers, enableIntrospection } from './schema';",
      ...GUARD[tag(s.guard)](make),
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
