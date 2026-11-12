import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const buttonVariants = cva(
  'ui-focus ui-control inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground hover:brightness-95',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-95',
        link: 'text-accent-foreground underline-offset-4 hover:underline',
        outline: 'border border-input-border bg-card text-foreground hover:bg-muted',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
      },
      size: { default: 'h-11 px-5', sm: 'h-9 px-3', lg: 'h-12 px-6', icon: 'size-11 p-0' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
