// Model of eslint-plugin-react-a11y/no-noninteractive-element-to-interactive-role
// (WCAG 4.1.2). A non-interactive HTML element (h1-6, p, li, ul, ol, article,
// img, td, table) carries document semantics; turning it into a widget with an
// interactive role (button, link, checkbox, tab, menuitem...) discards those
// semantics and promises keyboard behaviour the element does not have. Static
// elements (div, span) have no semantics to lose: another rule. A
// non-interactive role on it is not this rule. The option maps an element to
// interactive roles it may take; the default allows the composite-widget
// patterns: ul/ol -> listbox, menu, menubar, radiogroup, tablist, tree,
// treegrid; li -> menuitem, option, row, tab, treeitem; table -> grid;
// td -> gridcell. Non-default {h2: [button]} allows exactly that pair.
// Dynamic roles and components: silent.
module no_noninteractive_element_to_interactive_role {
  type Pair = H2Button | PLink | ArticleButton | ImgButton | LiButton | LiCheckbox | UlButton
            | TdButton | H2Tab | PCheckbox
            | UlListbox | UlMenu | OlTablist | LiMenuitem | LiOption | LiTab | TableGrid
            | TdGridcell
            | DivButton | SpanLink | CompButton | MemberButton | H2Region
  type Spelling = Lit | Braced | Dynamic
  type Opt = Default | Custom

  pure def reportPair(p: Pair): bool =
    Set(H2Button, PLink, ArticleButton, ImgButton, LiButton, LiCheckbox, UlButton, TdButton,
        H2Tab, PCheckbox).contains(p)
  pure def defaultExempt(p: Pair): bool =
    Set(UlListbox, UlMenu, OlTablist, LiMenuitem, LiOption, LiTab, TableGrid, TdGridcell)
      .contains(p)

  var pair: Pair
  var spelling: Spelling
  var opt: Opt
  var verdict: bool

  action step = {
    nondet p = Set(H2Button, PLink, ArticleButton, ImgButton, LiButton, LiCheckbox, UlButton,
                   TdButton, H2Tab, PCheckbox, UlListbox, UlMenu, OlTablist, LiMenuitem,
                   LiOption, LiTab, TableGrid, TdGridcell, DivButton, SpanLink, CompButton,
                   MemberButton, H2Region).oneOf()
    nondet sp = Set(Lit, Braced, Dynamic).oneOf()
    nondet o = (if (defaultExempt(p)) Set(Default) else Set(Default, Custom)).oneOf()
    all { pair' = p, spelling' = sp, opt' = o,
          verdict' = (reportPair(p) and sp != Dynamic and not(o == Custom and p == H2Button)) }
  }

  action init = step
}
