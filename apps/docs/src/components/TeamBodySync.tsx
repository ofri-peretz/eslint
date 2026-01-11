'use client';

import { useEffect } from 'react';
import { useTeam } from './TeamContext';

/**
 * Sets data-team attribute on body element for CSS-based team visibility.
 * Must be rendered inside TeamProvider.
 */
export function TeamBodySync() {
  const { currentTeam } = useTeam();

  useEffect(() => {
    document.body.setAttribute('data-team', currentTeam);
    
    return () => {
      document.body.removeAttribute('data-team');
    };
  }, [currentTeam]);

  return null;
}
