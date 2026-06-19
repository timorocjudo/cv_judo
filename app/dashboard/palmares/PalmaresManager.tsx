'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { addPalmares, updatePalmares, deletePalmares } from './actions'
import ShareButtons from '@/components/ShareButtons'

const LEVELS = ['Départemental', 'Régional', 'National', 'International']
const POSITIONS = [
  { value: 1, label: '1re place' },
  { value: 2, label: '2e place' },
  { value: 3, label: '3e place' },
  { value: 5, label: '5e place' },
  { value: 7, label: '7e place' },
  { value: 9, label: '9e place' },
]

interface PalmaresRow {
  id: string
  date: string | null
  competition: string | null
  city: string | null
  category: string | null
  level: string | null
  position: number | null
  result: string | null
  medal: string | null
}

function MedalBadge({ medal }: { medal: string | null }) {
  if (!medal) return null
  const colors: Record<string, string> = {
    gold: 'bg-medal-gold/20 text-tertiary border-medal-gold/40',
    silver: 'bg-medal-silver/20 text-on-surface-variant border-medal-silver/40',
    bronze: 'bg-medal-bronze/20 text-on-surface border-medal-bronze/40',
  }
  const labels: Record<string, string> = { gold: 'Or', silver: 'Argent', bronze: 'Bronze' }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[medal] ?? ''}`}>
      {labels[medal] ?? medal}
    </span>
  )
}

function PalmaresForm({
  initial,
  onDone,
  onAdded,
}: {
  initial?: PalmaresRow
  onDone: () => void
  onAdded?: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTransition(async () => {
      try {
        const result = initial ? await updatePalmares(fd) : await addPalmares(fd)
        if (result.ok) {
          if (initial) {
            toast.success('Résultat mis à jour')
            onDone()
          } else {
            toast.success('Ajouté avec succès')
            form.reset()
            onDone()
            if (onAdded && 'id' in result) onAdded((result as { ok: true; id: string }).id)
          }
        } else {
          toast.error('Une erreur est survenue, réessaie')
        }
      } catch {
        toast.error('Une erreur est survenue, réessaie')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low rounded-xl p-5 border border-outline-variant">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-date">Date</label>
        <input
          id="palm-date"
          name="date"
          type="date"
          defaultValue={initial?.date ?? ''}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-competition">Compétition</label>
        <input
          id="palm-competition"
          name="competition"
          type="text"
          defaultValue={initial?.competition ?? ''}
          placeholder="Championnat de France"
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-city">Ville</label>
        <input
          id="palm-city"
          name="city"
          type="text"
          defaultValue={initial?.city ?? ''}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-category">Catégorie de poids</label>
        <input
          id="palm-category"
          name="category"
          type="text"
          defaultValue={initial?.category ?? ''}
          placeholder="-66 kg"
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-level">Niveau</label>
        <select
          id="palm-level"
          name="level"
          defaultValue={initial?.level ?? ''}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          <option value="">— Sélectionner —</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1" htmlFor="palm-position">Place</label>
        <select
          id="palm-position"
          name="position"
          defaultValue={initial?.position ?? ''}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          <option value="">— Sélectionner —</option>
          {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div className="sm:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {initial ? 'Mise à jour…' : 'Ajout…'}
            </span>
          ) : (initial ? 'Mettre à jour' : 'Ajouter')}
        </button>
        {initial && (
          <button
            type="button"
            onClick={onDone}
            disabled={isPending}
            className="border border-outline-variant text-on-surface-variant font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-surface-container transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 disabled:opacity-60"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  )
}

export default function PalmaresManager({
  entries,
  isPublished,
  profileSlug,
}: {
  entries: PalmaresRow[]
  isPublished: boolean
  profileSlug: string
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [justAddedId, setJustAddedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h2 className="font-montserrat font-bold text-primary text-lg">Ajouter une entrée</h2>
      <PalmaresForm onDone={() => {}} onAdded={(id) => setJustAddedId(id)} />

      {entries.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="font-montserrat font-bold text-primary text-lg">Mes résultats</h2>
          {entries.map((entry) => {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
            const shareUrl = `${siteUrl}/${profileSlug}#result-${entry.id}`
            const shareImageUrl = `${siteUrl}/api/og/result/${profileSlug}/${entry.id}`
            const isJustAdded = justAddedId === entry.id

            return (
              <div
                key={entry.id}
                className={`bg-surface-container-lowest rounded-xl border overflow-hidden ${
                  isJustAdded ? 'border-tertiary-container' : 'border-outline-variant'
                }`}
              >
                {editing === entry.id ? (
                  <div className="p-4">
                    <PalmaresForm
                      initial={entry}
                      onDone={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="p-4 flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <MedalBadge medal={entry.medal} />
                          <span className="text-sm font-bold text-on-surface">{entry.result}</span>
                        </div>
                        <p className="text-sm text-on-surface">{entry.competition}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {entry.date} · {entry.level}{entry.city ? ` · ${entry.city}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Bouton partage persistant */}
                        {isPublished ? (
                          <button
                            onClick={() =>
                              setJustAddedId(justAddedId === entry.id ? null : entry.id)
                            }
                            title="Partager ce résultat"
                            className="text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Publie ton profil pour partager"
                            className="text-xs text-on-surface-variant/30 cursor-not-allowed"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                          </button>
                        )}

                        {/* Modifier / Supprimer */}
                        {confirming === entry.id ? (
                          <>
                            <button
                              onClick={async () => {
                                setDeleting(entry.id)
                                try {
                                  const result = await deletePalmares(entry.id)
                                  if (result.ok) toast.success('Supprimé')
                                  else toast.error('Une erreur est survenue, réessaie')
                                } catch {
                                  toast.error('Une erreur est survenue, réessaie')
                                } finally {
                                  setConfirming(null)
                                  setDeleting(null)
                                  if (justAddedId === entry.id) setJustAddedId(null)
                                }
                              }}
                              disabled={deleting === entry.id}
                              className="text-xs font-semibold text-secondary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary/50 rounded transition-all disabled:opacity-60"
                            >
                              {deleting === entry.id ? 'Suppression…' : 'Confirmer'}
                            </button>
                            <button
                              onClick={() => setConfirming(null)}
                              disabled={deleting === entry.id}
                              className="text-xs text-on-surface-variant hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 rounded transition-all disabled:opacity-60"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditing(entry.id); setJustAddedId(null) }}
                              className="text-xs font-medium text-primary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 rounded transition-all"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => { setConfirming(entry.id); setJustAddedId(null) }}
                              className="text-xs font-medium text-secondary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary/50 rounded transition-all"
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bannière post-ajout / partage ouvert */}
                    {isJustAdded && isPublished && (
                      <div className="border-t border-tertiary-container/30 bg-tertiary-container/5 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-tertiary uppercase tracking-wider">
                            Partage ce résultat !
                          </p>
                          <button
                            onClick={() => setJustAddedId(null)}
                            className="text-on-surface-variant hover:text-on-surface transition-colors"
                            aria-label="Fermer"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                        <ShareButtons
                          url={shareUrl}
                          imageUrl={shareImageUrl}
                          title={`${entry.result} — ${entry.competition} | IpponId`}
                          variant="light"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
