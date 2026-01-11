'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface ComparisonItem {
  text: string;
  highlight?: string;
}

const beforeItems: ComparisonItem[] = [
  { text: 'Generic error descriptions' },
  { text: 'No security metadata (CWE/CVSS)' },
  { text: 'AI guesses the fix' },
  { text: 'No compliance context' },
  { text: 'AI fix success rate', highlight: '40-60%' },
];

const afterItems: ComparisonItem[] = [
  { text: 'Structured 2-line format' },
  { text: 'CWE + OWASP + CVSS metadata' },
  { text: 'AI receives exact fix with code' },
  { text: 'SOC2/GDPR/PCI compliance tags' },
  { text: 'AI fix success rate', highlight: '90%+' },
];

export function ComparisonSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="my-12">
      <h2 className="text-2xl font-bold mb-8 text-center">
        ESLint Interlace vs Traditional
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Before Card */}
        <div
          className={`
            relative overflow-hidden rounded-2xl
            bg-red-50 dark:bg-red-950/30
            border border-red-200 dark:border-red-500/30
            p-8
            transform transition-all duration-700 ease-out
            ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}
          `}
        >
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-linear-to-r from-red-500/5 to-transparent dark:from-red-500/10 opacity-50" />
          
          {/* Badge */}
          <div className="absolute -top-px left-8">
            <div className="relative">
              <div className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded-b-lg shadow-lg shadow-red-500/25">
                BEFORE
              </div>
              <div className="absolute inset-0 bg-red-500 blur-md opacity-20 dark:opacity-50 -z-10" />
            </div>
          </div>
          
          {/* Content */}
          <div className="relative mt-4">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-6 flex items-center gap-3">
              <span className="text-3xl">❌</span>
              Traditional ESLint
            </h3>
            
            <ul className="space-y-4">
              {beforeItems.map((item, index) => (
                <li
                  key={index}
                  className={`
                    flex items-start gap-3 text-fd-muted-foreground dark:text-gray-300
                    transform transition-all duration-500
                    ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
                  `}
                  style={{ transitionDelay: `${index * 100 + 200}ms` }}
                >
                  <span className="text-red-500 text-lg mt-0.5 shrink-0">✗</span>
                  <span>
                    {item.highlight ? (
                      <>
                        <span className="font-bold text-red-600 dark:text-red-400">{item.highlight}</span>{' '}
                        {item.text}
                      </>
                    ) : (
                      item.text
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* After Card */}
        <div
          className={`
            relative overflow-hidden rounded-2xl
            bg-emerald-50 dark:bg-emerald-950/30
            border border-emerald-200 dark:border-emerald-500/30
            p-8
            transform transition-all duration-700 ease-out
            ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
          `}
          style={{ transitionDelay: '100ms' }}
        >
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-linear-to-l from-emerald-500/5 to-transparent dark:from-emerald-500/10 opacity-50" />
          
          {/* Shimmer effect */}
          <div 
            className={`
              absolute inset-0 
              bg-linear-to-r from-transparent via-emerald-400/10 dark:via-emerald-400/5 to-transparent
              transform -skew-x-12
              transition-transform duration-1000 ease-out
              ${isVisible ? 'translate-x-full' : '-translate-x-full'}
            `}
            style={{ transitionDelay: '500ms' }}
          />
          
          {/* Badge */}
          <div className="absolute -top-px left-8">
            <div className="relative">
              <div className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-b-lg shadow-lg shadow-emerald-500/25">
                AFTER
              </div>
              <div className="absolute inset-0 bg-emerald-500 blur-md opacity-20 dark:opacity-50 -z-10" />
            </div>
          </div>
          
          {/* Content */}
          <div className="relative mt-4">
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-6 flex items-center gap-3">
              <span className="text-3xl">✅</span>
              ESLint Interlace
            </h3>
            
            <ul className="space-y-4">
              {afterItems.map((item, index) => (
                <li
                  key={index}
                  className={`
                    flex items-start gap-3 text-fd-muted-foreground dark:text-gray-300
                    transform transition-all duration-500
                    ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
                  `}
                  style={{ transitionDelay: `${index * 100 + 300}ms` }}
                >
                  <span className="text-emerald-500 text-lg mt-0.5 shrink-0">✓</span>
                  <span>
                    {item.highlight ? (
                      <>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.highlight}</span>{' '}
                        {item.text}
                      </>
                    ) : (
                      item.text
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Recommended badge */}
          <div className="absolute top-4 right-4">
            <div className="px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full">
              ✨ Recommended
            </div>
          </div>
        </div>
      </div>
      
      {/* Explore Examples Link */}
      <div className="text-center mt-8">
        <Link
          href="/docs/examples"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 rounded-full transition-all duration-300 group"
        >
          <span>Explore Real Examples</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>
    </div>
  );
}
