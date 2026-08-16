/** VULNERABLE - the same overlay expressed with visibility rather than
 *  opacity, and applied as an inline style attribute. */
export function renderDecoy(target) {
  target.insertAdjacentHTML(
    'beforeend',
    '<div style="position: absolute; top: 0; left: 0; visibility: hidden">Confirm</div>',
  );
}
