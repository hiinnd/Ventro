'use client';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { useDirection } from '@radix-ui/react-direction';
import { Button } from './button';
import { Icon } from './icon';
import { cn } from './utils';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('animate-pulse rounded-lg bg-muted motion-reduce:animate-none', className)}
      {...props}
    />
  );
}
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'grid justify-items-center gap-3 rounded-2xl border border-dashed border-input-border p-8 text-center',
        className,
      )}
    >
      <span aria-hidden className="rounded-xl bg-muted p-3">
        <Icon name="empty" className="size-6" />
      </span>
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="max-w-sm text-sm leading-7 text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
export function ErrorState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      data-slot="error-state"
      className={cn(
        'grid gap-3 rounded-2xl border border-danger/40 bg-danger-surface p-6',
        className,
      )}
    >
      <h3 className="flex items-center gap-2 font-semibold text-danger">
        <Icon name="alert" />
        {title}
      </h3>
      <p className="text-sm leading-7 text-foreground">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
export interface ToastMessage {
  title: string;
  description?: string;
  variant?: 'neutral' | 'success' | 'danger';
}
interface ToastItem extends ToastMessage {
  id: number;
}
const ToastContext = createContext<{
  notify: (message: ToastMessage) => number;
  dismiss: (id: number) => void;
} | null>(null);
export function ToastProvider({
  children,
  labels = {
    dismiss: 'Dismiss notification',
    viewport: 'Notifications',
    notification: 'Notification',
  },
}: {
  children: ReactNode;
  labels?: { dismiss: string; viewport: string; notification: string };
}) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const direction = useDirection();
  const dismiss = useCallback(
    (id: number) => setItems((current) => current.filter((item) => item.id !== id)),
    [],
  );
  const notify = useCallback((message: ToastMessage) => {
    const id = ++nextId.current;
    setItems((current) => [...current.slice(-4), { ...message, id }]);
    return id;
  }, []);
  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      <ToastPrimitive.Provider
        label={labels.notification}
        swipeDirection={direction === 'rtl' ? 'left' : 'right'}
        duration={5500}
      >
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            open
            onOpenChange={(open) => {
              if (!open) dismiss(item.id);
            }}
            duration={item.variant === 'danger' ? Infinity : undefined}
            className={cn(
              'ui-popup relative grid gap-1 rounded-xl border border-input-border bg-card p-5 pe-14 text-foreground shadow-[var(--shadow-overlay)]',
              item.variant === 'success' && 'border-success',
              item.variant === 'danger' && 'border-danger',
            )}
          >
            <ToastPrimitive.Title className="text-sm font-semibold">
              {item.title}
            </ToastPrimitive.Title>
            {item.description && (
              <ToastPrimitive.Description className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </ToastPrimitive.Description>
            )}
            <ToastPrimitive.Close asChild>
              <Button
                size="icon"
                variant="ghost"
                className="absolute end-1 top-1 size-10"
                aria-label={labels.dismiss}
              >
                <Icon name="close" />
              </Button>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport
          aria-label={labels.viewport}
          className="fixed bottom-4 end-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 outline-none"
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast requires ToastProvider');
  return context;
}
