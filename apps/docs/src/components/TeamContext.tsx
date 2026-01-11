'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { usePathname } from 'next/navigation';

export type TeamId = 'security' | 'architecture';

interface TeamContextValue {
  currentTeam: TeamId;
  isSecurityTeam: boolean;
  isArchitectureTeam: boolean;
}

const TeamContext = createContext<TeamContextValue>({
  currentTeam: 'security',
  isSecurityTeam: true,
  isArchitectureTeam: false,
});

export function useTeam() {
  return useContext(TeamContext);
}

interface TeamProviderProps {
  children: React.ReactNode;
}

/**
 * TeamProvider determines the current team based on the URL pathname.
 * - /docs/import-next/* = Architecture Team
 * - /docs/architecture/* = Architecture Team  
 * - Everything else = Security Team (default)
 */
export function TeamProvider({ children }: TeamProviderProps) {
  const pathname = usePathname();

  const value = useMemo<TeamContextValue>(() => {
    const isArchitectureTeam = 
      pathname.startsWith('/docs/import-next') ||
      pathname.startsWith('/docs/architecture');
    
    const currentTeam: TeamId = isArchitectureTeam ? 'architecture' : 'security';
    
    return {
      currentTeam,
      isSecurityTeam: !isArchitectureTeam,
      isArchitectureTeam,
    };
  }, [pathname]);

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

/**
 * Utility component to conditionally show content based on team
 */
export function TeamOnly({ 
  team, 
  children 
}: { 
  team: TeamId | TeamId[]; 
  children: React.ReactNode;
}) {
  const { currentTeam } = useTeam();
  const teams = Array.isArray(team) ? team : [team];
  
  if (!teams.includes(currentTeam)) {
    return null;
  }
  
  return <>{children}</>;
}
