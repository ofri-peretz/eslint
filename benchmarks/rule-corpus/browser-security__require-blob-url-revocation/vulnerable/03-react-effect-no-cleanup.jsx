/**
 * VULNERABLE - A React effect that creates a preview URL and returns no cleanup.
 * Every re-render with a new file leaks another Blob.
 */
import { useEffect, useState } from 'react';

export function FilePreview({ file }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
  }, [file]);
  return <img alt="preview" src={src} />;
}
