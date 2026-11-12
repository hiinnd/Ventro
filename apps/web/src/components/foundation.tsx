'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';
import { Button, BrandLogo, cn } from '@ventro/ui';
import { healthResponseSchema, type HealthResponse } from '@ventro/types';
import { messages } from '../lib/messages';
import { useLocale } from './locale-provider';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: HealthResponse }
  | { kind: 'empty' }
  | { kind: 'error' };

export function Foundation() {
  const { locale, setLocale } = useLocale();
  const [state, setState] = useState<HealthState>({ kind: 'loading' });
  const controller = useRef<AbortController | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const t = messages[locale];

  const check = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ kind: 'loading' });
    const timeout = setTimeout(() => current.abort(), 8000);
    try {
      const response = await fetch('/api/health', { cache: 'no-store', signal: current.signal });
      if (response.status === 204) {
        setState({ kind: 'empty' });
        return;
      }
      if (response.status !== 200 && response.status !== 503) throw new Error('Unavailable');
      const data = healthResponseSchema.parse(await response.json());
      if (controller.current === current) setState({ kind: 'ready', data });
    } catch {
      if (controller.current === current) setState({ kind: 'error' });
    } finally {
      clearTimeout(timeout);
    }
  }, []);
  useEffect(() => {
    void check();
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, [check]);

  const healthy = state.kind === 'ready' && state.data.status === 'ok';
  const title =
    state.kind === 'loading'
      ? t.checking
      : state.kind === 'error'
        ? t.failed
        : state.kind === 'empty'
          ? t.empty
          : healthy
            ? t.ready
            : t.degraded;
  const services = [
    {
      label: t.api,
      status: state.kind === 'ready' ? 'up' : state.kind === 'loading' ? 'pending' : 'down',
    },
    {
      label: t.database,
      status:
        state.kind === 'ready'
          ? state.data.checks.database
          : state.kind === 'loading'
            ? 'pending'
            : 'down',
    },
    {
      label: t.redis,
      status:
        state.kind === 'ready'
          ? state.data.checks.redis
          : state.kind === 'loading'
            ? 'pending'
            : 'down',
    },
  ] as const;

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 end-[-14rem] -z-10 h-[42rem] w-[42rem] rounded-full bg-accent/10 blur-3xl"
      />
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-7 sm:px-10">
        <a
          href="/"
          aria-label="VENTRO home"
          className="flex items-center gap-3 text-xl font-extrabold tracking-[0.16em]"
        >
          <BrandLogo decorative className="h-9 w-auto" />
        </a>
        <nav
          aria-label={locale === 'ar' ? 'تفضيلات العرض' : 'Display preferences'}
          className="flex gap-1"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            lang={locale === 'en' ? 'ar' : 'en'}
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t.theme}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
            </svg>
          </Button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:px-10 sm:pt-24">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20"
        >
          <div>
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" />
              {t.region}
            </p>
            <p className="mb-5 text-xs font-semibold tracking-[0.18em] text-muted-foreground">
              {t.phase}
            </p>
            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">
              <span className="block">{t.heading}</span>
              <span className="mt-2 block text-accent-foreground">{t.headingAccent}</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-8 text-muted-foreground">{t.intro}</p>
            <div className="mt-10 flex items-center gap-3 text-xs text-muted-foreground">
              <span aria-hidden className="h-px w-9 bg-border" />
              <span>VENTRO · JORDAN / MENA</span>
            </div>
          </div>
          <section
            aria-labelledby="connection-title"
            className="rounded-3xl border border-border bg-card p-6 shadow-[0_18px_80px_-36px_rgba(16,27,53,0.32)] sm:p-8"
          >
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h2 id="connection-title" className="text-lg font-semibold">
                  {t.system}
                </h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{t.systemDetail}</p>
              </div>
              <span aria-hidden className="rounded-lg bg-accent/10 p-2 text-accent">
                ↗
              </span>
            </div>
            <div
              role="status"
              aria-live="polite"
              className={cn(
                'mb-5 flex items-center gap-2.5 rounded-xl bg-muted px-4 py-3 text-sm font-medium',
                healthy && 'text-success',
                (state.kind === 'error' || (state.kind === 'ready' && !healthy)) && 'text-danger',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-2 shrink-0 rounded-full bg-current',
                  state.kind === 'loading' && !reduceMotion && 'animate-pulse',
                )}
              />
              {title}
            </div>
            <ul aria-busy={state.kind === 'loading'} className="divide-y divide-border">
              {services.map((service) => (
                <li
                  key={service.label}
                  className="flex items-center justify-between gap-4 py-4 text-sm"
                >
                  <span>{service.label}</span>
                  <span
                    className={cn(
                      'flex items-center gap-2 text-xs',
                      service.status === 'up'
                        ? 'text-success'
                        : service.status === 'down'
                          ? 'text-danger'
                          : 'text-muted-foreground',
                    )}
                  >
                    <span aria-hidden className="size-1.5 rounded-full bg-current" />
                    {service.status === 'up'
                      ? t.up
                      : service.status === 'down'
                        ? t.down
                        : t.pending}
                  </span>
                </li>
              ))}
            </ul>
            {state.kind === 'error' && (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.failedDetail}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">
                {t.lastChecked}
                <span className="mt-1 block font-medium text-foreground">
                  {state.kind === 'ready'
                    ? new Date(state.data.timestamp).toLocaleTimeString(
                        locale === 'ar' ? 'ar-JO' : 'en-JO',
                        { hour: '2-digit', minute: '2-digit', second: '2-digit' },
                      )
                    : '—'}
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={state.kind === 'loading'}
                onClick={() => void check()}
              >
                {t.retry}
                <span aria-hidden>↻</span>
              </Button>
            </div>
          </section>
        </motion.section>
        <section className="mt-20 border-t border-border pt-8 sm:mt-28">
          <h2 className="text-lg font-semibold">{t.foundation}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{t.foundationDetail}</p>
          <p className="mt-6 text-xs leading-6 text-muted-foreground">{t.note}</p>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 pb-8 text-xs text-muted-foreground sm:px-10">
        <span>VENTRO</span>
        <span>{t.footer}</span>
      </footer>
    </div>
  );
}
