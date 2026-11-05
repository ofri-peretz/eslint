// Model of eslint-plugin-operability/no-process-exit.
// `process.exit()` ends the process at once: open sockets, pending writes and
// in-flight requests are dropped. The rule reports a call of Node's
// `process.exit`, found by binding in every spelling: the global `process`
// (dotted or string subscript), `globalThis.process`, a default or named
// import from `process` / `node:process` (renamed too), a `require` of it, and
// `exit` destructured out of the global. It does not report:
//   - a `process` the code binds itself (a parameter, a local object) - it is
//     not Node's process, so its `exit` is not the process exit;
//   - other members (`process.cwd()`, setting `process.exitCode`, which lets
//     the process drain and exit on its own) or an `exit` on another object.
// `allow` (default []) is accepted by the schema but undocumented and has no
// effect; it is sampled at a non-default value to pin that.
module no_process_exit {
  type Spelling = Global | Subscript | GlobalThis | DefaultImport | NamedImport | RenamedImport
    | RequireMember | Destructured | LocalShadow | OtherMember | ExitCode | OtherObject

  pure def exitsProcess(s: Spelling): bool =
    Set(Global, Subscript, GlobalThis, DefaultImport, NamedImport, RenamedImport,
        RequireMember, Destructured).contains(s)

  var spelling: Spelling
  var allowSet: bool
  var verdict: bool

  action step = {
    nondet s = Set(Global, Subscript, GlobalThis, DefaultImport, NamedImport, RenamedImport,
                   RequireMember, Destructured, LocalShadow, OtherMember, ExitCode, OtherObject).oneOf()
    nondet a = Set(false, true).oneOf()
    all { spelling' = s, allowSet' = a, verdict' = exitsProcess(s) }
  }

  action init = step
}
