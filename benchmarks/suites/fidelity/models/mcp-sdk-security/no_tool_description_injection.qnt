// Model of eslint-plugin-mcp-sdk-security/no-tool-description-injection (CWE-1427).
// A tool, prompt or resource `description` or `title` — registerTool /
// registerPrompt / registerResource config, the legacy tool()'s positional
// description, a legacy annotations object's `title` — whose text (whole or
// interpolated) comes from a client (a tool argument; the request of an
// express / hono route), a remote service (fetch / axios response, its
// .json()), or a file's contents (readFile / readFileSync of a path not
// anchored to the server's own code, and JSON.parse of it) is reported.
// A literal, a directory listing, a counter, an imported config value, an
// environment variable, a call the rule cannot see into and a file beside the
// code (__dirname, import.meta.url) are server-local. A config passed by
// reference is not read. A file with no MCP server package is not judged.
// (Judgment call, left out of the domain: a `.describe()` text inside
// `inputSchema` reaches the model through the tool's JSON Schema, but the
// rule documents inputSchema as out of scope.)
module no_tool_description_injection {
  type Part = Sources | Gates
  type Source =
    | Literal | ToolArg | FetchJson | AxiosData | ReadFileCwd | ParsedJsonFile
    | ExpressBody | HonoBody | DirnameFile | ImportMetaFile
    | Readdir | ConfigImport | OpaqueCall | EnvVar | Counter
  type Slot =
    | ToolDescription | ToolTitle | LegacyPositional | AnnotationsTitle
    | PromptDescription | ResourceDescription | ConfigByRef
  type Wrap = Whole | Interpolated
  type Gate = Esm | Require | Namespace | V2 | McpHandler | Lookalike | None

  pure def untrusted(s: Source): bool = match s {
    | ToolArg => true
    | FetchJson => true
    | AxiosData => true
    | ReadFileCwd => true
    | ParsedJsonFile => true
    | ExpressBody => true
    | HonoBody => true
    | _ => false
  }
  pure def visible(sl: Slot): bool = sl != ConfigByRef
  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None
  pure def validSlot(g: Gate, sl: Slot): bool =
    not(g == V2 and (sl == LegacyPositional or sl == AnnotationsTitle))

  pure def reports(s: Source, sl: Slot, g: Gate): bool =
    mcpGate(g) and untrusted(s) and visible(sl)

  var part: Part
  var src: Source
  var slot: Slot
  var wrap: Wrap
  var gate: Gate
  var verdict: bool

  action step = {
    nondet pt = Set(Sources, Gates).oneOf()
    nondet s = (if (pt == Sources) Set(Literal, ToolArg, FetchJson, AxiosData, ReadFileCwd, ParsedJsonFile, ExpressBody, HonoBody, DirnameFile, ImportMetaFile, Readdir, ConfigImport, OpaqueCall, EnvVar, Counter) else Set(FetchJson, ToolArg, Literal)).oneOf()
    nondet g = (if (pt == Sources) Set(Esm) else Set(Esm, Require, Namespace, V2, McpHandler, Lookalike, None)).oneOf()
    nondet sl = (if (pt == Sources) Set(ToolDescription, ToolTitle, LegacyPositional, AnnotationsTitle, PromptDescription, ResourceDescription, ConfigByRef) else Set(ToolDescription, ResourceDescription, LegacyPositional).filter(x => validSlot(g, x))).oneOf()
    nondet w = (if (pt == Sources) Set(Whole, Interpolated) else Set(Whole)).oneOf()
    all {
      part' = pt,
      src' = s,
      slot' = sl,
      wrap' = w,
      gate' = g,
      verdict' = reports(s, sl, g),
    }
  }

  action init = step
}
