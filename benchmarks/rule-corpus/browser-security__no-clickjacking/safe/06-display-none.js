/** SAFE - a hidden UI affordance. `display: none` is the OPPOSITE of a
 *  clickjacking overlay: the element leaves layout entirely and receives no
 *  clicks, so it cannot swallow one. */
export const css = `
  .error-bar { position: absolute; top: 0; left: 0; display: none; }
`;
