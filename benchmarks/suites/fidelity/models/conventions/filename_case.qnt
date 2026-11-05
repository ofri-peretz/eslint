// Model of eslint-plugin-conventions/filename-case.
// A naming convention the user configures: `case` (default kebabCase; also
// camelCase, pascalCase, snakeCase) is checked against the file's name with
// its extension and test/spec/stories/e2e/d suffixes removed. The name is
// taken as given. It does not report:
//   - a name that conforms (`user` conforms to kebab, camel and snake alike);
//   - a dotfile (`.eslintrc.ts`);
//   - a conventional uppercase file (`README`, ...) unless
//     `allowedUppercaseFiles` is emptied;
//   - a basename listed in `ignore`;
//   - a name listed in the `allowed<Case>Case` list of the case it is in.
// Left out (judgment): names with several dot-separated parts
// (`user.controller.ts`) and names that start with a digit - whether each
// part conforms on its own is not in the docs.
module filename_case {
  type Name = Kebab | Camel | Pascal | Snake | Single | Upper | TestSuffix | Dotfile
  type Case = KebabCase | CamelCase | PascalCase | SnakeCase
  type Override = NoOverride | AllowListed | Ignored | UppercaseOff

  pure def conforms(n: Name, c: Case): bool =
    if (n == Kebab or n == TestSuffix) c == KebabCase
    else if (n == Camel) c == CamelCase
    else if (n == Pascal or n == Upper) c == PascalCase
    else if (n == Snake) c == SnakeCase
    else if (n == Single) c != PascalCase
    else true

  pure def reports(n: Name, c: Case, o: Override): bool =
    n != Dotfile and o != Ignored and o != AllowListed
    and not(n == Upper and o != UppercaseOff)
    and not(conforms(n, c))

  var name: Name
  var fileCase: Case
  var override: Override
  var verdict: bool

  action step = {
    nondet n = Set(Kebab, Camel, Pascal, Snake, Single, Upper, TestSuffix, Dotfile).oneOf()
    nondet c = Set(KebabCase, CamelCase, PascalCase, SnakeCase).oneOf()
    nondet o = Set(NoOverride, AllowListed, Ignored, UppercaseOff).oneOf()
    all { name' = n, fileCase' = c, override' = o, verdict' = reports(n, c, o) }
  }

  action init = step
}
