const { tag } = require('../../lib.cjs');

// Statements that open the function body, per guard.
const PRE = {
  NoGuard: '',
  SeenSet: 'if (seen.has(err)) return;\n  seen.add(err);',
  WriteOnlySet: 'seen.add(err);',
  Marker: 'if (SEEN in err) return;\n  err[SEEN] = true;',
  HelperMemo: 'if (memoHas(seen, err)) return;\n  memoAdd(seen, err);',
  WalkedHelper: 'if (isError(err)) log(err);',
  ArgumentsDepth:
    'var d = arguments.length > 2 ? arguments[2] : 0;\n  if (d > 10) return;',
  DepthBound: 'if (depth > 10) return;',
  DepthUnchanged: 'if (depth > 10) return;',
  DepthUncompared: '',
};

// The depth argument each guard passes to the recursive call.
const DEPTH = {
  DepthBound: 'depth + 1',
  DepthUncompared: 'depth + 1',
  ArgumentsDepth: 'd + 1',
};

function walkBody(walk, depth) {
  const args = (x) => `walk(${x}, seen, ${depth})`;
  return {
    CauseArg: `if (err.cause) ${args('err.cause')};`,
    DestructuredCause: `const { cause } = err;\n  if (cause) ${args('cause')};`,
    VarCause: `const c = err.cause;\n  if (c) ${args('c')};`,
    ErrorsMap: 'if (err.errors) err.errors.map(walk);',
    LoopWalk: 'let cur = err;\n  while (cur) cur = cur.cause;',
    OtherProp: `if (err.parent) ${args('err.parent')};`,
  }[walk];
}

module.exports = {
  rule: 'no-unbounded-cause-recursion',
  domain: 180, // 6 walks x 10 guards x 3 function forms
  traces: 800,
  key: (s) => `${tag(s.walk)}|${tag(s.guard)}|${tag(s.form)}`,
  config: () => undefined,
  code: (s) => {
    const guard = tag(s.guard);
    const body = `{\n  ${PRE[guard]}\n  ${walkBody(tag(s.walk), DEPTH[guard] ?? 'depth')}\n}`;
    // A transpiled default parameter reads arguments, which an arrow lacks.
    const params =
      guard === 'ArgumentsDepth'
        ? '(err, seen)'
        : '(err, seen = new Set(), depth = 0)';
    const form =
      guard === 'ArgumentsDepth' && tag(s.form) === 'ConstArrow'
        ? 'ConstExpr'
        : tag(s.form);
    const marker = guard === 'Marker' ? 'const SEEN = Symbol();\n' : '';
    return (
      marker +
      {
        Declaration: `export function walk${params} ${body}\n`,
        ConstArrow: `export const walk = ${params} => ${body};\n`,
        ConstExpr: `export const walk = function ${params} ${body};\n`,
        NamedExpr: `export const fn = function walk${params} ${body};\n`,
      }[form]
    );
  },
};
