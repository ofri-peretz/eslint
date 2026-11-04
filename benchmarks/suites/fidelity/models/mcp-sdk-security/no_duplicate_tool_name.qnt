// Model of eslint-plugin-mcp-sdk-security/no-duplicate-tool-name (CWE-694).
// Two registerTool / tool() calls on the same server variable with the same
// static name (a literal or a const it resolves to) are reported when both
// always run: nothing between either call and their common ancestor is an
// if / else branch, a ternary branch, a switch case, the right operand of
// && / || / ??, a loop body, a catch block or a function boundary. A `try`
// block is not a branch (the second registration still runs, and throws).
// Two server variables, a non-identifier receiver (this.server), a dynamic
// name and different names are not duplicates. A low-level tools/list
// handler (ListToolsRequestSchema, or v2's 'tools/list') returning two tools
// with one static name — inline, a const array, or const elements — is
// reported; a list built by a call is not read. A file with no MCP package
// is not judged.
module no_duplicate_tool_name {
  type Part = Registrations | Receivers | Listings | Gates
  type Form = RegisterTool | LegacyTool
  type Name = Same | Different | ConstSame | Dynamic
  type Placement =
    | Sequential | InTry | IfElse | IfSecond | InCatch | InLoop | TwoFunctions
    | AndRight | TernaryBranches | SwitchCases | InnerBlock
  type Receiver = OneServer | TwoServers | ThisServer
  type Listing = InlineDup | InlineDistinct | ConstArrayDup | ConstElemsDup | Mapped | V2StringDup | NamedHandlerDup
  type Gate = Esm | Require | V2 | Lookalike | None

  pure def both(p: Placement): bool = match p {
    | Sequential => true
    | InTry => true
    | InnerBlock => true
    | _ => false
  }
  pure def staticSame(n: Name): bool = n == Same or n == ConstSame
  pure def listDup(l: Listing): bool = l != InlineDistinct and l != Mapped
  pure def mcpGate(g: Gate): bool = g != Lookalike and g != None

  pure def reports(pt: Part, n: Name, p: Placement, r: Receiver, l: Listing, g: Gate): bool =
    if (pt == Listings) mcpGate(g) and listDup(l)
    else mcpGate(g) and staticSame(n) and both(p) and r == OneServer

  var part: Part
  var form1: Form
  var form2: Form
  var name: Name
  var placement: Placement
  var receiver: Receiver
  var listing: Listing
  var gate: Gate
  var verdict: bool

  action step = {
    nondet pt = Set(Registrations, Receivers, Listings, Gates).oneOf()
    nondet f1 = (if (pt == Registrations) Set(RegisterTool, LegacyTool) else Set(RegisterTool)).oneOf()
    nondet f2 = (if (pt == Registrations) Set(RegisterTool, LegacyTool) else Set(RegisterTool)).oneOf()
    nondet n = (if (pt == Registrations) Set(Same, Different, ConstSame, Dynamic) else Set(Same)).oneOf()
    nondet p = (if (pt == Registrations) Set(Sequential, InTry, IfElse, IfSecond, InCatch, InLoop, TwoFunctions, AndRight, TernaryBranches, SwitchCases, InnerBlock) else Set(Sequential)).oneOf()
    nondet r = (if (pt == Receivers) Set(OneServer, TwoServers, ThisServer) else Set(OneServer)).oneOf()
    nondet l = (if (pt == Listings) Set(InlineDup, InlineDistinct, ConstArrayDup, ConstElemsDup, Mapped, V2StringDup, NamedHandlerDup) else Set(InlineDup)).oneOf()
    nondet g = (if (pt == Gates or pt == Listings) Set(Esm, Require, V2, Lookalike, None) else Set(Esm)).oneOf()
    all {
      part' = pt,
      form1' = f1,
      form2' = f2,
      name' = n,
      placement' = p,
      receiver' = r,
      listing' = l,
      gate' = g,
      verdict' = reports(pt, n, p, r, l, g),
    }
  }

  action init = step
}
