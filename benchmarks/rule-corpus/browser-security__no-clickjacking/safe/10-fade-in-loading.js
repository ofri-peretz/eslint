/** SAFE - ADVERSARIAL. A fade-in. The element is invisible for 300ms on its
 *  way to being visible, which is the commonest loading affordance on the
 *  web. A clickjacking overlay is static — it has to be, or the victim would
 *  watch it appear. */
export const skeletonCss = `
  .skeleton {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    transition: opacity 0.3s ease-in;
  }
`;
