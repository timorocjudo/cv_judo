import { createClient } from '@/lib/supabase/server'
import { createProfile } from './actions'

export default async function SetupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const meta = user?.user_metadata ?? {}
  const defaultFirst: string = meta.given_name ?? meta.full_name?.split(' ')[0] ?? ''
  const defaultLast: string =
    meta.family_name ?? meta.full_name?.split(' ').slice(1).join(' ') ?? ''

  return (
    <div className="min-h-screen flex items-center justify-center px-margin-mobile">
      <div className="w-full max-w-md">
        <h1 className="font-montserrat text-headline-md font-bold text-primary mb-2">
          Complète ton profil
        </h1>
        <p className="text-on-surface-variant text-body-md mb-8">
          Ces informations seront visibles sur ta page publique.
        </p>
        <form action={createProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="firstName">
              Prénom
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              defaultValue={defaultFirst}
              required
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="lastName">
              Nom
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              defaultValue={defaultLast}
              required
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-semibold py-3 rounded-lg hover:bg-primary-container transition-colors"
          >
            Créer mon profil
          </button>
        </form>
      </div>
    </div>
  )
}
