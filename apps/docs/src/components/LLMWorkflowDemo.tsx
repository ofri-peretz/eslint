'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LLMWorkflowDemoContent = dynamic(
  () => import('./LLMWorkflowDemoContent').then((m) => m.LLMWorkflowDemoContent),
  { 
    ssr: false,
    loading: () => <div className="w-full max-w-6xl mx-auto min-h-[500px] animate-pulse bg-fd-card/10 rounded-3xl" />
  }
);

export function LLMWorkflowDemo() {
  const [activeStep, setActiveStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isPlaying || isHovered) return;
    
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, isHovered]);

  return (
    <LLMWorkflowDemoContent 
      activeStep={activeStep}
      setActiveStep={setActiveStep}
      isPlaying={isPlaying}
      setIsPlaying={setIsPlaying}
      isHovered={isHovered}
      setIsHovered={setIsHovered}
    />
  );
}
