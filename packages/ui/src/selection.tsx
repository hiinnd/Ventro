'use client';
import type { ComponentProps } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as RadioPrimitive from '@radix-ui/react-radio-group';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Icon } from './icon';
import { cn } from './utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;
export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'ui-focus ui-control flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-input-border bg-card px-3.5 py-2.5 text-start text-sm data-[placeholder]:text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <Icon name="down" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}
export function SelectContent({
  children,
  className,
  position = 'popper',
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={6}
        className={cn(
          'ui-popup z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-overlay)]',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex justify-center p-2">
          <Icon name="down" className="rotate-180" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex justify-center p-2">
          <Icon name="down" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}
export function SelectItem({
  children,
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex min-h-10 cursor-default select-none items-center rounded-lg py-2 pe-9 ps-3 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:ring-2 data-[highlighted]:ring-inset data-[highlighted]:ring-ring data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute end-3">
        <Icon name="check" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('px-3 py-2 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}
export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'ui-focus ui-control inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-input-border bg-card text-primary-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group">
        <Icon name="check" className="size-3.5 group-data-[state=indeterminate]:hidden" />
        <span aria-hidden className="hidden leading-none group-data-[state=indeterminate]:block">
          −
        </span>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioPrimitive.Root>) {
  return <RadioPrimitive.Root className={cn('grid gap-3', className)} {...props} />;
}
export function RadioGroupItem({
  className,
  ...props
}: ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        'ui-focus ui-control flex size-5 shrink-0 items-center justify-center rounded-full border border-input-border bg-card data-[state=checked]:border-primary',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
    </RadioPrimitive.Item>
  );
}
export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1',
        className,
      )}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'ui-focus ui-control min-h-10 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('ui-focus mt-5 text-sm leading-7', className)}
      {...props}
    />
  );
}
