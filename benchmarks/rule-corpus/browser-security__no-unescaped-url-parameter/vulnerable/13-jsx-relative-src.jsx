/**
 * VULNERABLE - A relative URL in a JSX `src`. The attribute is the sink that
 * makes the path a URL, and the interpolated value is an exported component's
 * prop, so this module cannot know it.
 */
export function Avatar({ userId }) {
  return <img src={`/api/v1/avatars?user=${userId}`} alt="" />;
}
