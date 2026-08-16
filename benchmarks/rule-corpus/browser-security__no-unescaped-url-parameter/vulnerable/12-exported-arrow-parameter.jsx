/**
 * VULNERABLE - The arrow-function spelling of an exported builder, rendered
 * into a JSX `href`. Same unknowable caller, different syntax.
 */
export const ProfileLink = ({ handle }) => (
  <a href={`https://social.example.com/u/${handle}/posts`}>Profile</a>
);
