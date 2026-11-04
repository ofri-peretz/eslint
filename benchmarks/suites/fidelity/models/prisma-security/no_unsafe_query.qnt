// Model of eslint-plugin-prisma-security/no-unsafe-query (CWE-89).
// Prisma's raw-SQL escape hatches take SQL TEXT: `$queryRawUnsafe()`,
// `$executeRawUnsafe()` and `Prisma.raw()`. Text built by template
// interpolation, `+` concatenation or `+=` from a value the file cannot prove
// fixed is SQL injection; so is request data handed over as the whole text.
// A value position (`= ${x}`, `LIMIT ${x}`) has a bind parameter, so any
// unproven value there is a finding, a plain parameter included. A fragment
// position (`ORDER BY ${x}`) is reported only once traced to the request.
// Safe: a literal, a constant, `Number(...)`, a lookup in a `const` map, a
// positional `$1` with the value passed as an argument, and the tagged
// `$queryRaw` / `$executeRaw` / `Prisma.sql` templates, which parameterize
// every interpolation. The quoted sink `prisma['$queryRawUnsafe']` and a
// `$transaction` callback handle (unannotated, typed
// `Prisma.TransactionClient`, or annotated `any`) are the same sink. A file that never imports
// Prisma is not judged.
module no_unsafe_query {
  type Client = Named | Renamed | Require | Default | Bracket | Tx | TxTyped | TxAny | NoImport
  type Sink = QueryRawUnsafe | ExecuteRawUnsafe | PrismaRaw | QueryRawTagged | SqlTagged
  type Shape =
    | TemplateReq | TemplateParam | ConcatReq | PlusAssign | WholeReq | OrderByReq
    | Positional | Literal | ConstTemplate | NumberTemplate | AllowlistOrder | OrderByParam

  pure def unsafeText(s: Shape): bool = match s {
    | TemplateReq => true
    | TemplateParam => true
    | ConcatReq => true
    | PlusAssign => true
    | WholeReq => true
    | OrderByReq => true
    | Positional => false
    | Literal => false
    | ConstTemplate => false
    | NumberTemplate => false
    | AllowlistOrder => false
    | OrderByParam => false
  }

  // The tagged templates parameterize their holes: only the interpolation
  // shapes are spelled with them.
  pure def tagged(k: Sink): bool = k == QueryRawTagged or k == SqlTagged

  // Spellings of the *Unsafe call itself, not of the client import.
  pure def sinkSpelling(c: Client): bool =
    c == Bracket or c == Tx or c == TxTyped or c == TxAny

  pure def applies(c: Client, k: Sink, s: Shape): bool =
    if (tagged(k)) (s == TemplateReq or s == TemplateParam) and not(sinkSpelling(c))
    else if (k == PrismaRaw) s != Positional and not(sinkSpelling(c))
    else true

  pure def reports(c: Client, k: Sink, s: Shape): bool =
    c != NoImport and not(tagged(k)) and unsafeText(s)

  var client: Client
  var sink: Sink
  var shape: Shape
  var verdict: bool

  action step = {
    nondet c = Set(Named, Renamed, Require, Default, Bracket, Tx, TxTyped, TxAny, NoImport).oneOf()
    nondet k = Set(QueryRawUnsafe, ExecuteRawUnsafe, PrismaRaw, QueryRawTagged, SqlTagged).oneOf()
    nondet s = Set(
      TemplateReq, TemplateParam, ConcatReq, PlusAssign, WholeReq, OrderByReq,
      Positional, Literal, ConstTemplate, NumberTemplate, AllowlistOrder, OrderByParam,
    ).filter(x => applies(c, k, x)).oneOf()
    all { client' = c, sink' = k, shape' = s, verdict' = reports(c, k, s) }
  }

  action init = step
}
