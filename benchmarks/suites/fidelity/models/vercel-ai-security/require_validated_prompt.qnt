// Model of eslint-plugin-vercel-ai-security/require-validated-prompt (CWE-74).
// User input — read from the request (body or query) whatever it is named, or
// named like user input by head noun — reaching `prompt` unvalidated is
// reported. A configured validator call or a schema parse validates it.
module require_validated_prompt {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to false,
  // so a test file is exempt only when the option is turned on.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Prompt =
    | StaticString        // 'What is the capital of France?'
    | ReqBody             // req.body.question
    | ReqBodyDestructured // const { question } = req.body; prompt: question
    | ReqQuery            // req.query.q
    | NamedUserInput      // userInput (handler parameter)
    | NonUserName         // articleText (handler parameter, not user-named)
    | InputTokensName     // String(inputTokens) — `input` is not the head noun
    | ConcatReq           // 'Answer this: ' + req.body.question
    | TemplateReq         // `User asked: ${req.body.question}`
    | ValidatedReq        // validateInput(req.body.question)
    | ValidatedTemplate   // `User asked: ${sanitizePrompt(req.body.question)}`
    | SchemaParsed        // const { question } = schema.parse(req.body)
    | CustomValidated     // cleanUserInput(req.body.question)
    | TrimmedReq          // req.body.question.trim() — a string method is not validation
  type Fn = GenerateText | StreamText

  pure def reports(importsAi: bool, p: Prompt, f: Fn, customCfg: bool): bool =
    importsAi and match p {
      | StaticString => false
      | ReqBody => true
      | ReqBodyDestructured => true
      | ReqQuery => true
      | NamedUserInput => true
      | NonUserName => false
      | InputTokensName => false
      | ConcatReq => true
      | TemplateReq => true
      | ValidatedReq => false
      | ValidatedTemplate => false
      | SchemaParsed => false
      | CustomValidated => not(customCfg)
      | TrimmedReq => true
    }

  var importsAi: bool
  var prompt: Prompt
  var fn: Fn
  var customCfg: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet p = Set(StaticString, ReqBody, ReqBodyDestructured, ReqQuery, NamedUserInput, NonUserName,
                   InputTokensName, ConcatReq, TemplateReq, ValidatedReq, ValidatedTemplate,
                   SchemaParsed, CustomValidated, TrimmedReq).oneOf()
    nondet f = Set(GenerateText, StreamText).oneOf()
    nondet c = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { importsAi' = i, prompt' = p, fn' = f, customCfg' = c, testCtx' = tc, verdict' = (reports(i, p, f, c) and not(exempt(tc))) }
  }

  action init = step
}
