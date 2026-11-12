'use client';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
export function MotionSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      tabIndex={-1}
      className={className}
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.div>
  );
}
