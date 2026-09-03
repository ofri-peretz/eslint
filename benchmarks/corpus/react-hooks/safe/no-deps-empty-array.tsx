// react/exhaustive-deps — safe, no closures so empty deps is correct
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — effect closes over nothing reactive, mount-only is intentional
import { useEffect } from 'react';

export function MountLogger() {
  useEffect(() => {
    console.log('component mounted');
    return () => console.log('component unmounted');
  }, []);
  return null;
}
