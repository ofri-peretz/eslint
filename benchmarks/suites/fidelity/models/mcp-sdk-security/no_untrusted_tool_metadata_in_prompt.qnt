// Model of eslint-plugin-mcp-sdk-security/no-untrusted-tool-metadata-in-prompt (CWE-1427).
// Text from an SDK Client's listTools / listPrompts / listResources /
// listResourceTemplates result, followed through destructuring, .map /
// .filter callbacks, for…of string building and JSON.stringify, is reported
// when it reaches any field of an LLM request except the tool definitions
// (`tools`, `functions`, `tool_choice`): Anthropic and OpenAI clients'
// create(), @google/genai's generateContent, and the `ai` package's
// generateText. Its length (a number, not its text), a listing from
// something that is not the SDK's Client, an LLM client the rule cannot
// resolve (a parameter) and a log line are not reported. A file with no MCP
// package is not judged.
module no_untrusted_tool_metadata_in_prompt {
  type Part = Flows | Wiring
  type Listing = ListTools | ListPrompts | ListResources | ListResourceTemplates | NotClient | LookalikeClient
  type Derive = MapJoin | ForOfConcat | Stringify | FilterFind | Count
  type Target =
    | AnthropicSystem | AnthropicMessage | AnthropicTools
    | OpenAiSystemMessage | OpenAiTools
    | GenAiContents | AiSdkSystem | AiSdkTools | UnresolvedLlm | ConsoleLog
  type Gate = ClientEsm | ClientRequire | ClientV2

  pure def sdkListing(l: Listing): bool = l != NotClient and l != LookalikeClient
  pure def carriesText(d: Derive): bool = d != Count
  pure def promptField(t: Target): bool = match t {
    | AnthropicSystem => true
    | AnthropicMessage => true
    | OpenAiSystemMessage => true
    | GenAiContents => true
    | AiSdkSystem => true
    | _ => false
  }

  pure def reports(l: Listing, d: Derive, t: Target): bool =
    sdkListing(l) and carriesText(d) and promptField(t)

  var part: Part
  var listing: Listing
  var derive: Derive
  var target: Target
  var gate: Gate
  var verdict: bool

  action step = {
    nondet pt = Set(Flows, Wiring).oneOf()
    nondet l = (if (pt == Flows) Set(ListTools) else Set(ListTools, ListPrompts, ListResources, ListResourceTemplates, NotClient, LookalikeClient)).oneOf()
    nondet d = (if (pt == Flows) Set(MapJoin, ForOfConcat, Stringify, FilterFind, Count) else Set(MapJoin)).oneOf()
    nondet t = (if (pt == Flows) Set(AnthropicSystem, AnthropicMessage, AnthropicTools, OpenAiSystemMessage, OpenAiTools, GenAiContents, AiSdkSystem, AiSdkTools, UnresolvedLlm, ConsoleLog) else Set(AnthropicSystem, OpenAiTools)).oneOf()
    nondet g = (if (pt == Flows) Set(ClientEsm) else Set(ClientEsm, ClientRequire, ClientV2)).oneOf()
    all {
      part' = pt,
      listing' = l,
      derive' = d,
      target' = t,
      gate' = g,
      verdict' = reports(l, d, t),
    }
  }

  action init = step
}
