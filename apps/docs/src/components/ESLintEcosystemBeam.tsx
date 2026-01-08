'use client';

import { forwardRef, useRef } from 'react';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { cn } from '@/lib/utils';
import { 
  Bot, 
  Code2, 
  MonitorSmartphone, 
  Shield, 
  Zap 
} from 'lucide-react';

// Circle component for nodes
const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'z-10 flex size-12 items-center justify-center rounded-full border-2 bg-fd-card p-3 shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = 'Circle';

export function ESLintEcosystemBeam({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const llmRef = useRef<HTMLDivElement>(null);
  const ideRef = useRef<HTMLDivElement>(null);
  const eslintRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const shieldRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn(
        'relative flex w-full max-w-lg items-center justify-center overflow-hidden rounded-xl border border-fd-border bg-fd-card p-10',
        className
      )}
      ref={containerRef}
    >
      <div className="flex size-full flex-col items-stretch justify-between gap-10">
        {/* Top row: LLM and IDE */}
        <div className="flex flex-row items-center justify-between">
          <Circle ref={llmRef} className="border-violet-500/50 bg-violet-500/10">
            <Bot className="size-6 text-violet-400" />
          </Circle>
          <Circle ref={ideRef} className="border-blue-500/50 bg-blue-500/10">
            <MonitorSmartphone className="size-6 text-blue-400" />
          </Circle>
        </div>

        {/* Middle row: ESLint (center) */}
        <div className="flex flex-row items-center justify-center">
          <Circle ref={eslintRef} className="size-16 border-purple-500 bg-purple-500/20 shadow-purple-500/30 shadow-xl">
            <Zap className="size-8 text-purple-400" />
          </Circle>
        </div>

        {/* Bottom row: Code and Security */}
        <div className="flex flex-row items-center justify-between">
          <Circle ref={codeRef} className="border-emerald-500/50 bg-emerald-500/10">
            <Code2 className="size-6 text-emerald-400" />
          </Circle>
          <Circle ref={shieldRef} className="border-amber-500/50 bg-amber-500/10">
            <Shield className="size-6 text-amber-400" />
          </Circle>
        </div>
      </div>

      {/* Animated beams connecting all nodes to ESLint */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={llmRef}
        toRef={eslintRef}
        curvature={-75}
        gradientStartColor="#8b5cf6"
        gradientStopColor="#a855f7"
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={ideRef}
        toRef={eslintRef}
        curvature={75}
        gradientStartColor="#3b82f6"
        gradientStopColor="#8b5cf6"
        duration={4}
        delay={0.5}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={eslintRef}
        toRef={codeRef}
        curvature={-75}
        gradientStartColor="#a855f7"
        gradientStopColor="#10b981"
        duration={4}
        delay={1}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={eslintRef}
        toRef={shieldRef}
        curvature={75}
        gradientStartColor="#a855f7"
        gradientStopColor="#f59e0b"
        duration={4}
        delay={1.5}
      />
    </div>
  );
}

// Labels component to explain the ecosystem
export function ESLintEcosystemWithLabels({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <ESLintEcosystemBeam />
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-fd-muted-foreground">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-violet-400" />
          <span>AI Assistants</span>
        </div>
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-blue-400" />
          <span>IDEs & Editors</span>
        </div>
        <div className="flex items-center gap-2">
          <Code2 className="size-4 text-emerald-400" />
          <span>Your Code</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-amber-400" />
          <span>Security Rules</span>
        </div>
      </div>
    </div>
  );
}
