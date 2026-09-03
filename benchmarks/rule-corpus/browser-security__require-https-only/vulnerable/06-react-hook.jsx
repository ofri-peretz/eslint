/**
 * VULNERABLE - The idiomatic React data hook. The request runs on every mount,
 * from every user's network.
 */
import { useEffect, useState } from 'react';

export function useProfile(id) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    fetch(`http://api.acme-corp.io/v1/profiles/${id}`)
      .then((r) => r.json())
      .then(setProfile);
  }, [id]);
  return profile;
}
