'use client'

import { motion, useReducedMotion } from 'framer-motion'

interface FadeInOnScrollProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export default function FadeInOnScroll({ children, delay = 0, className }: FadeInOnScrollProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
