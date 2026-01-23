'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/**
 * Mermaid Dynamic Wrapper
 * Implements the "Full Isolation Pattern" to prevent Turbopack hydration crashes.
 * Resolves: 'chunk.reason.enqueueModel is not a function' error.
 */
const MermaidContent = dynamic(
  () => import('./MermaidContent').then((m) => m.MermaidContent),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full my-12 rounded-[2.5rem] border border-violet-500/10 bg-fd-card/50 h-[600px] flex items-center justify-center animate-pulse">
        <Loader2 className="size-10 animate-spin text-violet-500/20" />
      </div>
    ) 
  }
);

export function Mermaid({ chart, children }: { chart?: string; children?: React.ReactNode }) {
  // Recursively extract text from children if chart prop is missing
  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    // Handle React elements (v-nodes)
    if (node.props?.children) return extractText(node.props.children);
    // Handle potential MDX/code structures
    if (node.type === 'code' || node.type === 'pre') return extractText(node.props.children);
    return '';
  };

  const chartSource = chart || extractText(children);
  
  if (!chartSource || chartSource.trim().length === 0) {
    return null;
  }
  
  // Pass to MermaidContent for client-side rendering
  // We trim and ensure no weird trailing characters from MDX
  return <MermaidContent chart={chartSource.trim()} />;
}
