// Model of eslint-plugin-grpc-security/no-identity-from-metadata (CWE-290).
// A value read with `.get(...)` from a gRPC handler's call metadata, that
// reaches one side of an equality check in an `if` test whose other side is a
// per-request record field, is the caller's identity taken from a header any
// client can set.
// Sources that count: `call.metadata` on a handler's first parameter (the
// handler being a method of the object passed to `.addService`), a const
// holding it, `{ metadata }` destructured from it, a same-file helper or IIFE
// whose call site passes it. Not sources: an object registered with anything
// other than addService, the callback parameter, another member of the call,
// a `this` member.
// Paths that keep the value: `[0]`, `?.[0]`, `String(... ?? '')`, a template
// with string methods, array destructuring, a const and a ternary, a helper
// that takes the value. Paths that end it: a lookup keyed by it, a call to an
// unknown verifier, a reassigned `let`.
// Comparisons that count: against a record field. Not: process.env, a
// module-level constant, a comparison outside a branch, an ordering.
module no_identity_from_metadata {
  type Source =
    | Handler | ConstMd | Destructured | HelperParam | IifeParam
    | NotHandler | SecondParam | OtherMember | ThisMember
  type Path =
    | Direct | OptionalIndex | StringWrap | Template | ArrayDestructure
    | Ternary | HelperValue | Lookup | Verifier | Reassigned
  type Compare = RecordField | EnvSecret | ConfigConst | NoBranch | Ordering

  pure def fromMetadata(s: Source): bool = match s {
    | Handler => true
    | ConstMd => true
    | Destructured => true
    | HelperParam => true
    | IifeParam => true
    | NotHandler => false
    | SecondParam => false
    | OtherMember => false
    | ThisMember => false
  }

  pure def keepsValue(p: Path): bool = match p {
    | Direct => true
    | OptionalIndex => true
    | StringWrap => true
    | Template => true
    | ArrayDestructure => true
    | Ternary => true
    | HelperValue => true
    | Lookup => false
    | Verifier => false
    | Reassigned => false
  }

  pure def reports(s: Source, p: Path, c: Compare): bool =
    fromMetadata(s) and keepsValue(p) and c == RecordField

  var source: Source
  var path: Path
  var compare: Compare
  var verdict: bool

  action step = {
    nondet s = Set(
      Handler, ConstMd, Destructured, HelperParam, IifeParam,
      NotHandler, SecondParam, OtherMember, ThisMember,
    ).oneOf()
    nondet p = Set(
      Direct, OptionalIndex, StringWrap, Template, ArrayDestructure,
      Ternary, HelperValue, Lookup, Verifier, Reassigned,
    ).oneOf()
    nondet c = Set(RecordField, EnvSecret, ConfigConst, NoBranch, Ordering).oneOf()
    all {
      source' = s, path' = p, compare' = c,
      verdict' = reports(s, p, c),
    }
  }

  action init = step
}
