// Model of eslint-plugin-mcp-sdk-security/no-path-traversal-in-tool (CWE-22).
// A tool argument (or request.params.arguments, or a ResourceTemplate
// variable) reaching the path of an fs call that reads, writes, lists or
// removes is reported unless a containment check exits (or wraps the call)
// first. fs is recognised through `fs`, `fs/promises`, `fs.promises`,
// `require`, `fs-extra` and `graceful-fs`; `rename` / `copyFile` take two
// paths. path.join / resolve / normalize, a template and fs.realpath still
// point where the argument did; path.basename does not. A containment check
// is an exiting `if` that tests the value (or a name derived from it) with a
// call: startsWith(root + sep), path.relative + isAbsolute, an allowlist
// `includes`, a regex test. endsWith, existsSync and a check that does not
// exit are not containment. A store's own `readFile`, a constant path, a
// z.enum argument and a static resource's URI are not reported. A file with
// no MCP server package is not judged.
module no_path_traversal_in_tool {
  type Part = Wiring | Sinks
  type Gate = Esm | Require | Namespace | V2 | McpHandler | Lookalike | None
  type Reg = Register | WholeArgs | Legacy | Named | LowLevel | Enum | ResTemplate | ResStatic
  type Sink =
    | FsPromisesNamed | FsDefaultSync | FsPromisesMember | RequireUnlink
    | FsExtra | GracefulFs | RenameTarget | CopyFileSource | ReadStream | Readdir
    | StoreReadFile
  type Flow =
    | Direct | Join | Resolve | Template | Realpath | Basename
    | RelativeCheck | PrefixCheck | AllowlistCheck | RegexCheck
    | EndsWithCheck | ExistsCheck | NonExitingCheck | Literal

  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None
  pure def validReg(g: Gate, r: Reg): bool =
    not(g == V2 and r == Legacy) and not(g == McpHandler and r == LowLevel)
  pure def source(r: Reg): bool = r != Enum and r != ResStatic

  // Does an unconfined, argument-chosen path reach the call?
  pure def unconfined(f: Flow): bool = match f {
    | Direct => true
    | Join => true
    | Resolve => true
    | Template => true
    | Realpath => true
    | Basename => false
    | RelativeCheck => false
    | PrefixCheck => false
    | AllowlistCheck => false
    | RegexCheck => false
    | EndsWithCheck => true
    | ExistsCheck => true
    | NonExitingCheck => true
    | Literal => false
  }

  pure def fsSink(s: Sink): bool = s != StoreReadFile

  pure def reports(g: Gate, r: Reg, s: Sink, f: Flow): bool =
    mcpGate(g) and source(r) and unconfined(f) and fsSink(s)

  var part: Part
  var gate: Gate
  var reg: Reg
  var sink: Sink
  var flow: Flow
  var verdict: bool

  action step = {
    nondet p = Set(Wiring, Sinks).oneOf()
    nondet g = (if (p == Wiring) Set(Esm, Require, Namespace, V2, McpHandler, Lookalike, None) else Set(Esm)).oneOf()
    nondet r = (if (p == Wiring) Set(Register, WholeArgs, Legacy, Named, LowLevel, Enum, ResTemplate, ResStatic).filter(r => validReg(g, r)) else Set(Register)).oneOf()
    nondet s = (if (p == Wiring) Set(FsPromisesNamed, FsDefaultSync) else Set(FsPromisesNamed, FsDefaultSync, FsPromisesMember, RequireUnlink, FsExtra, GracefulFs, RenameTarget, CopyFileSource, ReadStream, Readdir, StoreReadFile)).oneOf()
    nondet f = (if (p == Wiring) Set(Join, Literal) else Set(Direct, Join, Resolve, Template, Realpath, Basename, RelativeCheck, PrefixCheck, AllowlistCheck, RegexCheck, EndsWithCheck, ExistsCheck, NonExitingCheck, Literal)).oneOf()
    all {
      part' = p,
      gate' = g,
      reg' = r,
      sink' = s,
      flow' = f,
      verdict' = reports(g, r, s, f),
    }
  }

  action init = step
}
