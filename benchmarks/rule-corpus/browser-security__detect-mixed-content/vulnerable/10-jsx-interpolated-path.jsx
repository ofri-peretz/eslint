/**
 * VULNERABLE - The path is dynamic, the scheme is not. `no-http-urls` declines
 * a template whose authority is interpolated, so if this rule did not read
 * templates the shape would belong to nobody.
 */
export function Thumb({ id }) {
  return <img src={`http://cdn.acme-corp.io/thumbs/${id}.png`} alt="" />;
}
