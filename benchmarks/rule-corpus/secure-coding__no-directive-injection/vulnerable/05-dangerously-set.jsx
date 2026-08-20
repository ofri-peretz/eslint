/**
 * VULNERABLE - React's escape hatch, fed straight from the request. The
 * component is a profile renderer and the bio is whatever the visitor typed.
 */
import React from 'react';

export function ProfileBio({ req }) {
  return (
    <section className="profile">
      <h2>About</h2>
      <div dangerouslySetInnerHTML={{ __html: req.body.bio }} />
    </section>
  );
}
