'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import LogoLink from '@/components/layout/LogoLink'

export default function NotFoundContent() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <>
      <header className="px-margin-mobile md:px-margin-desktop h-16 flex items-center border-b border-outline-variant">
        <LogoLink />
      </header>

      <main className="flex flex-col items-center justify-center flex-1 px-margin-mobile md:px-margin-desktop py-24 text-center">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="max-w-lg mx-auto"
        >
          <p
            className="font-montserrat font-black text-tertiary-container leading-none mb-2"
            style={{ fontSize: 'clamp(80px, 18vw, 160px)' }}
            aria-hidden="true"
          >
            404
          </p>
          <h1 className="font-montserrat text-headline-md font-bold text-primary mb-4">
            Hors tapis&nbsp;!
          </h1>
          <p className="font-inter text-body-lg text-on-surface-variant mb-10">
            La page que tu cherches n&apos;existe pas ou a été déplacée.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/?focus=search"
              className="inline-flex items-center justify-center bg-primary text-on-primary font-montserrat font-bold text-label-bold px-6 py-3 rounded-xl hover:bg-primary-container transition-colors active:scale-95"
            >
              Rechercher un judoka
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center border-2 border-primary text-primary font-montserrat font-bold text-label-bold px-6 py-3 rounded-xl hover:bg-primary/5 transition-colors active:scale-95"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </motion.div>
      </main>
    </>
  )
}
