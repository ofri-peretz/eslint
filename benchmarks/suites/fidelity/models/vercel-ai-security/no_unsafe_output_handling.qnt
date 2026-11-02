// Model of eslint-plugin-vercel-ai-security/no-unsafe-output-handling (CWE-94).
// Model output (result.text, values derived from it, a tool's execute input)
// reaching a code/SQL/shell/HTML sink, or choosing a fetch URL, is reported.
// A call on the output (DOMPurify.sanitize) is not output; a string method
// (.trim()) still is. Regex .exec and a fixed-host fetch are not sinks.
module no_unsafe_output_handling {
  type Sink =
    | Eval          // eval(x)
    | NewFunction   // new Function(x)
    | InnerHTML     // el.innerHTML = x
    | DbQuery       // db.query(x)
    | ChildExec     // exec(x) from 'child_process'
    | NodeExecSync  // execSync(x) from 'node:child_process'
    | RegexExec     // /re/.exec(x) — not a sink
    | FetchUrl      // fetch(x)
    | FetchQuery    // fetch(`https://api.example.com/search?q=${x}`)
  type Source =
    | Direct        // result.text
    | Sanitized     // DOMPurify.sanitize(result.text)
    | Trimmed       // result.text.trim()
    | ViaLocal      // const code = result.text; … code
    | ToolInput     // tool({ inputSchema, execute: async ({ command }) => sink(command) })

  pure def isSink(s: Sink): bool = s != RegexExec and s != FetchQuery
  pure def tainted(src: Source): bool = src != Sanitized

  pure def reports(importsAi: bool, s: Sink, src: Source): bool =
    importsAi and isSink(s) and tainted(src)

  var importsAi: bool
  var sink: Sink
  var source: Source
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet s = Set(Eval, NewFunction, InnerHTML, DbQuery, ChildExec, NodeExecSync, RegexExec, FetchUrl, FetchQuery).oneOf()
    nondet src = Set(Direct, Sanitized, Trimmed, ViaLocal, ToolInput).oneOf()
    all { importsAi' = i, sink' = s, source' = src, verdict' = reports(i, s, src) }
  }

  action init = step
}
