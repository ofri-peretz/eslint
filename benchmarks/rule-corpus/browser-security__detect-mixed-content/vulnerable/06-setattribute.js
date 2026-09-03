/**
 * VULNERABLE - `setAttribute` names the subresource property outright, so the
 * element stays unknown but the evidence does not.
 */
export function mountFrame(el, id) {
  el.setAttribute('src', 'http://embed.acme-corp.io/player/' + id);
}
