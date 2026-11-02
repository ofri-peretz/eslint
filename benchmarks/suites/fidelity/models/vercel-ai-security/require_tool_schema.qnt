// Model of eslint-plugin-vercel-ai-security/require-tool-schema (CWE-20).
// Every tool with an execute — a `tool({...})`, an entry of a `tools` object
// on an SDK call, or of a `const tools = {...}` map — must declare an input
// schema (inputSchema, or v4 `parameters`, quoted or not). A spread may supply
// it; a schema held in a variable is still a schema.
module require_tool_schema {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to false,
  // so a test file is exempt only when the option is turned on.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Form = PlainInCall | QuotedToolsKey | ToolsConst | ToolHelper
  type Schema = NoSchema | InputSchema | Parameters | QuotedInputSchema | SpreadDef | SchemaVar

  pure def reports(importsAi: bool, f: Form, s: Schema): bool = importsAi and s == NoSchema

  var importsAi: bool
  var form: Form
  var schema: Schema
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet f = Set(PlainInCall, QuotedToolsKey, ToolsConst, ToolHelper).oneOf()
    nondet s = Set(NoSchema, InputSchema, Parameters, QuotedInputSchema, SpreadDef, SchemaVar).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { importsAi' = i, form' = f, schema' = s, testCtx' = tc, verdict' = (reports(i, f, s) and not(exempt(tc))) }
  }

  action init = step
}
