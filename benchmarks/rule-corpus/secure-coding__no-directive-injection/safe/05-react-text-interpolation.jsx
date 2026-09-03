/**
 * SAFE - React's default escaping. `{bio}` renders as text no matter what the
 * user typed; only `dangerouslySetInnerHTML` bypasses it (see
 * vulnerable/05-dangerously-set.jsx). A rule that reports any JSX carrying
 * request data would report this.
 */
export function ProfileCard({ profile }) {
  const bio = profile.userSuppliedBio;
  return (
    <article className="profile-card">
      <h2>{profile.displayName}</h2>
      <p>{bio}</p>
    </article>
  );
}
