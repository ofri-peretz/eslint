'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const EcosystemStatsContent = dynamic(
  () => import('./EcosystemStatsContent').then((m) => m.EcosystemStats),
  { 
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative p-6 h-[180px] rounded-2xl border bg-fd-card/20 animate-pulse" />
        ))}
      </div>
    )
  }
);

export function EcosystemStats() {
  return <EcosystemStatsContent />;
}
