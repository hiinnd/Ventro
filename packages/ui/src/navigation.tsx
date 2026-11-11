'use client';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from './button';
import { Icon } from './icon';
import { cn } from './utils';

export interface NavigationItem { href: string; label: string; active?: boolean; icon?: ReactNode; }
export function Navigation({ items, label, className }: { items: NavigationItem[]; label: string; className?: string }) {
  return <nav aria-label={label} className={className}><ul className="flex flex-wrap gap-1">{items.map((item) => <li key={item.href}><a href={item.href} aria-current={item.active ? 'page' : undefined} className={cn('ui-focus ui-control flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground', item.active && 'bg-muted text-foreground font-medium')}>{item.icon}{item.label}</a></li>)}</ul></nav>;
}
export function Sidebar({ className, ...props }: ComponentProps<'aside'>) { return <aside data-slot="sidebar" className={cn('flex w-64 max-w-full flex-col rounded-2xl border border-border bg-card', className)} {...props} />; }
export function SidebarHeader({ className, ...props }: ComponentProps<'div'>) { return <div className={cn('border-b border-border p-5', className)} {...props} />; }
export function SidebarContent({ className, ...props }: ComponentProps<'div'>) { return <div className={cn('flex-1 p-3', className)} {...props} />; }
export function SidebarFooter({ className, ...props }: ComponentProps<'div'>) { return <div className={cn('border-t border-border p-5 text-xs text-muted-foreground', className)} {...props} />; }
export function SidebarLink({ active, className, ...props }: ComponentProps<'a'> & { active?: boolean }) {
  return <a aria-current={active ? 'page' : undefined} className={cn('ui-focus ui-control flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground', active && 'bg-accent/15 font-medium text-accent-foreground', className)} {...props} />;
}
export function Breadcrumbs({ items, label, className }: { items: { label: string; href?: string }[]; label: string; className?: string }) {
  return <nav aria-label={label} className={className}><ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{items.map((item, index) => <li key={index} className="flex items-center gap-2">
    {index > 0 && <Icon name="next" className="size-3 rtl:rotate-180" />}
    {index === items.length - 1 ? <span aria-current="page" className="font-medium text-foreground">{item.label}</span> : item.href ? <a href={item.href} className="ui-focus rounded hover:text-foreground hover:underline">{item.label}</a> : <span>{item.label}</span>}
  </li>)}</ol></nav>;
}
export interface PaginationLabels {
  navigation: string; previous: string; next: string; page: (value: number) => string; more: string; empty: string;
}
export function Pagination({ page, pageCount, onPageChange, labels }: { page: number; pageCount: number; onPageChange: (page: number) => void; labels: PaginationLabels }) {
  const total = Number.isFinite(pageCount) ? Math.max(0, Math.floor(pageCount)) : 0;
  const current = Math.min(total, Math.max(1, Math.floor(page) || 1));
  const pages = Array.from({ length: total }, (_, index) => index + 1).filter((value) => value === 1 || value === total || Math.abs(value - current) <= 1);
  if (!total) return <nav aria-label={labels.navigation}><p className="text-sm text-muted-foreground">{labels.empty}</p></nav>;
  return <nav aria-label={labels.navigation}><ul className="flex flex-wrap items-center justify-center gap-1.5">
    <li><Button variant="outline" size="icon" disabled={current <= 1} onClick={() => onPageChange(current - 1)} aria-label={labels.previous}><Icon name="previous" className="rtl:rotate-180" /></Button></li>
    {pages.map((value, index) => <li key={value} className="flex items-center gap-1.5">
      {index > 0 && value - pages[index - 1]! > 1 && <span aria-label={labels.more} className="px-1 text-muted-foreground">…</span>}
      <Button variant={value === current ? 'default' : 'ghost'} size="icon" aria-label={labels.page(value)} aria-current={value === current ? 'page' : undefined} onClick={() => onPageChange(value)}>{value}</Button>
    </li>)}
    <li><Button variant="outline" size="icon" disabled={current >= total} onClick={() => onPageChange(current + 1)} aria-label={labels.next}><Icon name="next" className="rtl:rotate-180" /></Button></li>
  </ul></nav>;
}
