'use client'

import { useState, useEffect, useRef } from 'react'
import { useFormState } from 'react-dom'
import { toast } from 'sonner'
import ClubAutocomplete from '@/components/ClubAutocomplete'
import ImageUploader from '@/components/dashboard/ImageUploader'
import { BeltBadge } from '@/components/dashboard/BeltBadge'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { BELTS } from '@/lib/judo-belts'
import { computeAgeCategory } from '@/lib/ageCategory'
import { saveProfile } from '@/app/dashboard/[profileId]/profil/actions'

type AgeGroup = 'Benjamin' | 'Minime' | 'Cadet' | 'Junior' | 'Sénior'

const AGE_GROUPS: AgeGroup[] = ['Benjamin', 'Minime', 'Cadet', 'Junior', 'Sénior']

const CATEGORIES_BY_AGE: Record<AgeGroup, { garcons: string[]; filles: string[] }> = {
  Benjamin: {
    garcons: ['-30 kg', '-34 kg', '-38 kg', '-42 kg', '-46 kg', '-50 kg', '-55 kg', '-60 kg', '+60 kg'],
    filles:  ['-28 kg', '-32 kg', '-36 kg', '-40 kg', '-44 kg', '-48 kg', '-52 kg', '-57 kg', '+57 kg'],
  },
  Minime: {
    garcons: ['-34 kg', '-38 kg', '-42 kg', '-46 kg', '-50 kg', '-55 kg', '-60 kg', '-66 kg', '-73 kg', '+73 kg'],
    filles:  ['-32 kg', '-36 kg', '-40 kg', '-44 kg', '-48 kg', '-52 kg', '-57 kg', '-63 kg', '-70 kg', '+70 kg'],
  },
  Cadet: {
    garcons: ['-46 kg', '-50 kg', '-55 kg', '-60 kg', '-66 kg', '-73 kg', '-81 kg', '-90 kg', '+90 kg'],
    filles:  ['-40 kg', '-44 kg', '-48 kg', '-52 kg', '-57 kg', '-63 kg', '-70 kg', '-78 kg', '+78 kg'],
  },
  Junior: {
    garcons: ['-55 kg', '-60 kg', '-66 kg', '-73 kg', '-81 kg', '-90 kg', '-100 kg', '+100 kg'],
    filles:  ['-44 kg', '-48 kg', '-52 kg', '-57 kg', '-63 kg', '-70 kg', '-78 kg', '+78 kg'],
  },
  Sénior: {
    garcons: ['-60 kg', '-66 kg', '-73 kg', '-81 kg', '-90 kg', '-100 kg', '+100 kg'],
    filles:  ['-48 kg', '-52 kg', '-57 kg', '-63 kg', '-70 kg', '-78 kg', '+78 kg'],
  },
}

function getAgeGroupFromCategory(category: string): AgeGroup {
  if (!category) return 'Sénior'
  if (
    category.startsWith('Éveil') ||
    category.startsWith('Pré-Poussins') ||
    category.startsWith('Poussins') ||
    category.startsWith('Benjamins')
  ) return 'Benjamin'
  if (category.startsWith('Minimes')) return 'Minime'
  if (category.startsWith('Cadets')) return 'Cadet'
  if (category.startsWith('Juniors')) return 'Junior'
  return 'Sénior'
}

interface Profile {
  first_name: string
  last_name: string
  club_id: string | null
  club_name: string | null
  category: string | null
  grade: string | null
  bio: string | null
  birth_date: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  owner_id: string
}

