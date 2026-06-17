'use client'
import { useState } from 'react'
import Link from 'next/link'
import LoginButton from '@/components/auth/LoginButton'

interface LandingNavProps {
  isLoggedIn: boolean
}

export default function LandingNav({ isLoggedIn }: LandingNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md shadow-sm">
      <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-20 max-w-container-max mx-auto">
        <span className="font-montserrat text-2xl font-black text-primary tracking-tight">IpponId</span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-on-surface-variant text-sm font-semibold hover:text-secondary transition-colors">
            Comment ça marche
          </a>
          <a href="#profiles" className="text-on-surface-variant text-sm font-semibold hover:text-secondary transition-colors">
            Exemples de profils
          </a>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors active:scale-95"
            >
              Tableau de bord
            </Link>
          ) : (
            <LoginButton />
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-primary p-2"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-surface shadow-lg py-6 flex flex-col items-center gap-5 border-t border-outline-variant">
          <a href="#how-it-works" onClick={() => setOpen(false)} className="text-on-surface-variant text-sm font-semibold">
            Comment ça marche
          </a>
          <a href="#profiles" onClick={() => setOpen(false)} className="text-on-surface-variant text-sm font-semibold">
            Exemples de profils
          </a>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-semibold w-11/12 text-center"
            >
              Tableau de bord
            </Link>
          ) : (
            <div className="w-11/12 flex justify-center">
              <LoginButton />
            </div>
          )}
        </div>
      )}
    </header>
  )
}
