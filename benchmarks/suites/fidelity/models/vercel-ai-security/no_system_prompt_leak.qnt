// Model of eslint-plugin-vercel-ai-security/no-system-prompt-leak (CWE-200).
// A system prompt (a key or value named like one, by whole word) placed in a
// response payload or returned object is reported. In a response payload a
// `system` / `instructions` / `systemPrompt` key is reported whatever its value,
// nested or not. A returned object carrying `model` is SDK call options, not a
// response.
module no_system_prompt_leak {
  type Sink = ResponseJson | ResJson | NewResponseStringify | ReturnObj
  type Payload =
    | SystemPromptKey     // { systemPrompt: SYSTEM_PROMPT, response: text }
    | ValueNamed          // { data: systemPrompt }
    | SystemKeyAnyValue   // { system: persona }
    | NestedInstructions  // { meta: { instructions: persona } }
    | OnlyResponse        // { response: text }
    | ModelOptions        // { model: openai('gpt-4o'), system: SYSTEM_PROMPT }
    | Bare                // the system prompt itself

  pure def responseSink(s: Sink): bool = s != ReturnObj

  pure def leaks(s: Sink, p: Payload): bool = match p {
    | SystemPromptKey => true
    | ValueNamed => true
    | SystemKeyAnyValue => responseSink(s)
    | NestedInstructions => responseSink(s)
    | OnlyResponse => false
    | ModelOptions => responseSink(s)
    | Bare => true
  }

  pure def reports(importsAi: bool, s: Sink, p: Payload): bool = importsAi and leaks(s, p)

  var importsAi: bool
  var sink: Sink
  var payload: Payload
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet s = Set(ResponseJson, ResJson, NewResponseStringify, ReturnObj).oneOf()
    nondet p = Set(SystemPromptKey, ValueNamed, SystemKeyAnyValue, NestedInstructions, OnlyResponse, ModelOptions, Bare).oneOf()
    all { importsAi' = i, sink' = s, payload' = p, verdict' = reports(i, s, p) }
  }

  action init = step
}
