/** SAFE - a 50%-opaque scrim. It is visible, so it hides nothing, and a
 *  substring test that matched "opacity: 0" inside "opacity: 0.5" reported it
 *  as an attack. */
export const scrimCss = `
  .modal-scrim {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0.5;
    background: black;
  }
`;
