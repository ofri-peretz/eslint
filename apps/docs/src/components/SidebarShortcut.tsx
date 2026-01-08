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
        
        // Fumadocs uses a button with aria-label="Toggle Sidebar" or similar
        // Try to find and click the sidebar toggle button
        const toggleButtons = document.querySelectorAll('button');
        for (const btn of toggleButtons) {
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          const className = btn.className.toLowerCase();
          
          // Look for sidebar toggle button patterns
          if (ariaLabel.includes('sidebar') || 
              ariaLabel.includes('menu') ||
              className.includes('sidebar') ||
              className.includes('fd-sidebar')) {
            btn.click();
            return;
          }
        }
        
        // Fallback: try to find the Fumadocs sidebar toggle by its icon container
        const sidebarToggle = document.querySelector('[data-sidebar-toggle]') ||
          document.querySelector('button:has(svg[data-lucide="panel-left"])') ||
          document.querySelector('button:has(svg[data-lucide="menu"])');
        
        if (sidebarToggle instanceof HTMLElement) {
          sidebarToggle.click();
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
