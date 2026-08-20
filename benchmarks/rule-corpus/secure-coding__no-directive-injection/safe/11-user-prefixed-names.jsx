/**
 * SAFE - Four identifiers beginning with `user`, none of them user input:
 * `userManualHtml` is a build-time import of the product manual,
 * `userAgentLabel` is derived from navigator, `username` is the signed-in
 * account, `userPreferences` is local state.
 *
 * The old test was `varName.startsWith('user')`, which made every one of these
 * a CWE-96 finding in any React codebase with a user model — which is all of
 * them.
 */
import React from 'react';
import userManualHtml from './manual.html';

export function AccountPanel({ username, userPreferences, userAgentLabel }) {
  return (
    <aside className={userPreferences.theme}>
      <h3>{username}</h3>
      <p>{userAgentLabel}</p>
      <div dangerouslySetInnerHTML={{ __html: userManualHtml }} />
    </aside>
  );
}
