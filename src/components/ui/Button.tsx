import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn.ts';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          {
            'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90':
              variant === 'default',
            'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-80':
              variant === 'secondary',
            'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]':
              variant === 'ghost',
            'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90':
              variant === 'destructive',
            'border border-[var(--border)] bg-transparent hover:bg-[var(--accent)]':
              variant === 'outline',
          },
          {
            'h-8 px-3 text-xs': size === 'sm',
            'h-9 px-4 text-sm': size === 'md',
            'h-8 w-8 p-0': size === 'icon',
          },
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
