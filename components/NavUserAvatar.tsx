'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
}

export default function NavUserAvatar({ initialIsLoggedIn = false }: NavUserAvatarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_photo_url')
          .eq('owner_id', user.id)
          .single()
        setProfile(data)
      }
      setLoaded(true)
    }

    load()
  }, [])

  // Not yet loaded — use server hint to avoid layout flash
  if (!loaded) {
    if (!initialIsLoggedIn) {
      return (
        <div className="hidden md:block">
          <LoginButton />
        </div>
      )
    }
    // Logged in but profile not yet fetched → skeleton avatar
    return (
      <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-tertiary-container animate-pulse" />
    )
  }

  if (!user) {
    return (
      <div className="hidden md:block">
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
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 group min-h-[44px]"
      aria-label="Tableau de bord"
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
    </Link>
  )
}
