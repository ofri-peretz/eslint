/**
 * SAFE - Attacker data reaches the DOM through a non-executing attribute on a
 * non-dangerous element. `setAttribute` is a real sink for `onload`, `srcdoc`
 * or a `base` href, but `data-*` on a div executes nothing.
 *
 * Adversarial intent: the sink method IS called with tainted input. Only the
 * attribute name and element make it inert, so a rule keying on the method name
 * alone will report.
 */
export function tagRow(row, record) {
  const el = document.createElement('div');
  el.setAttribute('data-record-id', record.userSuppliedId);
  el.setAttribute('title', record.userSuppliedLabel);
  row.append(el);
  return el;
}
