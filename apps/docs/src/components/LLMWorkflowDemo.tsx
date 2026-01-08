'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare,
  Code2,
  ArrowRight,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BorderBeam } from './ui/border-beam';

interface Step {
  id: number;
  title: string;
  subtitle: string;
}

const steps: Step[] = [
  { id: 1, title: 'Detect', subtitle: 'ESLint catches the vulnerability' },
  { id: 2, title: 'Understand', subtitle: 'AI reads structured metadata' },
  { id: 3, title: 'Fix', subtitle: 'Accurate remediation applied' },
];

export function LLMWorkflowDemo() {
  const [activeStep, setActiveStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isPlaying || isHovered) return;
    
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 4000);

    return () => clearInterval(interval);
  }, [isPlaying, isHovered]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Marketing Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold mb-4">
          <Sparkles className="size-4" />
          <span>See It In Action</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-fd-foreground mb-4">
          From Error to Fix{' '}
          <span className="bg-linear-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            in Seconds
          </span>
        </h2>
        <p className="text-fd-muted-foreground text-lg max-w-2xl mx-auto">
          Watch how AI assistants use our structured metadata to understand vulnerabilities 
          and generate accurate fixes — no hallucinations, no guesswork.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            className={cn(
              'flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300',
              activeStep === step.id
                ? 'bg-fd-card border border-purple-500/50 shadow-lg shadow-purple-500/20'
                : 'hover:bg-fd-card/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                activeStep === step.id
                  ? 'bg-purple-500 text-white'
                  : activeStep > step.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-fd-muted text-fd-muted-foreground'
              )}
            >
              {activeStep > step.id ? <CheckCircle2 className="size-4" /> : step.id}
            </div>
            <div className="text-left hidden sm:block">
              <div className={cn(
                'text-sm font-semibold',
                activeStep === step.id ? 'text-fd-foreground' : 'text-fd-muted-foreground'
              )}>
                {step.title}
              </div>
              <div className="text-xs text-fd-muted-foreground">{step.subtitle}</div>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="size-4 text-fd-muted-foreground ml-2 hidden md:block" />
            )}
          </button>
        ))}
        
        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="ml-4 p-2 rounded-full bg-fd-card border border-fd-border hover:border-purple-500/50 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>

      {/* Demo Container */}
      <div 
        className="relative rounded-2xl overflow-hidden border border-fd-border bg-fd-card dark:bg-[#0d1117] shadow-2xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <BorderBeam size={300} duration={15} colorFrom="#8b5cf6" colorTo="#10b981" />
        
        {/* Window Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-fd-muted/50 dark:bg-[#161b22] border-b border-fd-border dark:border-[#30363d]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex items-center gap-2 text-xs text-fd-muted-foreground dark:text-[#8b949e] font-mono">
            <Code2 className="size-4" />
            <span>src/api/users.ts</span>
          </div>
          <div className="w-20" />
        </div>

        {/* Content Area */}
        <div className="min-h-[400px] md:min-h-[450px]">
          <AnimatePresence mode="wait">
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                {/* Code Editor with Error */}
                <div className="font-mono text-sm">
                  <div className="flex items-center gap-4 text-fd-muted-foreground dark:text-[#8b949e] mb-4">
                    <span className="text-fd-muted-foreground/60 dark:text-[#6e7681] select-none w-8 text-right">18</span>
                    <span className="text-purple-600 dark:text-[#ff7b72]">async function</span>
                    <span className="text-blue-600 dark:text-[#d2a8ff]">getUserById</span>
                    <span className="text-fd-foreground dark:text-[#c9d1d9]">(userId: string) {'{'}</span>
                  </div>
                  
                  {/* Error Line */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-red-500/10 rounded" />
                    <div className="flex items-center gap-4 relative">
                      <span className="text-fd-muted-foreground/60 dark:text-[#6e7681] select-none w-8 text-right">19</span>
                      <span className="text-fd-foreground dark:text-[#c9d1d9]">  </span>
                      <span className="text-purple-600 dark:text-[#ff7b72]">const</span>
                      <span className="text-fd-foreground dark:text-[#c9d1d9]"> query = </span>
                      <span className="text-emerald-700 dark:text-[#a5d6ff] underline decoration-wavy decoration-red-500">"SELECT * FROM users WHERE id = "</span>
                      <span className="text-fd-foreground dark:text-[#c9d1d9]"> + userId;</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-fd-muted-foreground dark:text-[#8b949e] mt-4">
                    <span className="text-fd-muted-foreground/60 dark:text-[#6e7681] select-none w-8 text-right">20</span>
                    <span className="text-fd-foreground dark:text-[#c9d1d9]">  </span>
                    <span className="text-purple-600 dark:text-[#ff7b72]">return</span>
                    <span className="text-fd-foreground dark:text-[#c9d1d9]"> db.query(query);</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-fd-muted-foreground dark:text-[#8b949e] mt-4">
                    <span className="text-fd-muted-foreground/60 dark:text-[#6e7681] select-none w-8 text-right">21</span>
                    <span className="text-fd-foreground dark:text-[#c9d1d9]">{'}'}</span>
                  </div>
                </div>

                {/* ESLint Error Popup */}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mt-6 p-4 rounded-lg bg-fd-card dark:bg-[#21262d] border border-red-500/30 shadow-xl"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-[#ff9e64] border border-orange-500/20">
                          CWE-89
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-[#7aa2f7] border border-blue-500/20">
                          OWASP:A03
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/10 text-red-600 dark:text-[#f7768e] border border-red-500/20">
                          CVSS:9.8
                        </span>
                      </div>
                      <p className="text-red-700 dark:text-[#f85149] font-semibold mb-1">
                        SQL Injection via String Concatenation
                      </p>
                      <p className="text-fd-muted-foreground dark:text-[#8b949e] text-sm">
                        💡 Fix: Use parameterized query: <code className="text-emerald-600 dark:text-emerald-400">db.query('SELECT * FROM users WHERE id = $1', [userId])</code>
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                {/* VS Code Copilot-style Chat */}
                <div className="space-y-4">
                  {/* User Message */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      U
                    </div>
                    <div className="flex-1 p-3 rounded-lg bg-fd-muted/50 dark:bg-[#21262d] border border-fd-border dark:border-[#30363d]">
                      <p className="text-fd-foreground dark:text-[#c9d1d9]">How do I fix this security vulnerability?</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
                      <Sparkles className="size-4 text-white" />
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex-1 p-4 rounded-lg bg-fd-card dark:bg-[#21262d] border border-emerald-500/30"
                    >
                      <p className="text-fd-foreground dark:text-[#c9d1d9] mb-3">
                        I can see from the ESLint error metadata that this is a <strong className="text-red-600 dark:text-red-400">critical security vulnerability</strong>:
                      </p>
                      
                      <div className="space-y-2 mb-4 pl-4 border-l-2 border-emerald-500/50">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-orange-600 dark:text-[#ff9e64] font-mono font-bold">CWE-89</span>
                          <span className="text-fd-muted-foreground dark:text-[#8b949e]">— Improper Neutralization of SQL Commands</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-blue-600 dark:text-[#7aa2f7] font-mono font-bold">OWASP A03</span>
                          <span className="text-fd-muted-foreground dark:text-[#8b949e]">— Injection (Top 10 Category)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-600 dark:text-[#f7768e] font-mono font-bold">CVSS 9.8</span>
                          <span className="text-fd-muted-foreground dark:text-[#8b949e]">— Critical severity, immediate action required</span>
                        </div>
                      </div>

                      <p className="text-fd-foreground dark:text-[#c9d1d9] mb-2">
                        Based on the structured fix suggestion, you need to use <strong className="text-emerald-600 dark:text-emerald-400">parameterized queries</strong> instead of string concatenation:
                      </p>

                      <div className="p-3 rounded bg-fd-muted dark:bg-[#161b22] font-mono text-sm border border-fd-border dark:border-transparent">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">// Replace line 19 with:</span>
                        <br />
                        <span className="text-fd-foreground dark:text-[#c9d1d9]">const result = await db.query(</span>
                        <br />
                        <span className="text-emerald-700 dark:text-[#a5d6ff]">  'SELECT * FROM users WHERE id = $1'</span>
                        <span className="text-fd-foreground dark:text-[#c9d1d9]">,</span>
                        <br />
                        <span className="text-fd-foreground dark:text-[#c9d1d9]">  [userId]</span>
                        <br />
                        <span className="text-fd-foreground dark:text-[#c9d1d9]">);</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                {/* Fixed Code */}
                <div className="font-mono text-sm mb-6">
                  <div className="flex items-center gap-4 text-fd-muted-foreground dark:text-[#8b949e] mb-4">
                    <span className="text-fd-muted-foreground/60 dark:text-[#6e7681] select-none w-8 text-right">18</span>
                    <span className="text-purple-600 dark:text-[#ff7b72]">async function</span>
                    <span className="text-blue-600 dark:text-[#d2a8ff]">getUserById</span>
                    <span className="text-fd-foreground dark:text-[#c9d1d9]">(userId: string) {'{'}</span>
                  </div>
                  
                  {/* Fixed Line */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded" />
                    <div className="flex items-start gap-4 relative py-1">
                      <span className="text-fd-muted-foreground/60 dark:text-[#6e7681] select-none w-8 text-right">19</span>
                      <div>
                        <span className="text-purple-600 dark:text-[#ff7b72]">const</span>
                        <span className="text-fd-foreground dark:text-[#c9d1d9]"> result = </span>
                        <span className="text-purple-600 dark:text-[#ff7b72]">await</span>
                        <span className="text-fd-foreground dark:text-[#c9d1d9]"> db.query(</span>
                        <br />
                        <span className="text-fd-foreground dark:text-[#c9d1d9] ml-4">  </span>
                        <span className="text-emerald-700 dark:text-[#a5d6ff]">'SELECT * FROM users WHERE id = $1'</span>
                        <span className="text-fd-foreground dark:text-[#c9d1d9]">,</span>
                        <br />
                        <span className="text-fd-foreground dark:text-[#c9d1d9] ml-4">  [userId]</span>
                        <br />
                        <span className="text-fd-foreground dark:text-[#c9d1d9]">);</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-fd-muted-foreground dark:text-[#8b949e] mt-4">
                    <span className="text-fd-muted-foreground/60 dark:text-[#6e7681] select-none w-8 text-right">23</span>
                    <span className="text-purple-600 dark:text-[#ff7b72]">return</span>
                    <span className="text-fd-foreground dark:text-[#c9d1d9]"> result.rows[0];</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-fd-muted-foreground dark:text-[#8b949e] mt-4">
                    <span className="text-fd-muted-foreground/60 dark:text-[#6e7681] select-none w-8 text-right">24</span>
                    <span className="text-fd-foreground dark:text-[#c9d1d9]">{'}'}</span>
                  </div>
                </div>

                {/* Success Message */}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-emerald-700 dark:text-emerald-400 font-semibold mb-2">
                        Vulnerability Resolved ✓
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-fd-muted-foreground dark:text-[#8b949e]">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-emerald-500" />
                          <span>SQL Injection prevented</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-emerald-500" />
                          <span>Parameterized query used</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-emerald-500" />
                          <span>OWASP A03 compliant</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Comparison Stats */}
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-fd-muted dark:bg-[#21262d]">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">~5s</div>
                    <div className="text-xs text-fd-muted-foreground dark:text-[#8b949e]">Time to Fix</div>
                  </div>
                  <div className="p-3 rounded-lg bg-fd-muted dark:bg-[#21262d]">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">100%</div>
                    <div className="text-xs text-fd-muted-foreground dark:text-[#8b949e]">Accuracy</div>
                  </div>
                  <div className="p-3 rounded-lg bg-fd-muted dark:bg-[#21262d]">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">0</div>
                    <div className="text-xs text-fd-muted-foreground dark:text-[#8b949e]">Hallucinations</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-8">
        <p className="text-fd-muted-foreground text-sm">
          Works with <span className="text-fd-foreground font-medium">GitHub Copilot</span>, 
          <span className="text-fd-foreground font-medium"> Cursor</span>, 
          <span className="text-fd-foreground font-medium"> Claude</span>, and any AI assistant that reads ESLint output.
        </p>
      </div>
    </div>
  );
}
