'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Standard Full Isolation Pattern for Recharts
// Per troubleshooting docs Section 14.9: This pattern was verified working
const BenchmarkChartsContent = dynamic(
  () => import('./BenchmarkChartsContent').then((m) => m.BenchmarkChartsContent),
  { 
    ssr: false,
    loading: () => <BenchmarkChartsSkeleton />
  }
);

export function BenchmarkCharts() {
  return <BenchmarkChartsContent />;
}

// Loading skeleton for BenchmarkCharts
function BenchmarkChartsSkeleton() {
  return (
    <div className="space-y-10 my-8 animate-pulse">
      {/* Hero Stats Skeleton */}
      <section>
        <div className="h-8 bg-[#2d3548] rounded w-48 mx-auto mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-5 h-24" />
          ))}
        </div>
      </section>
      {/* Chart Skeleton */}
      <section>
        <div className="h-8 bg-[#2d3548] rounded w-64 mb-4" />
        <div className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl p-4 h-64" />
      </section>
    </div>
  );
}
