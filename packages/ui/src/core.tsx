'use client';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from './utils';

const control =
  'ui-focus ui-control min-h-11 w-full rounded-xl border border-input-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed';
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(control, className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(control, 'min-h-28 resize-y', className)}
      {...props}
    />
  );
}
export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium leading-6', className)} {...props} />;
}
export interface FormFieldProps {
  label: string;
  children: ReactNode;
  id?: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
}
export function FormField({
  label,
  children,
  id: suppliedId,
  description,
  error,
  required,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const descriptionId = description ? id + '-description' : undefined;
  const errorId = error ? id + '-error' : undefined;
  return (
    <div className={cn('grid gap-2', className)} data-invalid={Boolean(error)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="ms-1 text-danger">
            *
          </span>
        )}
      </Label>
      <Slot
        id={id}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
      >
        {children}
      </Slot>
      {description && (
        <p id={descriptionId} className="text-xs leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="status" className="text-xs leading-6 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-2 p-6', className)} {...props} />;
}
export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3 className={cn('font-display text-lg font-semibold tracking-tight', className)} {...props} />
  );
}
export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm leading-7 text-muted-foreground', className)} {...props} />;
}
export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}
export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3 border-t border-border p-6', className)}
      {...props}
    />
  );
}
export function Badge({
  variant = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }) {
  const variants = {
    neutral: 'bg-muted text-foreground',
    accent: 'bg-accent/15 text-accent-foreground',
    success: 'bg-success-surface text-success',
    warning: 'bg-warning-surface text-warning',
    danger: 'bg-danger-surface text-danger',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
export function Table({
  className,
  scrollLabel = 'Scrollable table',
  ...props
}: ComponentProps<'table'> & { scrollLabel?: string }) {
  return (
    <div
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
      className="ui-focus overflow-x-auto rounded-xl border border-border"
    >
      <table className={cn('w-full caption-bottom text-start text-sm', className)} {...props} />
    </div>
  );
}
export function TableHeader(props: ComponentProps<'thead'>) {
  return <thead className="bg-muted/60" {...props} />;
}
export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}
export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-b border-border', className)} {...props} />;
}
export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-3 text-start text-xs font-semibold text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3.5', className)} {...props} />;
}
export function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
  return (
    <caption
      className={cn('px-4 py-3 text-start text-xs leading-6 text-muted-foreground', className)}
      {...props}
    />
  );
}
