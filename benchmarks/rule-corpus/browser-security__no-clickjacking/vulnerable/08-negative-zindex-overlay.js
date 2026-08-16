/** VULNERABLE - an overlay parked behind the page it covers, applied through
 *  a style string. */
const style = 'position: absolute; top: 0; left: 0; z-index: -1; width: 100%';

export function mount(node) {
  node.setAttribute('style', style);
}
