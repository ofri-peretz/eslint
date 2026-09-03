// react/exhaustive-deps — missing dependency
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — `userId` is closed over but missing from deps
import { useEffect, useState } from 'react';

export function Profile({ userId }: { userId: string }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${userId}`).then((r) => r.json()).then(setData);
  }, []);
  return <div>{JSON.stringify(data)}</div>;
}
