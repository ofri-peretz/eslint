'use client';

import { useEffect } from 'react';

/**
 * Adds keyboard shortcut Cmd+[ (Mac) or Ctrl+[ (Windows/Linux) to toggle the sidebar.
 * This mimics Notion's keyboard shortcuts.
 */
export function useSidebarShortcut() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+[ (Mac) or Ctrl+[ (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        
        // Fumadocs exact selectors and common patterns
        const collapseBtn = document.querySelector('button[aria-label*="Collapse Sidebar"]');
        const expandBtn = document.querySelector('button[aria-label*="Expand Sidebar"]');
        const menuBtn = document.querySelector('button[aria-label*="Menu"]');
        
        if (collapseBtn instanceof HTMLElement) {
            collapseBtn.click();
            return;
        }
        
        if (expandBtn instanceof HTMLElement) {
            expandBtn.click();
            return;
        }

        if (menuBtn instanceof HTMLElement && window.innerWidth < 1024) {
            menuBtn.click();
            return;
        }

        // Generic fallback with refined heuristic
        const toggleButtons = document.querySelectorAll('button');
        for (const btn of toggleButtons) {
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          const title = btn.getAttribute('title')?.toLowerCase() || '';
          if (ariaLabel.includes('sidebar') || ariaLabel.includes('menu') || title.includes('sidebar')) {
            btn.click();
            return;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}

export function SidebarShortcut() {
  useSidebarShortcut();
  return null;
}
