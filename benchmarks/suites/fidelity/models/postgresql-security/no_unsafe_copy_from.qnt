// Model of eslint-plugin-postgresql-security/no-unsafe-copy-from (CWE-73).
// `COPY ... FROM '<path>'` reads a file on the DATABASE SERVER, `COPY ... TO
// '<path>'` writes one, and `FROM/TO PROGRAM` runs a shell command there. A
// path or command built from a value (interpolated or concatenated, even under
// a fixed directory prefix) is reported whatever the options say. A fixed
// `FROM` path is still server-side file access and is reported unless
// `allowHardcodedPaths` is on, or the path matches one of `allowedPaths`
// (regexes). Safe: `FROM STDIN` / `TO STDOUT` (data flows through the app) and
// a fixed export path `TO '/exports/x.csv'`. Files with no PostgreSQL import
// are not judged.
module no_unsafe_copy_from {
  type Driver =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | SinkBracket | NoImport
  type Copy =
    | FromReq | FromConcat | FromUnderPrefix | FromProgram | ToDynamic
    | FromFixed
    | FromStdin | ToStdout | ToFixed | NotCopy
  // AllowedMatch: allowedPaths covers the fixed path; AllowedOther: it does not.
  type Opt = Defaults | AllowHardcoded | AllowedMatch | AllowedOther

  pure def dynamic(c: Copy): bool =
    c == FromReq or c == FromConcat or c == FromUnderPrefix or c == FromProgram
      or c == ToDynamic

  pure def unsafe(c: Copy, o: Opt): bool =
    dynamic(c) or (c == FromFixed and (o == Defaults or o == AllowedOther))

  pure def reports(d: Driver, c: Copy, o: Opt): bool = d != NoImport and unsafe(c, o)

  var driver: Driver
  var copy: Copy
  var opt: Opt
  var verdict: bool

  action step = {
    nondet d = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      SinkBracket, NoImport,
    ).oneOf()
    nondet c = Set(
      FromReq, FromConcat, FromUnderPrefix, FromProgram, ToDynamic,
      FromFixed, FromStdin, ToStdout, ToFixed, NotCopy,
    ).oneOf()
    nondet o = Set(Defaults, AllowHardcoded, AllowedMatch, AllowedOther).oneOf()
    all { driver' = d, copy' = c, opt' = o, verdict' = reports(d, c, o) }
  }

  action init = step
}
