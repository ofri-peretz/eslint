// Model of eslint-plugin-secure-coding/no-graphql-injection (CWE-943).
// Contract (docs/rules/no-graphql-injection.md): a string that IS a GraphQL
// document (operation/schema keyword at the start of a line, or a bare selection
// set that is the whole string) built with a dynamic value is reported; an
// introspection query is reported unless allowIntrospection. Prose that merely
// mentions `type`/`query` mid-sentence, and messages with nested braces, are not
// GraphQL. A document with no dynamic part has nothing to inject into.
module no_graphql_injection {
  type Shape = OpQuery | OpMutation | Selection | Introspection | ProseType | MidSentence | NestedMsg
  type Build = Template | Concat | Static

  pure def isDocument(s: Shape): bool =
    Set(OpQuery, OpMutation, Selection, Introspection).contains(s)

  pure def reports(s: Shape, b: Build, allowIntro: bool): bool =
    (isDocument(s) and b != Static) or (s == Introspection and not(allowIntro))

  var shape: Shape
  var build: Build
  var allowIntro: bool
  var verdict: bool

  action step = {
    nondet s = Set(OpQuery, OpMutation, Selection, Introspection, ProseType, MidSentence, NestedMsg).oneOf()
    nondet b = Set(Template, Concat, Static).oneOf()
    nondet a = Set(true, false).oneOf()
    all { shape' = s, build' = b, allowIntro' = a, verdict' = reports(s, b, a) }
  }

  action init = step
}
