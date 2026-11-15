import React from 'react';
import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import { cn } from '../../lib/utils';

const Toolbar = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <ToolbarPrimitive.Root
      ref={ref}
      className={cn('flex items-center gap-1 p-1', className)}
      {...props}
    />
  )
);
Toolbar.displayName = ToolbarPrimitive.Root.displayName;

interface ToolbarButtonProps extends React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Button> {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, variant = 'ghost', size = 'icon', children, ...props }, ref) => {
    const variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-8 w-8',
    };

    return (
      <ToolbarPrimitive.Button
        ref={ref}
        className={cn(
          'flex items-center justify-center rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </ToolbarPrimitive.Button>
    );
  }
);
ToolbarButton.displayName = ToolbarPrimitive.Button.displayName;

const ToolbarSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Separator> & { children?: React.ReactNode }>(
  ({ className, children, ...props }, ref) => (
    <ToolbarPrimitive.Separator
      ref={ref}
      className={cn('h-6 w-px bg-border', className)}
      {...props}
    >
      {children}
    </ToolbarPrimitive.Separator>
  )
);
ToolbarSeparator.displayName = ToolbarPrimitive.Separator.displayName;

// ToolbarGroup - using a simple div since Radix Toolbar doesn't export Group
const ToolbarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ToolbarGroup.displayName = 'ToolbarGroup';

export { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarGroup };