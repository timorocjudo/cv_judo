export type PublishableProfile = {
  club_id: string | null
  category: string | null
  grade: string | null
  bio: string | null
  profile_photo_url: string | null
  birth_date: string | null
}

type RequiredField = { key: keyof PublishableProfile; label: string }

// bio is intentionally not required — a profile can be published without one
const REQUIRED_FIELDS: RequiredField[] = [
  { key: 'club_id',           label: 'Club' },
  { key: 'category',         label: 'Catégorie' },
  { key: 'grade',            label: 'Grade' },
  { key: 'profile_photo_url', label: 'Photo de profil' },
  { key: 'birth_date',       label: 'Date de naissance' },
]

export const REQUIRED_FIELD_LABELS: string[] = REQUIRED_FIELDS.map((f) => f.label)

export function getMissingFieldsForPublishing(profile: PublishableProfile): string[] {
  return REQUIRED_FIELDS
    .filter(({ key }) => !profile[key]?.trim())
    .map(({ label }) => label)
}
