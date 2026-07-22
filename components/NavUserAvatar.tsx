'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoginButton from '@/components/auth/LoginButton'
import type { User } from '@supabase/supabase-js'

type ProfileData = {
  first_name: string
  last_name: string
  profile_photo_url: string | null
}

interface NavUserAvatarProps {
  initialIsLoggedIn?: boolean
  hideLoginOnMobile?: boolean
}

export default function NavUserAvatar({ initialIsLoggedIn = false, hideLoginOnMobile = true }: NavUserAvatarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function syncUser(nextUser: User | null) {
      setUser(nextUser)

      if (nextUser) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_photo_url')
          .eq('owner_id', nextUser.id)
          .maybeSingle()
        setProfile(data)
      } else {
        setProfile(null)
      }
      setLoaded(true)
    }

    // onAuthStateChange fires immediately with the current session (event
    // INITIAL_SESSION) and again on every SIGNED_IN/SIGNED_OUT — this keeps
    // the avatar in sync with signOut() calls fired from anywhere else
    // (same client singleton), without needing a manual reload.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  // Not yet loaded — use server hint to avoid layout flash
  if (!loaded) {
    if (!initialIsLoggedIn) {
      return (
        <div className={hideLoginOnMobile ? 'hidden md:block' : undefined}>
          <LoginButton />
        </div>
      )
    }
    return (
      <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-tertiary-container animate-pulse" />
    )
  }

  if (!user) {
    return (
      <div className={hideLoginOnMobile ? 'hidden md:block' : undefined}>
        <LoginButton />
      </div>
    )
  }

  let firstName: string
  let lastName: string
  let photoUrl: string | null

  if (profile) {
    firstName = profile.first_name
    lastName = profile.last_name
    photoUrl = profile.profile_photo_url
  } else {
    // No profile yet (new account) — fall back to Google metadata
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''
    const parts = fullName.trim().split(/\s+/)
    firstName = parts[0] ?? user.email?.split('@')[0] ?? ''
    lastName = parts.length > 1 ? parts[parts.length - 1] : ''
    photoUrl = null
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 group min-h-[44px]"
        aria-label="Menu utilisateur"
        aria-expanded={open}
      >
        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-tertiary-container flex-shrink-0 flex items-center justify-center bg-primary-container">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={`${firstName} ${lastName}`}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <span className="text-sm font-medium text-on-primary select-none">
              {initials}
            </span>
          )}
        </div>
        <span className="hidden md:block font-inter text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
          {firstName}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`hidden md:block w-4 h-4 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-lg border border-outline-variant overflow-hidden z-50">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mon profil
          </Link>
          <div className="border-t border-outline-variant" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
