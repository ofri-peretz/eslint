// Model of eslint-plugin-mcp-sdk-security/no-untrusted-stdio-command (CWE-78).
// `new StdioClientTransport(options)` (v1 sdk/client/stdio.js, v2
// @modelcontextprotocol/client or /node) is reported when an untrusted value
// is in a position that chooses what runs: the `command`; an `args` element
// after `-c` when the command is a static shell; the first non-flag `args`
// element when the command is a static runner (npx, uvx); the whole options
// object; or a spread that supplies `command` (unless a later key replaces
// it). Untrusted values: a tool argument (z.enum is an allowlist), a network
// response (fetch / axios, `.json()`, `.data`), and a project config file
// (readFile / readFileSync of a static relative path or one built from
// process.cwd(), and JSON.parse of it), followed through bindings, for…of and
// Object.entries. Not untrusted: a literal, a lookup into a static allowlist,
// a path under os.homedir() or an absolute path. Not a position: a fixed
// server's own arguments, a non-shell non-runner command's arguments, `env`
// and `cwd`. A same-named local class and a file with no MCP package are not
// judged.
module no_untrusted_stdio_command {
  type Part = Positions | Wiring
  type Source =
    | ToolArg | EnumArg | FetchJson | AxiosData | ProjectJson | CwdJoinJson
    | HomeJson | AbsoluteJson | AllowlistLookup | Literal
  type Position =
    | Command | ShellScript | RunnerPackage | FixedServerArg | NonShellArg
    | EnvVar | Cwd | WholeOptions | Spread | SpreadOverridden
  type Transport = V1 | V1Require | ClientV2 | NodeV2 | LocalClass | NoMcp

  pure def untrusted(s: Source): bool = match s {
    | ToolArg => true
    | FetchJson => true
    | AxiosData => true
    | ProjectJson => true
    | CwdJoinJson => true
    | _ => false
  }
  pure def chooses(p: Position): bool = match p {
    | Command => true
    | ShellScript => true
    | RunnerPackage => true
    | WholeOptions => true
    | Spread => true
    | _ => false
  }
  pure def sdk(t: Transport): bool = t != LocalClass and t != NoMcp

  pure def reports(s: Source, p: Position, t: Transport): bool =
    sdk(t) and untrusted(s) and chooses(p)

  var part: Part
  var src: Source
  var position: Position
  var transport: Transport
  var verdict: bool

  action step = {
    nondet pt = Set(Positions, Wiring).oneOf()
    nondet s = (if (pt == Positions) Set(ToolArg, EnumArg, FetchJson, AxiosData, ProjectJson, CwdJoinJson, HomeJson, AbsoluteJson, AllowlistLookup, Literal) else Set(ToolArg, ProjectJson, Literal)).oneOf()
    nondet p = (if (pt == Positions) Set(Command, ShellScript, RunnerPackage, FixedServerArg, NonShellArg, EnvVar, Cwd, WholeOptions, Spread, SpreadOverridden) else Set(Command)).oneOf()
    nondet t = (if (pt == Positions) Set(V1) else Set(V1, V1Require, ClientV2, NodeV2, LocalClass, NoMcp)).oneOf()
    all {
      part' = pt,
      src' = s,
      position' = p,
      transport' = t,
      verdict' = reports(s, p, t),
    }
  }

  action init = step
}
