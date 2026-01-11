'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, Terminal, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeam } from './TeamContext';

export function TeamSwitcher() {
  const pathname = usePathname();
  const { currentTeam: activeTeamId } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  
  const teams = [
    {
      id: 'security',
      title: 'Security Team',
      description: 'Core security rules & compliance',
      url: '/docs/secure-coding',
      icon: <Shield className="size-4" />,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    },
    {
      id: 'architecture',
      title: 'Architecture Team',
      description: 'Structural integrity & best practices',
      url: '/docs/import-next',
      icon: <Terminal className="size-4" />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    }
  ];

  const currentTeam = teams.find(t => pathname.startsWith(t.url)) || teams[0];

  return (
    <div className="relative mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-2.5 rounded-xl border border-fd-border bg-fd-card/50 hover:bg-fd-accent/50 transition-all duration-300 group shadow-sm active:scale-[0.98]"
      >
        <div className={cn(
          "flex items-center justify-center size-9 rounded-lg border shadow-sm transition-transform duration-300 group-hover:scale-110",
          currentTeam.bg,
          currentTeam.border,
          currentTeam.color
        )}>
          {currentTeam.icon}
        </div>
        <div className="flex flex-col items-start truncate overflow-hidden text-left">
          <span className="text-sm font-black tracking-tight text-fd-foreground">
            {currentTeam.title}
          </span>
          <span className="text-[10px] text-fd-muted-foreground font-bold uppercase tracking-widest opacity-70">
            ESLint Registry
          </span>
        </div>
        <ChevronDown className={cn(
          "ml-auto size-4 text-fd-muted-foreground transition-transform duration-300",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl border border-fd-border bg-fd-popover shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={team.url}
                onClick={() => setIsOpen(false)}
                data-team={team.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-fd-accent group/item mb-1 last:mb-0",
                  currentTeam.id === team.id && "bg-fd-accent/50"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center size-8 rounded-lg border shrink-0 transition-transform duration-300 group-hover/item:scale-110",
                  team.bg,
                  team.border,
                  team.color
                )}>
                  {team.icon}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-bold text-fd-foreground">{team.title}</span>
                  <span className="text-[10px] text-fd-muted-foreground leading-tight">{team.description}</span>
                </div>
                {currentTeam.id === team.id && (
                  <Check className="size-4 text-fd-primary shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
