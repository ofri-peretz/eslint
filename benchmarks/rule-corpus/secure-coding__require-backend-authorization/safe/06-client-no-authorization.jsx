/**
 * SAFE - A browser component with a branch that is not an authorisation
 * decision. Client-side code is not the problem; client-side ENFORCEMENT is.
 */
import React from 'react';

import { DraftBadge } from './DraftBadge';

export function PostHeader({ post }) {
  if (post.published) {
    return <h1>{post.title}</h1>;
  }

  return (
    <h1>
      {post.title} <DraftBadge />
    </h1>
  );
}
