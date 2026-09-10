---
'eslint-plugin-conventions': patch
---

fix(conventions): `consistent-existence-index-check` will not splice a sequence expression

`Object.prototype.hasOwnProperty.call((0, mod.argv), key)` was rewritten to
`Object.hasOwn(0, mod.argv, key)`. Parentheses belong to the parent node, not
the node's range, so `getText()` returned `0, mod.argv` and the inner comma was
promoted to an argument separator. `Object.hasOwn.length === 2`: the rewrite
asks about `0` and answers `false` where the original answered `true`.

The rule declares in its own source that "every other pairing is reported
without a fix, so `--fix` can never change a program's meaning". The existing
`surplusArguments` guard counts AST arguments — two here — so it never fired;
the defect was in the arity of the _output_. The fixer is now withheld for an
argument whose text would splice, the same answer the rule already gives to a
call the author wrote with a surplus argument.
