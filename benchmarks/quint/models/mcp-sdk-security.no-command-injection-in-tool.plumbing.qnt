// The plumbing half of `no-command-injection-in-tool`: which SDK, which
// registration API, how the handler reads the argument, and whether a schema
// restricts it — with the sink fixed (`execSync(value)`). `shouldReport` is
// the contract: a tool argument names the command unless a closed-set schema
// (`z.enum`) is ENFORCED on it — by the SDK for `registerTool` / legacy
// `tool()` input schemas, or by an explicit Zod parse. The low-level
// `setRequestHandler` validates nothing, so a schema it merely advertises does
// not restrict what arrives.
module mcp_sdk_security_no_command_injection_in_tool_plumbing {
  type Sdk = V1 | V2
  type Api = RegisterTool | LegacyTool | SetRequestHandler
  type Read = Destructure | Member | ZodParse | ZodSafeParse
  type Schema = FreeString | ClosedEnum
  type Binding = Inline | ViaLet | ViaHelperSink | ViaObjectField

  var sdk: Sdk
  var api: Api
  var read: Read
  var schema: Schema
  var binding: Binding
  var expected: bool

  pure def parsed(r: Read): bool =
    match r { | ZodParse => true | ZodSafeParse => true | _ => false }

  pure def enforced(a: Api, r: Read): bool =
    match a { | SetRequestHandler => parsed(r) | _ => true }

  pure def shouldReport(a: Api, r: Read, s: Schema): bool =
    match s { | ClosedEnum => not(enforced(a, r)) | FreeString => true }

  action init = all {
    nondet v = Set(V1, V2).oneOf()
    nondet a = Set(RegisterTool, LegacyTool, SetRequestHandler).oneOf()
    nondet r = Set(Destructure, Member, ZodParse, ZodSafeParse).oneOf()
    nondet s = Set(FreeString, ClosedEnum).oneOf()
    nondet b = Set(Inline, ViaLet, ViaHelperSink, ViaObjectField).oneOf()
    all {
      sdk' = v, api' = a, read' = r, schema' = s, binding' = b,
      expected' = shouldReport(a, r, s),
    }
  }

  action step = all {
    sdk' = sdk, api' = api, read' = read, schema' = schema, binding' = binding,
    expected' = expected,
  }
}
