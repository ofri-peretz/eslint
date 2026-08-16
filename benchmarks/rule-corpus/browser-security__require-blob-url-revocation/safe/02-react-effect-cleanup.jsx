/**
 * SAFE - The correct React remediation: the effect returns a cleanup that
 * releases the handle on unmount and before each re-run.
 */
import { useEffect, useState } from 'react';

export function FilePreview({ file }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <img alt="preview" src={src} />;
}
