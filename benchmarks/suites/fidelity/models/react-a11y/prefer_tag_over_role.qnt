// Model of eslint-plugin-react-a11y/prefer-tag-over-role (WCAG 4.1.2).
// The first rule of ARIA use (ARIA in HTML §2.1): when a native HTML element
// has the semantics and behaviour a role asks for, use the element. Roles with
// a native equivalent: button, link (a href), checkbox (input), heading (h1-6),
// navigation (nav), main, list (ul/ol), listitem (li). A role with no full
// native equivalent is not a finding: tab, tablist, tooltip, switch, alert,
// presentation. The native element itself carrying its own role (any of h1-h6
// for heading) is redundant, not this rule. Dynamic roles and components:
// silent.
// left out: candidate for change (fires on a guess): `<div role="img">` (the
// emoji/SVG grouping pattern; <img> cannot hold children) and
// `<div role="textbox" contentEditable>` (no native rich-text element).
module prefer_tag_over_role {
  type Role = Button | Link | Checkbox | Heading | Navigation | Main | ListRole | ListItem
            | Tab | Tablist | Tooltip | Switch | Alert | Presentation
  type Elem = Div | Span | Component | Member | Native
  type Spelling = Lit | Braced | Dynamic

  pure def hasTag(r: Role): bool =
    Set(Button, Link, Checkbox, Heading, Navigation, Main, ListRole, ListItem).contains(r)

  var role: Role
  var elem: Elem
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet r = Set(Button, Link, Checkbox, Heading, Navigation, Main, ListRole, ListItem,
                   Tab, Tablist, Tooltip, Switch, Alert, Presentation).oneOf()
    nondet e = (if (hasTag(r)) Set(Div, Span, Component, Member, Native)
                else Set(Div, Span, Component, Member)).oneOf()
    nondet sp = Set(Lit, Braced, Dynamic).oneOf()
    all { role' = r, elem' = e, spelling' = sp,
          verdict' = (hasTag(r) and Set(Div, Span).contains(e) and sp != Dynamic) }
  }

  action init = step
}
