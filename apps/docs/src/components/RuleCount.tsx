'use client';

import React from 'react';
import { usePluginInfo } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface RuleCountProps {
  plugin: string;
}

export function RuleCount({ plugin }: RuleCountProps) {
  const { data: pluginInfo, isLoading } = usePluginInfo(plugin);
  
  if (isLoading) {
    return (
      <span className="inline-block w-6 h-4 mx-1 bg-fd-muted rounded-sm animate-pulse align-middle" />
    );
  }
  
  return <span className="font-bold">{pluginInfo?.rules ?? '?'}</span>;
}
