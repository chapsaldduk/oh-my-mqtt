import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn.ts';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-9 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1 text-sm',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';
