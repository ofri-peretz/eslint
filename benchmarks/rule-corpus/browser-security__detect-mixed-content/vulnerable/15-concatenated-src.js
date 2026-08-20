/**
 * VULNERABLE - ADVERSARIAL. The URL is assembled by concatenation rather than
 * written as one literal, which defeats a rule that only inspects a Literal
 * sitting directly in the assignment.
 */
export function mount(el, id) {
  el.src = 'http://embed.acme-corp.io/' + id + '/player.html';
}
