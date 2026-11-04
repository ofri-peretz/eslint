// Model of eslint-plugin-gemini-security/no-untrusted-content-in-prompt (CWE-1427).
// A system instruction is instruction text: text this file does not fix,
// spliced into it, lets whoever controls that text rewrite the agent's rules.
// Dynamic: a string parameter or request data interpolated, concatenated or
// joined in (directly, through a local const, a ternary branch or a
// same-file helper), and request data as the whole value. Static: literals,
// plain and tagged templates, consts and concatenations / joins / string
// methods over them, a same-file prompt map, a ternary or helper over
// literals, an imported constant, an env read, a date, a count, a number /
// boolean parameter, and a parameter as the whole value. Slots:
// `systemInstruction` as a string, a Content (`{ parts: [{ text }] }`) or a
// list of parts, under `config` (@google/genai) or on the request
// (@google/generative-ai), and a request held in a const; user `contents`
// are where runtime data belongs. Paths (@google/genai): models.
// generateContent / generateContentStream (also as `models['...']`),
// chats.create, caches.create, live.connect, a chat's sendMessage;
// (@google/generative-ai): getGenerativeModel, startChat, a model's
// generateContent. countTokens runs no model, an object-literal receiver is
// not the SDK, the Vercel AI SDK's generateText is another plugin's, and a
// file with no Gemini import is not judged; a client that is a parameter is.
module no_untrusted_content_in_prompt {
  type Part = Values | Slots | Paths | Gates
  type Value =
    | Literal | PlainTemplate | Tagged | ConstConcat | Join | StringMethod
    | PromptsMap | StaticTernary | StaticHelper | ImportedConst | EnvRead
    | DateIso | Count | NumberParam | BoolParam | WholeParam
    | InterpParam | InterpReq | ConcatParam | JoinDynamic | ConstTainted
    | DynamicTernary | DynamicHelper | WholeReq | ReqConcat
  type Slot = ConfigString | ConfigContent | ConfigParts | UserContents | RequestConst
  type Path =
    | GenerateContent | GenerateContentStream | ChatsCreate | CachesCreate
    | LiveConnect | SendMessage | Bracket | LegacyGetModel | LegacyStartChat
    | LegacyGenerateContent | CountTokens | ObjectReceiver | Vercel
  type Gate = Named | Namespace | Require | RequireMember | ClientParam | Legacy | NoImport

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
  pure def instructionSlot(s: Slot): bool = s != UserContents
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
      ConfigString, ConfigContent, ConfigParts, UserContents, RequestConst,
    ) else Set(ConfigString)).oneOf()
    nondet p = (if (pt == Paths) Set(
      GenerateContent, GenerateContentStream, ChatsCreate, CachesCreate,
      LiveConnect, SendMessage, Bracket, LegacyGetModel, LegacyStartChat,
      LegacyGenerateContent, CountTokens, ObjectReceiver, Vercel,
    ) else Set(GenerateContent)).oneOf()
    nondet g = (if (pt == Gates) Set(
      Named, Namespace, Require, RequireMember, ClientParam, Legacy, NoImport,
    ) else Set(Named)).oneOf()
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
