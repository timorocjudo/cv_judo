'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

export default function HeroZone() {
  const prefersReduced = useReducedMotion() ?? false

  const dur = prefersReduced ? 0 : 0.4
  const yVal = prefersReduced ? 0 : 20

  return (
    <section className="relative overflow-hidden bg-[#1B3A6B] min-h-[60vh] md:min-h-[70vh] lg:min-h-[75vh] flex items-center justify-center px-margin-mobile md:px-margin-desktop py-20">
      {/* Decorative circles */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#1E4A8A] opacity-[0.15] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-[#1E4A8A] opacity-[0.15] pointer-events-none" />

      <div className="relative z-10 text-center max-w-4xl mx-auto w-full">
        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur, delay: 0, ease: 'easeOut' }}
          className="font-montserrat text-[3rem] font-black tracking-tight"
        >
          <span className="text-white">Ippon</span>
          <span className="text-[#D4A017]">Id</span>
        </motion.div>

        {/* Decorative gold bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: dur, delay: prefersReduced ? 0 : 0.075, ease: 'easeOut' }}
          style={{ originX: 'center' }}
          className="w-20 h-0.5 bg-[#D4A017] mx-auto my-6"
        />

        {/* H1 */}
        <motion.h1
          initial={{ opacity: 0, y: yVal }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, delay: prefersReduced ? 0 : 0.15, ease: 'easeOut' }}
          className="font-montserrat font-black text-white leading-tight mb-6"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1 }}
        >
          Ton palmarès mérite sa propre page.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: yVal }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, delay: prefersReduced ? 0 : 0.3, ease: 'easeOut' }}
          className="font-inter text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10"
        >
          Crée gratuitement ta page judoka avec ton palmarès, tes vidéos et ta galerie photo.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: yVal }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, delay: prefersReduced ? 0 : 0.45, ease: 'easeOut' }}
        >
          <Link
            href="/creer-mon-profil"
            className="inline-block bg-[#D4A017] text-[#1B3A6B] font-bold font-montserrat px-8 py-4 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-150 w-full sm:w-auto text-center"
          >
            Créer mon profil gratuitement <span className="hidden sm:inline">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
