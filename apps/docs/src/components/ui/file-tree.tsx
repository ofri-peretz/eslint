'use client';

import * as React from 'react';
import { ChevronRight, Folder as FolderIcon, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Magic UI File Tree Component
 * 
 * A component used to showcase the folder and file structure of a directory.
 * Ideal for plugin overview pages to show project structure.
 * 
 * @see https://magicui.design/docs/components/file-tree
 */

interface TreeViewElement {
  id: string;
  name: string;
  isSelectable?: boolean;
  children?: TreeViewElement[];
}

interface TreeContextType {
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  expandedItems: string[];
  toggleExpanded: (id: string) => void;
  indicator: boolean;
}

const TreeContext = React.createContext<TreeContextType | undefined>(undefined);

function useTree() {
  const context = React.useContext(TreeContext);
  if (!context) {
    throw new Error('useTree must be used within a Tree component');
  }
  return context;
}

interface TreeProps {
  children: React.ReactNode;
  className?: string;
  initialSelectedId?: string;
  initialExpandedItems?: string[];
  indicator?: boolean;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
}

export function Tree({
  children,
  className,
  initialSelectedId,
  initialExpandedItems = [],
  indicator = true,
}: TreeProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(initialSelectedId || null);
  const [expandedItems, setExpandedItems] = React.useState<string[]>(initialExpandedItems);

  const toggleExpanded = React.useCallback((id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  return (
    <TreeContext.Provider value={{ selectedId, setSelectedId, expandedItems, toggleExpanded, indicator }}>
      <div
        role="tree"
        className={cn(
          'rounded-xl border border-fd-border bg-fd-card/50 p-4 font-mono text-sm',
          className
        )}
      >
        <ul role="group" className="space-y-1">
          {children}
        </ul>
      </div>
    </TreeContext.Provider>
  );
}

interface FolderProps {
  children: React.ReactNode;
  element: string;
  value: string;
  isSelectable?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export function Folder({
  children,
  element,
  value,
  isSelectable = true,
  defaultOpen = false,
  className,
}: FolderProps) {
  const { selectedId, setSelectedId, expandedItems, toggleExpanded, indicator } = useTree();
  const isOpen = expandedItems.includes(value) || defaultOpen;
  const isSelected = selectedId === value;

  React.useEffect(() => {
    if (defaultOpen && !expandedItems.includes(value)) {
      toggleExpanded(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <li role="treeitem" aria-expanded={isOpen} aria-selected={isSelected}>
      <div
        onClick={() => {
          toggleExpanded(value);
          if (isSelectable) setSelectedId(value);
        }}
        className={cn(
          'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-200',
          isSelected
            ? 'bg-violet-500/10 text-violet-500'
            : 'text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground',
          className
        )}
      >
        <ChevronRight
          className={cn(
            'size-4 transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
        />
        <FolderIcon
          className={cn(
            'size-4 transition-colors',
            isOpen ? 'text-violet-400' : 'text-amber-500'
          )}
        />
        <span className="truncate font-medium">{element}</span>
      </div>
      
      {isOpen && (
        <ul role="group" className={cn('mt-1 space-y-1', indicator && 'ml-3 border-l border-fd-border/50 pl-3')}>
          {children}
        </ul>
      )}
    </li>
  );
}

interface FileProps {
  children: React.ReactNode;
  value: string;
  isSelectable?: boolean;
  fileIcon?: React.ReactNode;
  className?: string;
}

export function File({
  children,
  value,
  isSelectable = true,
  fileIcon,
  className,
}: FileProps) {
  const { selectedId, setSelectedId } = useTree();
  const isSelected = selectedId === value;

  // Determine icon based on file extension
  const getFileIcon = () => {
    if (fileIcon) return fileIcon;
    const name = typeof children === 'string' ? children : '';
    if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      return <span className="text-blue-400">TS</span>;
    }
    if (name.endsWith('.js') || name.endsWith('.jsx')) {
      return <span className="text-yellow-400">JS</span>;
    }
    if (name.endsWith('.json')) {
      return <span className="text-green-400">{'{}'}</span>;
    }
    if (name.endsWith('.md') || name.endsWith('.mdx')) {
      return <span className="text-purple-400">MD</span>;
    }
    return <FileIcon className="size-4 text-fd-muted-foreground" />;
  };

  return (
    <li role="treeitem" aria-selected={isSelected}>
      <div
        onClick={() => isSelectable && setSelectedId(value)}
        className={cn(
          'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-200',
          isSelected
            ? 'bg-violet-500/10 text-violet-500'
            : 'text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground',
          className
        )}
      >
        <span className="flex size-4 items-center justify-center text-[10px] font-bold">
          {getFileIcon()}
        </span>
        <span className="truncate">{children}</span>
      </div>
    </li>
  );
}

interface CollapseButtonProps {
  expandAll?: boolean;
  className?: string;
}

export function CollapseButton({ expandAll = false, className }: CollapseButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-fd-border px-2.5 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground',
        className
      )}
    >
      {expandAll ? 'Expand All' : 'Collapse All'}
    </button>
  );
}
