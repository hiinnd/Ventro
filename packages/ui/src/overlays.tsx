'use client';
import type { ComponentProps, ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Button } from './button';
import { Icon } from './icon';
import { cn } from './utils';

const overlayClass = 'ui-popup fixed inset-0 z-50 bg-black/45';
const dialogClass =
  'ui-popup fixed inset-0 z-50 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-[var(--shadow-overlay)] sm:p-8';
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({
  className,
  children,
  closeLabel = 'Close dialog',
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { closeLabel?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content className={cn(dialogClass, className)} {...props}>
        {children}
        <DialogPrimitive.Close asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute end-4 top-4"
            aria-label={closeLabel}
          >
            <Icon name="close" />
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mb-6 grid gap-2 pe-8', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('font-display text-xl font-semibold', className)}
      {...props}
    />
  );
}
export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm leading-7 text-muted-foreground', className)}
      {...props}
    />
  );
}
export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mt-7 flex flex-wrap justify-end gap-3', className)} {...props} />;
}
export function Modal({
  title,
  description,
  trigger,
  footer,
  children,
  closeLabel,
  ...props
}: ComponentProps<typeof DialogPrimitive.Root> & {
  title: string;
  description: string;
  trigger?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeLabel: string;
}) {
  return (
    <Dialog {...props}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent closeLabel={closeLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTrigger = AlertPrimitive.Trigger;
export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertPrimitive.Content>) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className={overlayClass} />
      <AlertPrimitive.Content className={cn(dialogClass, className)} {...props} />
    </AlertPrimitive.Portal>
  );
}
export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertPrimitive.Title>) {
  return (
    <AlertPrimitive.Title
      className={cn('font-display text-xl font-semibold', className)}
      {...props}
    />
  );
}
export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertPrimitive.Description>) {
  return (
    <AlertPrimitive.Description
      className={cn('mt-3 text-sm leading-7 text-muted-foreground', className)}
      {...props}
    />
  );
}
export function AlertDialogCancel(props: ComponentProps<typeof Button>) {
  return (
    <AlertPrimitive.Cancel asChild>
      <Button variant="outline" {...props} />
    </AlertPrimitive.Cancel>
  );
}
export function AlertDialogAction(props: ComponentProps<typeof Button>) {
  return (
    <AlertPrimitive.Action asChild>
      <Button variant="destructive" {...props} />
    </AlertPrimitive.Action>
  );
}

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'ui-popup z-50 min-w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-1 text-foreground shadow-[var(--shadow-overlay)]',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}
export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex min-h-10 cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:ring-2 data-[highlighted]:ring-inset data-[highlighted]:ring-ring data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={cn('px-3 py-2 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}
export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn('my-1 h-px bg-border', className)} {...props} />;
}
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'ui-popup z-[70] max-w-64 rounded-lg bg-foreground px-3 py-2 text-xs leading-6 text-background shadow-[var(--shadow-card)]',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
