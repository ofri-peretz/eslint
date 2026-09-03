/** VULNERABLE - ADVERSARIAL. The overlay expressed as a styled-components
 *  block. Nothing in the text says "style" or "css"; the evidence is the
 *  declarations themselves. */
const Capture = styled.div`
  position: fixed;
  inset: 0;
  opacity: 0;
  pointer-events: auto;
`;

export default Capture;
