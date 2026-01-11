'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const NumberTickerContent = dynamic(
  () => import('./number-ticker-content').then((m) => m.NumberTickerContent),
  { 
    ssr: false,
    loading: () => <span className="inline-block tabular-nums tracking-wider opacity-50">...</span>
  }
);

export function NumberTicker(props: {
  value: number;
  direction?: "up" | "down";
  className?: string;
  delay?: number;
  decimalPlaces?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className="inline-block tabular-nums tracking-wider opacity-0">...</span>;
  }

  return <NumberTickerContent {...props} />;
}
