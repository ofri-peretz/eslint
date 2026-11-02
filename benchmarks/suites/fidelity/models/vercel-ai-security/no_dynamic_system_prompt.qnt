// Model of eslint-plugin-vercel-ai-security/no-dynamic-system-prompt (CWE-74).
// `system` / `instructions` must be static: a literal, a literal const, a
// template or `+` chain built only from literal consts and the current date,
// or a same-file function returning only static text. Interpolated variables,
// external calls, awaited fetches and any request-derived value are reported.
// allowStaticTemplates: false also rejects a template literal with no
// expressions.
module no_dynamic_system_prompt {
  type Key = SystemKey | InstructionsKey
  type Value =
    | StaticString        // 'You are a helpful assistant.'
    | StaticConst         // const SYSTEM = '…'; system: SYSTEM
    | StaticTemplate      // `You are a helpful assistant.`
    | TemplateExpr        // `You are a ${role} assistant.`
    | ConcatVar           // 'You are a ' + role + ' assistant.'
    | ExternalCall        // getSystemPrompt(agentType) (imported)
    | AwaitFetch          // await fetchSystemPrompt()
    | ConstOnlyTemplate   // `${BASE} Be concise.` with const BASE = '…'
    | DateTemplate        // `Today is ${new Date().toISOString()}.`
    | ReqBody             // req.body.persona
    | ReqJsonDestructured // const { persona } = await req.json()
    | SearchParam         // searchParams.get('persona')
    | SameFileStaticFn    // buildSystemPrompt() returning a literal

  pure def dynamic(v: Value, allowStatic: bool): bool = match v {
    | StaticString => false
    | StaticConst => false
    | StaticTemplate => not(allowStatic)
    | TemplateExpr => true
    | ConcatVar => true
    | ExternalCall => true
    | AwaitFetch => true
    | ConstOnlyTemplate => false
    | DateTemplate => false
    | ReqBody => true
    | ReqJsonDestructured => true
    | SearchParam => true
    | SameFileStaticFn => false
  }

  pure def reports(importsAi: bool, k: Key, v: Value, allowStatic: bool): bool =
    importsAi and dynamic(v, allowStatic)

  var importsAi: bool
  var key: Key
  var value: Value
  var allowStatic: bool
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet k = Set(SystemKey, InstructionsKey).oneOf()
    nondet v = Set(StaticString, StaticConst, StaticTemplate, TemplateExpr, ConcatVar, ExternalCall, AwaitFetch,
                   ConstOnlyTemplate, DateTemplate, ReqBody, ReqJsonDestructured, SearchParam, SameFileStaticFn).oneOf()
    nondet a = Set(true, false).oneOf()
    all { importsAi' = i, key' = k, value' = v, allowStatic' = a, verdict' = reports(i, k, v, a) }
  }

  action init = step
}
