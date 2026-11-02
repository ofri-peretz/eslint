// Model of eslint-plugin-vercel-ai-security/require-output-validation (CWE-707).
// AI output (.text / .content / .output by exact name) passed to a display
// call (render, display, show, send, respond, Response.json — whole word of the
// call chain) is reported unless a validator (validate, sanitize, factCheck…)
// wraps it. err.message and result.usage are not AI output; logging is not
// display.
module require_output_validation {
  type Display = DisplayFn | RenderFn | RespondFn | ResSend | ResponseJson | LoggerInfo
  type Value =
    | Text        // result.text
    | Content     // response.content
    | ErrMessage  // err.message
    | Usage       // result.usage
    | Validated   // validateOutput(result.text)
    | Sanitized   // sanitize(result.text)
    | InObject    // { message: result.text }

  pure def unvalidatedOutput(v: Value): bool = v == Text or v == Content or v == InObject

  pure def reports(importsAi: bool, d: Display, v: Value): bool =
    importsAi and d != LoggerInfo and unvalidatedOutput(v)

  var importsAi: bool
  var display: Display
  var value: Value
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet d = Set(DisplayFn, RenderFn, RespondFn, ResSend, ResponseJson, LoggerInfo).oneOf()
    nondet v = Set(Text, Content, ErrMessage, Usage, Validated, Sanitized, InObject).oneOf()
    all { importsAi' = i, display' = d, value' = v, verdict' = reports(i, d, v) }
  }

  action init = step
}
