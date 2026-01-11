'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { BorderBeam } from './border-beam';
import { Shield, Bug, Gauge, AlertTriangle, Database, ExternalLink } from 'lucide-react';

interface Standard {
  id: string;
  name: string;
  fullName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  description: string;
  example: string;
  link: string;
}

const standards: Standard[] = [
  {
    id: 'cwe',
    name: 'CWE',
    fullName: 'Common Weakness Enumeration',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    icon: Bug,
    description: 'Classifies types of software weaknesses. Think of it as the "species" of security bugs.',
    example: 'CWE-89: SQL Injection',
    link: 'https://cwe.mitre.org/',
  },
  {
    id: 'cve',
    name: 'CVE',
    fullName: 'Common Vulnerabilities & Exposures',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: AlertTriangle,
    description: 'Unique IDs for specific vulnerabilities found in products. Each CVE is a single "specimen".',
    example: 'CVE-2023-46132',
    link: 'https://cve.mitre.org/',
  },
  {
    id: 'cvss',
    name: 'CVSS',
    fullName: 'Common Vulnerability Scoring System',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: Gauge,
    description: 'Scores vulnerability severity from 0-10. Used to prioritize remediation efforts.',
    example: '9.8 Critical',
    link: 'https://www.first.org/cvss/',
  },
  {
    id: 'owasp',
    name: 'OWASP',
    fullName: 'Open Web Application Security Project',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: Shield,
    description: 'Top 10 risk categories for web, mobile, and serverless applications.',
    example: 'A03:2021 Injection',
    link: 'https://owasp.org/',
  },
  {
    id: 'nvd',
    name: 'NVD',
    fullName: 'National Vulnerability Database',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: Database,
    description: 'U.S. government database that enriches CVEs with CVSS scores, CWE mappings, and more.',
    example: 'nvd.nist.gov',
    link: 'https://nvd.nist.gov/',
  },
];

export function SecurityStandardsExplorer() {
  const [selected, setSelected] = useState<Standard | null>(null);

  return (
    <div className="my-8 space-y-6">
      {/* Interactive Diagram */}
      <div className="relative rounded-2xl border border-fd-border bg-fd-card/50 p-6 overflow-hidden">
        <BorderBeam colorFrom="#8b5cf6" colorTo="#06b6d4" duration={12} />
        
        <div className="text-center mb-8">
          <h4 className="text-lg font-semibold text-fd-foreground mb-1">Security Standards Ecosystem</h4>
          <p className="text-sm text-fd-muted-foreground">Click any node to learn more</p>
        </div>

        {/* Node Layout - Two rows, centered */}
        <div className="relative">
          {/* Top Row: CWE → CVE → CVSS (left to right flow) */}
          <div className="flex items-center justify-center gap-4 md:gap-12 mb-6">
            <StandardNode 
              standard={standards[0]} 
              isSelected={selected?.id === 'cwe'}
              onClick={() => setSelected(selected?.id === 'cwe' ? null : standards[0])}
            />
            
            <div className="text-fd-muted-foreground/40 text-xl hidden md:block">→</div>
            
            <StandardNode 
              standard={standards[1]} 
              isSelected={selected?.id === 'cve'}
              onClick={() => setSelected(selected?.id === 'cve' ? null : standards[1])}
            />
            
            <div className="text-fd-muted-foreground/40 text-xl hidden md:block">→</div>
            
            <StandardNode 
              standard={standards[2]} 
              isSelected={selected?.id === 'cvss'}
              onClick={() => setSelected(selected?.id === 'cvss' ? null : standards[2])}
            />
          </div>

          {/* Connection arrows */}
          <div className="flex justify-center text-fd-muted-foreground/30 text-lg mb-6 hidden md:flex">
            <span>↓</span>
          </div>

          {/* Bottom Row: OWASP, NVD (categories/aggregators) */}
          <div className="flex items-center justify-center gap-4 md:gap-12">
            <StandardNode 
              standard={standards[3]} 
              isSelected={selected?.id === 'owasp'}
              onClick={() => setSelected(selected?.id === 'owasp' ? null : standards[3])}
            />
            
            <StandardNode 
              standard={standards[4]} 
              isSelected={selected?.id === 'nvd'}
              onClick={() => setSelected(selected?.id === 'nvd' ? null : standards[4])}
            />
          </div>
        </div>
      </div>

      {/* Expanded Details Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "rounded-xl border p-5",
              selected.bgColor,
              selected.borderColor
            )}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                  selected.bgColor,
                  selected.color
                )}>
                  <selected.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className={cn("font-bold text-lg", selected.color)}>
                      {selected.name}
                    </h5>
                    <span className="text-xs text-fd-muted-foreground">
                      {selected.fullName}
                    </span>
                  </div>
                  <p className="text-sm text-fd-muted-foreground mb-3">
                    {selected.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-fd-muted-foreground">Example:</span>
                      <code className={cn(
                        "px-2 py-1 rounded text-xs font-mono",
                        selected.bgColor,
                        selected.color
                      )}>
                        {selected.example}
                      </code>
                    </div>
                    <a 
                      href={selected.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium hover:underline",
                        selected.color
                      )}
                    >
                      Learn more <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Reference Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {standards.map((std, i) => (
          <motion.button
            key={std.id}
            onClick={() => setSelected(selected?.id === std.id ? null : std)}
            className={cn(
              "p-3 rounded-lg border text-center transition-all",
              std.bgColor,
              std.borderColor,
              selected?.id === std.id && "ring-2 ring-offset-2 ring-offset-fd-background",
              selected?.id === std.id && std.color.replace('text-', 'ring-')
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <std.icon className={cn("w-5 h-5 mx-auto mb-1", std.color)} />
            <div className={cn("text-sm font-bold", std.color)}>{std.name}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function StandardNode({ 
  standard, 
  isSelected, 
  onClick 
}: { 
  standard: Standard; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = standard.icon;
  
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all cursor-pointer",
        standard.bgColor,
        standard.borderColor,
        isSelected && "ring-2 ring-offset-2 ring-offset-fd-background",
        isSelected && standard.color.replace('text-', 'ring-')
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        standard.bgColor
      )}>
        <Icon className={cn("w-5 h-5", standard.color)} />
      </div>
      <span className={cn("text-xs font-bold", standard.color)}>
        {standard.name}
      </span>
    </motion.button>
  );
}
