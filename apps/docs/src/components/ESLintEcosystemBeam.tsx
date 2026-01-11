'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const ESLintEcosystemBeamContent = dynamic(
  () => import('./ESLintEcosystemBeamContent').then((m) => m.ESLintEcosystemBeam),
  { 
    ssr: false,
    loading: () => <div className="h-64 w-full bg-fd-card/10 rounded-xl animate-pulse" />
  }
);

const ESLintEcosystemWithLabelsContent = dynamic(
  () => import('./ESLintEcosystemBeamContent').then((m) => m.ESLintEcosystemWithLabels),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center gap-4">
        <div className="h-64 w-full bg-fd-card/10 rounded-xl animate-pulse" />
        <div className="h-10 w-full bg-fd-card/5 rounded-lg animate-pulse" />
      </div>
    )
  }
);

export function ESLintEcosystemBeam(props: any) {
  return <ESLintEcosystemBeamContent {...props} />;
}

export function ESLintEcosystemWithLabels(props: any) {
  return <ESLintEcosystemWithLabelsContent {...props} />;
}
