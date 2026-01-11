'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const LLMErrorDemoContent = dynamic(
  () => import('./LLMErrorDemoContent').then((m) => m.LLMErrorDemoContent),
  { 
    ssr: false,
    loading: () => <div className="h-64 w-full bg-fd-card/10 rounded-xl animate-pulse" />
  }
);

export function LLMErrorDemo() {
  return <LLMErrorDemoContent />;
}
