// Model of eslint-plugin-anthropic-security/no-untrusted-content-in-prompt (CWE-1427).
// A system prompt is instruction text: text this file does not fix, spliced
// into it, lets whoever controls that text rewrite the agent's rules. Dynamic:
// a string parameter or request data interpolated, concatenated or joined in
// (directly, through a local const, a ternary branch or a same-file helper),
// and request data as the whole value. Static: literals, plain and tagged
// templates, consts and concatenations / joins / string methods over them, a
// same-file prompt map, a ternary or helper over literals, an imported
// constant, an env read, a date, a count, a number / boolean parameter, and a
// parameter as the whole value. Slots: `system` as a string or as text
// blocks, a `role: 'system'` turn in `messages`, a request or message list
// held in a const; a user turn is where runtime data belongs. Paths:
// messages.create / stream / parse (also as `messages['create']`), the beta
// messages.toolRunner, each `params` of messages.batches.create (an array
// literal or a `.map`). countTokens runs no model, an object-literal receiver
// is not the SDK, the Vercel AI SDK's generateText is another plugin's, and a
// file with no @anthropic-ai import is not judged; a client that is a
// parameter or comes from the Bedrock package is.
module no_untrusted_content_in_prompt {
  type Part = Values | Slots | Paths | Gates
  type Value =
    | Literal | PlainTemplate | Tagged | ConstConcat | Join | StringMethod
    | PromptsMap | StaticTernary | StaticHelper | ImportedConst | EnvRead
    | DateIso | Count | NumberParam | BoolParam | WholeParam
    | InterpParam | InterpReq | ConcatParam | JoinDynamic | ConstTainted
    | DynamicTernary | DynamicHelper | WholeReq | ReqConcat
  type Slot =
    | SystemString | SystemBlocks | SystemTurn | UserTurn | RequestConst
    | MessagesConst
  type Path =
    | Create | Stream | Parse | ToolRunner | Batch | BatchMap | Bracket
    | CountTokens | ObjectReceiver | Vercel
  type Gate =
    | Default | Named | Namespace | Require | RequireMember | ClientParam
    | Bedrock | NoImport

  pure def dynamic(v: Value): bool = match v {
    | InterpParam => true
    | InterpReq => true
    | ConcatParam => true
    | JoinDynamic => true
    | ConstTainted => true
    | DynamicTernary => true
    | DynamicHelper => true
    | WholeReq => true
    | ReqConcat => true
    | _ => false
  }
  pure def instructionSlot(s: Slot): bool = s != UserTurn
  pure def requestPath(p: Path): bool =
    p != CountTokens and p != ObjectReceiver and p != Vercel
  pure def sdkFile(g: Gate): bool = g != NoImport

  pure def reports(v: Value, s: Slot, p: Path, g: Gate): bool =
    dynamic(v) and instructionSlot(s) and requestPath(p) and sdkFile(g)

  var part: Part
  var value: Value
  var slot: Slot
  var path: Path
  var gate: Gate
  var verdict: bool

  action step = {
    nondet pt = Set(Values, Slots, Paths, Gates).oneOf()
    nondet v = (if (pt == Values) Set(
      Literal, PlainTemplate, Tagged, ConstConcat, Join, StringMethod,
      PromptsMap, StaticTernary, StaticHelper, ImportedConst, EnvRead, DateIso,
      Count, NumberParam, BoolParam, WholeParam, InterpParam, InterpReq,
      ConcatParam, JoinDynamic, ConstTainted, DynamicTernary, DynamicHelper,
      WholeReq, ReqConcat,
    ) else Set(InterpParam, Literal)).oneOf()
    nondet s = (if (pt == Slots) Set(
      SystemString, SystemBlocks, SystemTurn, UserTurn, RequestConst,
      MessagesConst,
    ) else Set(SystemString)).oneOf()
    nondet p = (if (pt == Paths) Set(
      Create, Stream, Parse, ToolRunner, Batch, BatchMap, Bracket, CountTokens,
      ObjectReceiver, Vercel,
    ) else Set(Create)).oneOf()
    nondet g = (if (pt == Gates) Set(
      Default, Named, Namespace, Require, RequireMember, ClientParam, Bedrock,
      NoImport,
    ) else Set(Default)).oneOf()
    all {
      part' = pt,
      value' = v,
      slot' = s,
      path' = p,
      gate' = g,
      verdict' = reports(v, s, p, g),
    }
  }

  action init = step
}
