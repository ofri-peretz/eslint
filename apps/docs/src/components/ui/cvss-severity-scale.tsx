'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { BorderBeam } from './border-beam';

interface SeverityLevel {
  range: string;
  min: number;
  max: number;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  examples: string[];
}

const severityLevels: SeverityLevel[] = [
  {
    range: '0.0-3.9',
    min: 0,
    max: 3.9,
    label: 'Low',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    description: 'Minimal impact. Unlikely to be exploited or limited consequences.',
    examples: ['Information disclosure of non-sensitive data', 'Minor functionality bypass'],
  },
  {
    range: '4.0-6.9',
    min: 4,
    max: 6.9,
    label: 'Medium',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Moderate impact. May require specific conditions to exploit.',
    examples: ['XSS requiring user interaction', 'Partial data exposure'],
  },
  {
    range: '7.0-8.9',
    min: 7,
    max: 8.9,
    label: 'High',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    description: 'Significant impact. Relatively easy to exploit with serious consequences.',
    examples: ['SQL injection', 'Authentication bypass', 'Privilege escalation'],
  },
  {
    range: '9.0-10.0',
    min: 9,
    max: 10,
    label: 'Critical',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'Maximum impact. Easily exploited with devastating consequences.',
    examples: ['Remote code execution', 'Complete system compromise', 'Mass data breach'],
  },
];

export function CVSSSeverityScale() {
  const [selectedLevel, setSelectedLevel] = useState<SeverityLevel | null>(null);
  const [hoverScore, setHoverScore] = useState<number | null>(null);

  const getScoreColor = (score: number) => {
    if (score < 4) return 'text-gray-400';
    if (score < 7) return 'text-amber-400';
    if (score < 9) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="my-8 space-y-6">
      {/* Interactive Score Slider */}
      <div className="relative rounded-xl border border-fd-border bg-fd-card p-6 overflow-hidden">
        <BorderBeam colorFrom="#ff6b6b" colorTo="#9c40ff" duration={10} />
        
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold text-fd-foreground">CVSS Score Explorer</h4>
          {hoverScore !== null && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn("text-2xl font-bold tabular-nums", getScoreColor(hoverScore))}
            >
              {hoverScore.toFixed(1)}
            </motion.span>
          )}
        </div>

        {/* Score Track */}
        <div 
          className="relative h-12 rounded-lg bg-gradient-to-r from-gray-500/20 via-amber-500/20 via-orange-500/20 to-red-500/20 cursor-pointer overflow-hidden"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const score = (x / rect.width) * 10;
            setHoverScore(Math.min(10, Math.max(0, Math.round(score * 10) / 10)));
          }}
          onMouseLeave={() => setHoverScore(null)}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-500/30 via-amber-500/30 via-60% via-orange-500/30 to-red-500/50 opacity-50" />
          
          {/* Score markers */}
          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium text-fd-muted-foreground">
            <span>0</span>
            <span className="text-gray-400">|</span>
            <span className="text-amber-400">4</span>
            <span className="text-amber-400">|</span>
            <span className="text-orange-400">7</span>
            <span className="text-orange-400">|</span>
            <span className="text-red-400">9</span>
            <span className="text-red-400">|</span>
            <span>10</span>
          </div>

          {/* Hover indicator */}
          {hoverScore !== null && (
            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg shadow-white/20"
              style={{ left: `${(hoverScore / 10) * 100}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
        </div>

        <p className="mt-3 text-xs text-fd-muted-foreground text-center">
          Hover over the scale to explore different severity scores
        </p>
      </div>

      {/* Severity Level Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {severityLevels.map((level, index) => (
          <motion.button
            key={level.label}
            onClick={() => setSelectedLevel(selectedLevel?.label === level.label ? null : level)}
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-300 text-left",
              level.bgColor,
              level.borderColor,
              selectedLevel?.label === level.label 
                ? "ring-2 ring-offset-2 ring-offset-fd-background" 
                : "hover:scale-[1.02]",
              selectedLevel?.label === level.label && level.label === 'Low' && 'ring-gray-400',
              selectedLevel?.label === level.label && level.label === 'Medium' && 'ring-amber-400',
              selectedLevel?.label === level.label && level.label === 'High' && 'ring-orange-400',
              selectedLevel?.label === level.label && level.label === 'Critical' && 'ring-red-400',
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: selectedLevel?.label === level.label ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={cn("text-xl font-bold mb-1", level.color)}>
              {level.range}
            </div>
            <div className="text-sm font-medium text-fd-foreground">
              {level.label}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {selectedLevel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "rounded-xl border p-5",
              selectedLevel.bgColor,
              selectedLevel.borderColor
            )}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold",
                  selectedLevel.bgColor,
                  selectedLevel.color
                )}>
                  {selectedLevel.range.split('-')[1]}
                </div>
                <div className="flex-1">
                  <h5 className={cn("font-semibold mb-2", selectedLevel.color)}>
                    {selectedLevel.label} Severity
                  </h5>
                  <p className="text-sm text-fd-muted-foreground mb-3">
                    {selectedLevel.description}
                  </p>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-fd-muted-foreground">Examples:</span>
                    <ul className="text-sm text-fd-foreground space-y-1">
                      {selectedLevel.examples.map((example, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-2"
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", selectedLevel.color.replace('text-', 'bg-'))} />
                          {example}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
