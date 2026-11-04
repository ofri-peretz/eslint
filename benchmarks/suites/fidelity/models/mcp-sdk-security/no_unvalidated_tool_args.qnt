// Model of eslint-plugin-mcp-sdk-security/no-unvalidated-tool-args (CWE-20).
// A tool handler that destructures an argument its declared input schema does
// not include is reported. The schema is read when it is written in place: a
// raw shape, z.object / z.strictObject (through .strict(), .describe(),
// .partial()), a loose schema (.passthrough(), z.looseObject), the legacy
// tool() params shape (including const field schemas), or an empty shape
// (which declares nothing). A schema the rule cannot read — a reference, a
// factory call, z.object(shapeVar), .extend(), a spread — and a registration
// with no schema are skipped. Reading a declared key (renamed or with a
// default), a subset, the whole args object or a rest element is fine. The
// handler may be inline or a same-file function passed by name. A file with
// no MCP server package is not judged.
module no_unvalidated_tool_args {
  type Part = Schemas | Wiring
  type Schema =
    | RawShape | ZObject | ZStrictObject | StrictChain | DescribeChain | Partial
    | Passthrough | LooseObject | LegacyShape | LegacyConstFields | EmptyShape
    | SharedRef | FactoryCall | ShapeVar | Extend | SpreadShape | NoSchema
  type Read =
    | Declared | Undeclared | RenamedUndeclared | RenamedDeclared | DefaultUndeclared
    | Subset | WholeArgs | Rest | NamedUndeclared | NamedDeclared
  type Gate = Esm | Require | V2 | McpHandler | Lookalike | None

  pure def readable(s: Schema): bool = match s {
    | SharedRef => false
    | FactoryCall => false
    | ShapeVar => false
    | Extend => false
    | SpreadShape => false
    | NoSchema => false
    | _ => true
  }
  // Does the handler read a key outside { path, mode }?
  pure def readsUndeclared(r: Read): bool = match r {
    | Undeclared => true
    | RenamedUndeclared => true
    | DefaultUndeclared => true
    | NamedUndeclared => true
    | _ => false
  }
  // Does it read any key at all by name? (`{ path, ...rest }` still reads `path`.)
  pure def readsNamed(r: Read): bool = r != WholeArgs
  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None

  pure def reports(g: Gate, s: Schema, r: Read): bool =
    mcpGate(g) and readable(s) and (readsUndeclared(r) or (s == EmptyShape and readsNamed(r)))

  var part: Part
  var gate: Gate
  var schema: Schema
  var read: Read
  var verdict: bool

  action step = {
    nondet pt = Set(Schemas, Wiring).oneOf()
    nondet g = (if (pt == Schemas) Set(Esm) else Set(Esm, Require, V2, McpHandler, Lookalike, None)).oneOf()
    nondet s = (if (pt == Schemas) Set(RawShape, ZObject, ZStrictObject, StrictChain, DescribeChain, Partial, Passthrough, LooseObject, LegacyShape, LegacyConstFields, EmptyShape, SharedRef, FactoryCall, ShapeVar, Extend, SpreadShape, NoSchema) else Set(ZObject)).oneOf()
    nondet r = (if (pt == Schemas) Set(Declared, Undeclared, RenamedUndeclared, RenamedDeclared, DefaultUndeclared, Subset, WholeArgs, Rest, NamedUndeclared, NamedDeclared) else Set(Declared, Undeclared)).oneOf()
    all {
      part' = pt,
      gate' = g,
      schema' = s,
      read' = r,
      verdict' = reports(g, s, r),
    }
  }

  action init = step
}
