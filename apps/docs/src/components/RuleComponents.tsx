'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const FalseNegativeCTAContent = dynamic(
  () => import('./RuleComponentsContent').then((m) => m.FalseNegativeCTA),
  { 
    ssr: false,
    loading: () => <div className="h-20 bg-fd-card/10 rounded-lg animate-pulse my-6" />
  }
);

const WhenNotToUseContent = dynamic(
  () => import('./RuleComponentsContent').then((m) => m.WhenNotToUse),
  { 
    ssr: false,
    loading: () => <div className="h-32 bg-fd-card/10 rounded-lg animate-pulse my-8" />
  }
);

export function FalseNegativeCTA() {
  return <FalseNegativeCTAContent />;
}

export function WhenNotToUse(props: any) {
  return <WhenNotToUseContent {...props} />;
}
