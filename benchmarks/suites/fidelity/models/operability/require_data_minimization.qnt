// Model of eslint-plugin-operability/require-data-minimization (CWE-213).
// Collecting more personal data than a purpose needs widens what a breach
// exposes. Which fields are personal and how many is too many are facts about
// the project, so both are options: `piiFields` (default [] - and with no
// field named the rule reports NOTHING) and `maxProperties` (default 10).
// The rule reports an object literal that:
//   - declares MORE than `maxProperties` properties - counting the properties
//     it writes; a spread copies an unknown set, so it does not count;
//   - includes one of `piiFields` as a key, in any spelling (identifier,
//     quoted, static computed); and
//   - collects: at least one value is read at run time. An object of literals
//     only is configuration.
module require_data_minimization {
  type Count = AtMax | OverMax | AtMaxPlusSpread
  type Pii = PiiIdent | PiiQuoted | PiiComputed | NoPii
  type Values = Runtime | Static

  pure def reports(configured: bool, c: Count, p: Pii, v: Values): bool =
    configured and c == OverMax and p != NoPii and v == Runtime

  var piiConfigured: bool
  var lowMax: bool
  var count: Count
  var pii: Pii
  var values: Values
  var verdict: bool

  action step = {
    nondet cf = Set(false, true).oneOf()
    nondet lm = Set(false, true).oneOf()
    nondet c = Set(AtMax, OverMax, AtMaxPlusSpread).oneOf()
    nondet p = Set(PiiIdent, PiiQuoted, PiiComputed, NoPii).oneOf()
    nondet v = Set(Runtime, Static).oneOf()
    all { piiConfigured' = cf, lowMax' = lm, count' = c, pii' = p, values' = v,
          verdict' = reports(cf, c, p, v) }
  }

  action init = step
}
