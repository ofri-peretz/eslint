// Renders one state of models/prisma-security.no-unsafe-query.qnt into a program.
// The renderer only spells the shape; the verdict comes from the model.
import { renderValues } from './_sql.mjs';

export const plugin = 'prisma-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'source',
  'transform',
  'position',
  'binding',
  'sink',
];

const SPEC = {
  setup:
    "import { PrismaClient } from '@prisma/client';\nconst prisma = new PrismaClient();",
  sinks: {
    QueryRawUnsafe: {
      kind: 'statement',
      call: (q) => `prisma.$queryRawUnsafe(${q})`,
    },
    ExecuteRawUnsafe: {
      kind: 'statement',
      call: (q) => `prisma.$executeRawUnsafe(${q})`,
    },
    TaggedQueryRaw: {
      kind: 'statement',
      tagged: true,
      call: (q) => `prisma.$queryRaw${q}`,
    },
  },
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export const render = (c) => renderValues(SPEC, c);
