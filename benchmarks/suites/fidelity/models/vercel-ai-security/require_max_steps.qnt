// Model of eslint-plugin-vercel-ai-security/require-max-steps (CWE-834).
// An absent limit is safe (the SDK runs one step); only a step setting that
// fails to bound the tool loop is reported.
module require_max_steps {
  type Key = MaxSteps | StopWhen

  type Value =
    | Absent
    | Literal              // maxSteps: 10
    | InfinityValue        // maxSteps: Infinity
    | FromRequest          // maxSteps: req.body.steps
    | StepCountLiteral     // stopWhen: stepCountIs(10)
    | StepCountFromRequest // stopWhen: stepCountIs(req.body.n)
    | HasToolCallOnly      // stopWhen: hasToolCall('done')
    | HasToolCallAndCount  // stopWhen: [hasToolCall('done'), stepCountIs(10)]

  pure def unbounded(k: Key, v: Value): bool = match v {
    | Absent => false
    | Literal => false
    | InfinityValue => true
    | FromRequest => true
    | StepCountLiteral => false
    | StepCountFromRequest => k == StopWhen
    | HasToolCallOnly => k == StopWhen
    | HasToolCallAndCount => false
  }

  pure def reports(importsAi: bool, isObjectArg: bool, hasTools: bool, k: Key, v: Value): bool =
    importsAi and isObjectArg and hasTools and unbounded(k, v)

  var importsAi: bool
  var isObjectArg: bool
  var hasTools: bool
  var key: Key
  var value: Value
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet o = Set(true, false).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet k = Set(MaxSteps, StopWhen).oneOf()
    nondet v = Set(Absent, Literal, InfinityValue, FromRequest, StepCountLiteral, StepCountFromRequest, HasToolCallOnly, HasToolCallAndCount).oneOf()
    all {
      importsAi' = i,
      isObjectArg' = o,
      hasTools' = t,
      key' = k,
      value' = v,
      verdict' = reports(i, o, t, k, v),
    }
  }

  action init = step
}
