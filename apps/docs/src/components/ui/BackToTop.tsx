'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const BackToTopContent = dynamic(
  () => import('./BackToTopContent').then((m) => m.BackToTop),
  { ssr: false }
);

export function BackToTop() {
  return <BackToTopContent />;
}
