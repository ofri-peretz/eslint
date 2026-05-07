/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
'use client';

/**
 * Select primitive — built on Base UI (`@base-ui-components/react/select`).
 *
 * Surface mirrors the shadcn Select API so consumers familiar with shadcn
 * find their footing immediately:
 *   <Select>, <SelectTrigger>, <SelectValue>, <SelectIcon>,
 *   <SelectContent>, <SelectItem>, <SelectGroup>, <SelectGroupLabel>,
 *   <SelectSeparator>, <SelectScrollUpButton>, <SelectScrollDownButton>.
 *
 * Styling uses Tailwind utilities and the line-wide `--color-fd-*`
 * CSS variables from the brand baseline — never hardcoded colors.
 *
 * Peer deps required in the consuming app:
 *   - `@base-ui-components/react`
 *   - `lucide-react`
 *   - `tailwindcss` v4
 */

import * as React from 'react';
import { Select as BaseSelect } from '@base-ui-components/react/select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { cn } from '#interlace/lib/utils';

const Select = BaseSelect.Root;
const SelectGroup = BaseSelect.Group;
const SelectValue = BaseSelect.Value;
const SelectPortal = BaseSelect.Portal;

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof BaseSelect.Trigger> & {
  size?: 'sm' | 'default';
}) {
  return (
    <BaseSelect.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'flex w-fit items-center justify-between gap-2 rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm whitespace-nowrap shadow-sm transition-[color,box-shadow] outline-none',
        'hover:bg-fd-muted',
        'focus-visible:border-fd-primary focus-visible:ring-[3px] focus-visible:ring-fd-primary/30',
        'data-[popup-open]:border-fd-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[size=default]:h-9 data-[size=sm]:h-8',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="opacity-50">
        <ChevronDownIcon className="size-4" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

function SelectContent({
  className,
  children,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof BaseSelect.Positioner> & {
  popupClassName?: string;
}) {
  const { popupClassName, ...positionerProps } = props as typeof props & {
    popupClassName?: string;
  };
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        data-slot="select-positioner"
        sideOffset={sideOffset}
        className={cn('z-50', className)}
        {...positionerProps}
      >
        <SelectScrollUpButton />
        <BaseSelect.Popup
          data-slot="select-popup"
          className={cn(
            'min-w-[var(--anchor-width)] overflow-x-hidden overflow-y-auto rounded-xl border border-fd-border bg-fd-background text-fd-foreground shadow-lg',
            'origin-[var(--transform-origin)]',
            'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
            'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
            'transition-[opacity,scale] duration-150',
            'p-1',
            popupClassName,
          )}
        >
          {children}
        </BaseSelect.Popup>
        <SelectScrollDownButton />
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

function SelectGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.GroupLabel>) {
  return (
    <BaseSelect.GroupLabel
      data-slot="select-group-label"
      className={cn('px-2 py-1.5 text-xs text-fd-muted-foreground', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseSelect.Item>) {
  return (
    <BaseSelect.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-2 rounded-lg py-2.5 pr-8 pl-3 text-sm outline-hidden select-none transition-all duration-150',
        'text-fd-foreground',
        'data-[highlighted]:bg-fd-accent data-[highlighted]:text-fd-accent-foreground',
        'data-[selected]:bg-fd-primary data-[selected]:text-white data-[selected]:font-medium',
        '[&_svg:not([class*=text-])]:text-fd-muted-foreground data-[selected]:[&_svg]:text-white',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <BaseSelect.ItemIndicator>
          <CheckIcon className="size-4" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.Separator>) {
  return (
    <BaseSelect.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-fd-border', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.ScrollUpArrow>) {
  return (
    <BaseSelect.ScrollUpArrow
      data-slot="select-scroll-up"
      className={cn(
        'flex cursor-default items-center justify-center py-1 text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </BaseSelect.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.ScrollDownArrow>) {
  return (
    <BaseSelect.ScrollDownArrow
      data-slot="select-scroll-down"
      className={cn(
        'flex cursor-default items-center justify-center py-1 text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </BaseSelect.ScrollDownArrow>
  );
}

export {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectValue,
  SelectPortal,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
