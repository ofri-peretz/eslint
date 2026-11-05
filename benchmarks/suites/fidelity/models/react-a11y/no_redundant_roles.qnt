// Model of eslint-plugin-react-a11y/no-redundant-roles (WCAG 4.1.2).
// An explicit `role` equal to the element's implicit role (HTML-AAM / ARIA in
// HTML §4) adds nothing; ARIA in HTML says authors SHOULD NOT set it. Pairs
// whose implicit role depends on context (header/banner, section/region,
// form, select) are out of scope. `<a>` without href has no link role, so
// role="link" there is not redundant. The option maps an element to roles
// allowed to stay redundant; default {nav:[navigation], button:[button],
// body:[document], img:[img]}. Non-default {nav:[], main:[main]} reports nav
// and allows main. Dynamic roles and components: silent.
module no_redundant_roles {
  type Pair = MainMain | ArticleArticle | NavNavigation | ButtonButton | UlList | OlList
            | LiListitem | H1Heading | AHrefLink | TableTable | AsideComplementary
            | CheckboxCheckbox | TextareaTextbox | DialogDialog | HrSeparator | ImgImg
            | ABareLink | DivButton | UlMenu | H1Button | ButtonLink | LiOption
            | CompMain | MemberMain
  type Spelling = Lit | Braced | Dynamic
  type Opt = Default | Custom

  pure def redundant(p: Pair): bool =
    Set(MainMain, ArticleArticle, NavNavigation, ButtonButton, UlList, OlList, LiListitem,
        H1Heading, AHrefLink, TableTable, AsideComplementary, CheckboxCheckbox,
        TextareaTextbox, DialogDialog, HrSeparator, ImgImg).contains(p)
  pure def exempt(p: Pair, o: Opt): bool =
    if (o == Default) Set(NavNavigation, ButtonButton, ImgImg).contains(p)
    else p == MainMain
  pure def defaultOnly(p: Pair): bool = Set(ButtonButton, ImgImg, CompMain, MemberMain).contains(p)

  var pair: Pair
  var spelling: Spelling
  var opt: Opt
  var verdict: bool

  action step = {
    nondet p = Set(MainMain, ArticleArticle, NavNavigation, ButtonButton, UlList, OlList,
                   LiListitem, H1Heading, AHrefLink, TableTable, AsideComplementary,
                   CheckboxCheckbox, TextareaTextbox, DialogDialog, HrSeparator, ImgImg,
                   ABareLink, DivButton, UlMenu, H1Button, ButtonLink, LiOption,
                   CompMain, MemberMain).oneOf()
    nondet sp = Set(Lit, Braced, Dynamic).oneOf()
    nondet o = (if (defaultOnly(p)) Set(Default) else Set(Default, Custom)).oneOf()
    all { pair' = p, spelling' = sp, opt' = o,
          verdict' = (redundant(p) and sp != Dynamic and not(exempt(p, o))) }
  }

  action init = step
}
