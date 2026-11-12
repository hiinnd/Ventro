'use client';
import { domAnimation, LazyMotion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import { animate } from 'motion/mini';
import { inView } from 'motion';
import { useEffect, useRef, type ReactNode } from 'react';

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (reduced || !element) return;
    let animation: { cancel: () => void } | undefined;
    const stop = inView(
      element,
      () => {
        animation = animate(
          element,
          { transform: ['translateY(14px)', 'translateY(0px)'] },
          { duration: 0.5, delay },
        );
      },
      { amount: 0.12 },
    );
    return () => {
      stop();
      animation?.cancel();
    };
  }, [reduced, delay]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
export function HeroAtmosphere() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const drift = useTransform(scrollY, [0, 700], [0, 42]);
  return (
    <LazyMotion features={domAnimation} strict>
      <div aria-hidden className="m-atmosphere">
        <m.div
          className="m-orbit m-orbit-one"
          style={{ y: reduced ? 0 : drift }}
          animate={reduced ? { rotate: 0 } : { rotate: [0, 10, 0] }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        <m.div
          className="m-orbit m-orbit-two"
          animate={reduced ? { y: 0 } : { y: [0, -12, 0] }}
          transition={{ duration: 4, ease: 'easeInOut' }}
        />
        <div className="m-hero-grid" />
      </div>
    </LazyMotion>
  );
}