export default function ProfileForm({ profile, profileId }: { profile: Profile; profileId: string }) {
  const [state, formAction] = useFormState(saveProfile, { ok: null })
  const isFirstRender = useRef(true)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(profile.profile_photo_url ?? '')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(profile.cover_photo_url ?? '')
  const [clubId, setClubId] = useState<string | null>(profile.club_id ?? null)
  const [clubName, setClubName] = useState<string | null>(profile.club_name ?? null)
  const [selectedGrade, setSelectedGrade] = useState(profile.grade ?? '')
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? '')
  const computedCategory = computeAgeCategory(birthDate || undefined)
  const initialAgeGroup = getAgeGroupFromCategory(computedCategory)
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(initialAgeGroup)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (state.ok === true) toast.success('Profil mis à jour')
    else if (state.ok === false) toast.error('Une erreur est survenue, réessaie')
  }, [state])

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      <input type="hidden" name="profileId" value={profileId} />
      <fieldset className="space-y-4">
        <legend className="font-montserrat font-bold text-primary text-lg mb-2">Identité</legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="first_name">Prénom</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              defaultValue={profile.first_name}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="last_name">Nom</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              defaultValue={profile.last_name}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="birth_date">Date de naissance</label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            value={birthDate}
            onChange={(e) => {
              setBirthDate(e.target.value)
              const group = getAgeGroupFromCategory(computeAgeCategory(e.target.value || undefined))
              setAgeGroup(group)
            }}
            className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {birthDate && computedCategory && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs text-on-surface-variant">
                Calculé automatiquement :
              </span>
              <span className="text-xs font-semibold text-primary">
                {computedCategory}
              </span>
              <button
                type="button"
                onClick={() => setAgeGroup(getAgeGroupFromCategory(computedCategory))}
                className="text-xs text-primary underline hover:no-underline"
              >
                Utiliser cette valeur
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1">Club</label>
          <ClubAutocomplete
            value={clubId}
            valueName={clubName}
            onChange={(id, name) => {
              setClubId(id)
              setClubName(name)
            }}
          />
          <input type="hidden" name="club_id" value={clubId ?? ''} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Catégorie d&apos;âge</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="category">
              Catégorie de poids
            </label>
            <select
              id="category"
              name="category"
              defaultValue={profile.category ?? ''}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Sélectionner —</option>
              <optgroup label="Garçons / Hommes">
                {CATEGORIES_BY_AGE[ageGroup].garcons.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Filles / Femmes">
                {CATEGORIES_BY_AGE[ageGroup].filles.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-on-surface mb-2">Grade</p>
          <input type="hidden" name="grade" value={selectedGrade} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BELTS.map((belt) => {
              const isSelected = selectedGrade === belt.label
              return (
                <button
                  key={belt.slug}
                  type="button"
                  onClick={() => setSelectedGrade(belt.label)}
                  className={`flex flex-col gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline'
                  }`}
                >
                  <BeltBadge belt={belt} height={20} />
                  {belt.label}
                </button>
              )
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-montserrat font-bold text-primary text-lg mb-2">Bio</legend>
        <div>
          <textarea
            name="bio"
            defaultValue={profile.bio ?? ''}
            rows={4}
            maxLength={500}
            placeholder="Présente-toi en quelques mots…"
            className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-montserrat font-bold text-primary text-lg mb-2">Photos</legend>

        <div>
          <p className="text-sm font-medium text-on-surface mb-2">Photo de profil</p>
          <ImageUploader
            fieldName="profile_photo"
            currentUrl={profilePhotoUrl}
            ownerId={profile.owner_id}
            onUpload={setProfilePhotoUrl}
          />
          <input type="hidden" name="profile_photo_url" value={profilePhotoUrl} />
        </div>

        <div>
          <p className="text-sm font-medium text-on-surface mb-2">Photo de couverture</p>
          <ImageUploader
            fieldName="cover_photo"
            currentUrl={coverPhotoUrl}
            ownerId={profile.owner_id}
            onUpload={setCoverPhotoUrl}
            aspectRatio="wide"
          />
          <input type="hidden" name="cover_photo_url" value={coverPhotoUrl} />
        </div>
      </fieldset>

      <SubmitButton
        pendingText="Enregistrement…"
        className="bg-primary text-on-primary font-semibold px-8 py-3 rounded-lg hover:bg-primary-container"
      >
        Enregistrer
      </SubmitButton>
    </form>
  )
}
