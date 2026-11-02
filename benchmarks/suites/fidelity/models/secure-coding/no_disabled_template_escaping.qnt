// Model of eslint-plugin-secure-coding/no-disabled-template-escaping (CWE-79).
// Contract: an ASSIGNMENT of the literal `false` to a property named escapeMarkup
// is reported in every static spelling: `.escapeMarkup`, `['escapeMarkup']`,
// [`escapeMarkup`], and through a longer chain (this.options.escapeMarkup). Not
// reported: a bare variable, a computed key held in a variable, any value other
// than literal false (true, 'false', 0), a comparison, a different property.
module no_disabled_template_escaping {
  type Target = Dot | BracketStr | BracketTpl | BracketVar | BareVar | ThisChain | OtherProp
  type Value = FalseLit | TrueLit | StrFalse | Zero
  type Op = Assign | Compare

  pure def reports(t: Target, v: Value, o: Op): bool =
    o == Assign and v == FalseLit and Set(Dot, BracketStr, BracketTpl, ThisChain).contains(t)

  var target: Target
  var value: Value
  var op: Op
  var verdict: bool

  action step = {
    nondet t = Set(Dot, BracketStr, BracketTpl, BracketVar, BareVar, ThisChain, OtherProp).oneOf()
    nondet v = Set(FalseLit, TrueLit, StrFalse, Zero).oneOf()
    nondet o = Set(Assign, Compare).oneOf()
    all { target' = t, value' = v, op' = o, verdict' = reports(t, v, o) }
  }

  action init = step
}
