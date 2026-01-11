"use client"

import dynamic from 'next/dynamic';
import React from 'react';
import type { AnimatedBeamProps } from './animated-beam-content';

const AnimatedBeamContent = dynamic(
  () => import('./animated-beam-content').then(m => m.AnimatedBeamContent),
  { ssr: false }
);

export const AnimatedBeam: React.FC<AnimatedBeamProps> = (props) => {
  return <AnimatedBeamContent {...props} />;
}
