// react/exhaustive-deps — safe, all deps listed
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — all closed-over reactive values are in deps
import { useEffect, useState } from 'react';

export function Profile({ userId }: { userId: string }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${userId}`).then((r) => r.json()).then(setData);
  }, [userId]);
  return <div>{JSON.stringify(data)}</div>;
}
