/** SAFE - ADVERSARIAL. The iframe source is a constant, exactly as in
 *  vulnerable/05, but it resolves to a same-origin path. Resolving the binding
 *  must decide the verdict, not the fact that a binding was used. */
const PREVIEW_PATH = '/preview/document';

export function Preview() {
  return <iframe src={PREVIEW_PATH} title="Preview" />;
}
