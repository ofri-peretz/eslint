// Model of eslint-plugin-prisma-security/no-raw-identifier-interpolation (CWE-89).
// `$queryRaw` / `$executeRaw` / `Prisma.sql` templates bind every hole as a
// VALUE. A hole where an identifier belongs (a table after FROM, an ORDER BY
// column, a sort direction, a quoted "${table}") cannot be bound, so the
// driver splices the string verbatim: reported unless the file proves the
// value fixed (a literal, a module constant, a ternary between literals) or
// the driver renders it (a nested `Prisma.sql`, `Prisma.join`, `Prisma.raw`
// over fixed text). `Prisma.raw(table)` splices and is still reported, and so
// is a query RESULT used as a table. Value positions (`= ${x}`, `LIMIT ${n}`)
// are the template's intended use and never reported. There is no import
// gate: `$queryRaw` is specific enough, and the client is usually re-exported
// from a local module (`import { prisma } from '@/lib/db'` or `'./db'`), so a
// file with no Prisma import at all is judged the same, including one whose
// handle is only declared `any` (`any` is no evidence the handle is NOT
// Prisma). The quoted tag
// `prisma['$queryRaw']` is the same tag.
module no_raw_identifier_interpolation {
  type Client = Named | Require | Default | Alias | Relative | AnyTyped
  type Tag = QueryRaw | ExecuteRaw | SqlTag | BracketTag
  type Hole =
    | TableParam | OrderByReq | DirParam | QuotedTable | RawParam | ResultTable
    | ValueReq | LimitParam | LiteralHole | ConstTable | DirTernary
    | RawConst | NestedSql | JoinIds

  pure def identifierHole(h: Hole): bool = match h {
    | TableParam => true
    | OrderByReq => true
    | DirParam => true
    | QuotedTable => true
    | RawParam => true
    | ResultTable => true
    | ValueReq => false
    | LimitParam => false
    | LiteralHole => false
    | ConstTable => false
    | DirTernary => false
    | RawConst => false
    | NestedSql => false
    | JoinIds => false
  }

  // The `Prisma.*` helpers (and the `Prisma.sql` tag) need the namespace, which
  // only an `@prisma/client` import supplies; `Relative` and `AnyTyped` files
  // have the client handle but no namespace.
  pure def hasNamespace(c: Client): bool = c != Relative and c != AnyTyped

  pure def usesNamespace(h: Hole): bool =
    h == RawParam or h == RawConst or h == NestedSql or h == JoinIds

  pure def applies(c: Client, t: Tag, h: Hole): bool =
    hasNamespace(c) or (t != SqlTag and not(usesNamespace(h)))

  pure def reports(c: Client, t: Tag, h: Hole): bool = identifierHole(h)

  var client: Client
  var tagSpelling: Tag
  var hole: Hole
  var verdict: bool

  action step = {
    nondet c = Set(Named, Require, Default, Alias, Relative, AnyTyped).oneOf()
    nondet t = Set(QueryRaw, ExecuteRaw, SqlTag, BracketTag).oneOf()
    nondet h = Set(
      TableParam, OrderByReq, DirParam, QuotedTable, RawParam, ResultTable,
      ValueReq, LimitParam, LiteralHole, ConstTable, DirTernary,
      RawConst, NestedSql, JoinIds,
    ).filter(x => applies(c, t, x)).oneOf()
    all { client' = c, tagSpelling' = t, hole' = h, verdict' = reports(c, t, h) }
  }

  action init = step
}
