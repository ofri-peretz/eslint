// Model of eslint-plugin-conventions/enforced-rule-in-prose.
// "For every rule, ask: can a tool check this?" In agent guidance (memory
// files, skills, subagents) a line is reported when it is an imperative in
// command position AND names something a tool could check (an inline-code
// span, a CLI flag, a config or script file):
//   - unlinked, the rule is held only by prose;
//   - linked to the hook / rule / gate that enforces it, the line repeats the
//     tool and can go.
// Either way it is reported; the link decides only the message.
// Not a rule: a `never` mid-description ("the job never ..."), a lowercase
// `always` that starts a line only because the paragraph wrapped, a line with
// nothing checkable, a line inside fenced code, a file whose header says a
// tool generated it, and any Markdown file that is not agent guidance.
module enforced_rule_in_prose {
  type Form = LeadNever | ListAlways | Important | AfterColon | ModalActor | MidSentence | LowerStart
  type Target = Code | Flag | ConfigPath | Plain
  type Link = NoLink | LeverLink | DocLink
  type Place = Memory | Skill | Doc
  type Context = Prose | Fenced | Generated

  pure def imperative(f: Form): bool = f != MidSentence and f != LowerStart

  pure def reports(f: Form, t: Target, l: Link, p: Place, c: Context): bool =
    p != Doc and c == Prose and imperative(f) and t != Plain

  var form: Form
  var target: Target
  var link: Link
  var place: Place
  var context: Context
  var verdict: bool

  action step = {
    nondet f = Set(LeadNever, ListAlways, Important, AfterColon, ModalActor, MidSentence, LowerStart).oneOf()
    nondet t = Set(Code, Flag, ConfigPath, Plain).oneOf()
    nondet l = Set(NoLink, LeverLink, DocLink).oneOf()
    nondet p = Set(Memory, Skill, Doc).oneOf()
    nondet c = Set(Prose, Fenced, Generated).oneOf()
    all { form' = f, target' = t, link' = l, place' = p, context' = c, verdict' = reports(f, t, l, p, c) }
  }

  action init = step
}
