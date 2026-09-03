/** VULNERABLE - an element with zero opacity pinned over the page. It is
 *  still in the hit-test tree, so it swallows every click meant for what is
 *  underneath — the mechanism of a clickjacking overlay. */
export const overlayCss = `
  .capture-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
  }
`;
