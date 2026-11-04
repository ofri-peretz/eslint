// Model of eslint-plugin-openai-security/no-untrusted-content-in-prompt (CWE-1427).
// Instructions are instruction text: text this file does not fix, spliced
// into them, lets whoever controls that text rewrite the agent's rules.
// Dynamic: a string parameter or request data interpolated, concatenated or
// joined in (directly, through a local const, a ternary branch or a
// same-file helper), and request data as the whole value. Static: literals,
// plain and tagged templates, consts and concatenations / joins / string
// methods over them, a same-file prompt map, a ternary or helper over
// literals, an imported constant, an env read, a date, a count, a number /
// boolean parameter, and a parameter as the whole value. Slots:
// `instructions`, a run's `additional_instructions`, a `role: 'system'` or
// `role: 'developer'` turn in Chat Completions `messages` or Responses
// `input` (string or content parts), a request or message list held in a
// const, and the Agents SDK's `new Agent({ instructions })` /
// `new RealtimeAgent(...)`; a user turn is where runtime data belongs.
// Paths: chat.completions.create / parse / stream / runTools,
// responses.create / parse / stream (also as `responses['create']`), the
// Assistants API's assistants.create / update and threads.runs.create /
// createAndPoll / stream. An object-literal receiver is not the SDK, the
// Vercel AI SDK's generateText is another plugin's, and a file with no
// OpenAI import is not judged; a client that is a parameter, or AzureOpenAI,
// is.
module no_untrusted_content_in_prompt {
  type Part = Values | Slots | Paths | Gates
  type Value =
    | Literal | PlainTemplate | Tagged | ConstConcat | Join | StringMethod
    | PromptsMap | StaticTernary | StaticHelper | ImportedConst | EnvRead
    | DateIso | Count | NumberParam | BoolParam | WholeParam
    | InterpParam | InterpReq | ConcatParam | JoinDynamic | ConstTainted
    | DynamicTernary | DynamicHelper | WholeReq | ReqConcat
  type Slot =
    | Instructions | AdditionalInstructions | ChatSystem | ChatDeveloper
    | ChatParts | InputDeveloper | ChatUser | InputUser | RequestConst
    | MessagesConst | AgentCtor | RealtimeAgentCtor
  type Path =
    | ChatCreate | ChatParse | ChatStream | ChatRunTools | ResponsesCreate
    | ResponsesParse | ResponsesStream | AssistantsCreate | AssistantsUpdate
    | RunsCreate | RunsCreateAndPoll | RunsStream | Bracket | ObjectReceiver
    | Vercel
  type Gate =
    | Default | Named | Namespace | Require | RequireMember | Azure
    | ClientParam | NoImport

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
  pure def instructionSlot(s: Slot): bool = s != ChatUser and s != InputUser
  pure def requestPath(p: Path): bool = p != ObjectReceiver and p != Vercel
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
      Instructions, AdditionalInstructions, ChatSystem, ChatDeveloper,
      ChatParts, InputDeveloper, ChatUser, InputUser, RequestConst,
      MessagesConst, AgentCtor, RealtimeAgentCtor,
    ) else Set(Instructions)).oneOf()
    nondet p = (if (pt == Paths) Set(
      ChatCreate, ChatParse, ChatStream, ChatRunTools, ResponsesCreate,
      ResponsesParse, ResponsesStream, AssistantsCreate, AssistantsUpdate,
      RunsCreate, RunsCreateAndPoll, RunsStream, Bracket, ObjectReceiver,
      Vercel,
    ) else Set(ResponsesCreate)).oneOf()
    nondet g = (if (pt == Gates) Set(
      Default, Named, Namespace, Require, RequireMember, Azure, ClientParam,
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
