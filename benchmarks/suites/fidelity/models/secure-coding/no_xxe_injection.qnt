// Model of eslint-plugin-secure-coding/no-xxe-injection (CWE-611).
// Contract: parsing untrusted XML with an entity-capable parser (libxmljs) is
// reported unless a safe option proves expansion off (noent: false); a
// dangerous option set true (noent: true) turns expansion on and is reported;
// an XML literal declaring an external SYSTEM entity is reported; packages that
// cannot resolve an external entity (xml2js, fast-xml-parser) are never reported
// for parsing untrusted input.
module no_xxe_injection {
  type Parser = LibxmlNs | LibxmlDestr | Xml2js | FastXml
  type Input = Untrusted | ConstXml | ConstEntity
  type Opts = NoOpts | NoentTrue | NoentFalse
  type Spelling = Require | Import

  pure def entityCapable(p: Parser): bool = Set(LibxmlNs, LibxmlDestr).contains(p)

  pure def reports(p: Parser, i: Input, o: Opts): bool =
    i == ConstEntity
    or (entityCapable(p) and (o == NoentTrue or (i == Untrusted and o == NoOpts)))

  var parser: Parser
  var input: Input
  var opts: Opts
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet p = Set(LibxmlNs, LibxmlDestr, Xml2js, FastXml).oneOf()
    nondet i = Set(Untrusted, ConstXml, ConstEntity).oneOf()
    nondet o = (if (entityCapable(p)) Set(NoOpts, NoentTrue, NoentFalse) else Set(NoOpts)).oneOf()
    nondet sp = Set(Require, Import).oneOf()
    all { parser' = p, input' = i, opts' = o, spelling' = sp, verdict' = reports(p, i, o) }
  }

  action init = step
}
