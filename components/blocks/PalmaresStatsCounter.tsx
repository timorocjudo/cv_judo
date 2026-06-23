'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!inView) return
    if (shouldReduceMotion) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value, shouldReduceMotion])

  return <span ref={ref}>{display}</span>
}

interface PalmaresStatsCounterProps {
  totalCompetitions: number
  totalPodiums: number
}

export default function PalmaresStatsCounter({ totalCompetitions, totalPodiums }: PalmaresStatsCounterProps) {
  return (
    <div className="flex items-center gap-4 mb-8 font-inter text-sm font-semibold text-on-surface-variant">
      <span>
        <AnimatedCounter value={totalCompetitions} />
        {' '}compétition{totalCompetitions > 1 ? 's' : ''}
      </span>
      <span className="text-outline/50">·</span>
      <span>
        <AnimatedCounter value={totalPodiums} />
        {' '}podium{totalPodiums > 1 ? 's' : ''}
      </span>
    </div>
  )
}
