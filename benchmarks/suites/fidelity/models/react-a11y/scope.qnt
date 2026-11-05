// Model of eslint-plugin-react-a11y/scope (WCAG 1.3.1 Info and Relationships).
// HTML defines `scope` on `<th>` only; on any other element it is invalid and
// assistive technology ignores the header relationship the author meant. The
// attribute name is the structure: its value does not matter. A component
// (`<Ui.Cell scope="col">`) decides itself where the prop lands: silent.
// Left out: candidate for change (fires on a guess): `<Cell scope="col">`, a
// plain-identifier component; the rule reports it (but not `<Ui.Cell>`).
module scope {
  type Elem = Th | Td | Div | Tr | Member
  type Spelling = Lit | Braced | Dynamic

  pure def reports(e: Elem): bool = Set(Td, Div, Tr).contains(e)

  var elem: Elem
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet e = Set(Th, Td, Div, Tr, Member).oneOf()
    nondet sp = Set(Lit, Braced, Dynamic).oneOf()
    all { elem' = e, spelling' = sp, verdict' = reports(e) }
  }

  action init = step
}
