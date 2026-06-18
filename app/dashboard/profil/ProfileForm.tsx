'use client'

import { useState } from 'react'
import ImageUploader from '@/components/dashboard/ImageUploader'
import { saveProfile } from './actions'

const GRADES = [
  '6e kyu', '5e kyu', '4e kyu', '3e kyu', '2e kyu', '1er kyu',
  '1er dan', '2e dan', '3e dan+',
]

interface Profile {
  first_name: string
  last_name: string
  club: string | null
  category: string | null
  grade: string | null
  bio: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  owner_id: string
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(profile.profile_photo_url ?? '')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(profile.cover_photo_url ?? '')

  return (
    <form action={saveProfile} className="space-y-6 max-w-xl">
      <fieldset className="space-y-4">
        <legend className="font-montserrat font-bold text-primary text-lg mb-2">Identité</legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Prénom</label>
            <input
              type="text"
              value={profile.first_name}
              readOnly
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container text-on-surface-variant text-sm cursor-not-allowed"
            />
            <p className="text-xs text-on-surface-variant mt-1">Modifiable via les paramètres Google</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Nom</label>
            <input
              type="text"
              value={profile.last_name}
              readOnly
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container text-on-surface-variant text-sm cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="club">Club</label>
          <input
            id="club"
            name="club"
            type="text"
            defaultValue={profile.club ?? ''}
            className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="category">
              Catégorie de poids
            </label>
            <input
              id="category"
              name="category"
              type="text"
              defaultValue={profile.category ?? ''}
              placeholder="-66 kg"
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="grade">Grade</label>
            <select
              id="grade"
              name="grade"
              defaultValue={profile.grade ?? ''}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Sélectionner —</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
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

      <button
        type="submit"
        className="bg-primary text-on-primary font-semibold px-8 py-3 rounded-lg hover:bg-primary-container transition-colors"
      >
        Enregistrer
      </button>
    </form>
  )
}
