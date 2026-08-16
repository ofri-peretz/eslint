/**
 * SAFE — the only non-literal part of the pattern is a `for` loop counter.
 *
 * A template renderer substituting `{0}`, `{1}`, `{2}`. The counter is driven by
 * the loop, not by input; the set of patterns this can ever compile is fixed by
 * `values.length`. Reporting it is the "any non-Literal argument" heuristic
 * showing through.
 */
export function interpolate(template, values) {
  let output = template;
  for (let index = 0; index < values.length; index++) {
    output = output.replace(new RegExp('\\{' + index + '\\}', 'g'), String(values[index]));
  }
  return output;
}
