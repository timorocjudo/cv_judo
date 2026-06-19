'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { addPalmares, updatePalmares, deletePalmares } from './actions'

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
}: {
  initial?: PalmaresRow
  onDone: () => void
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
          toast.success(initial ? 'Résultat mis à jour' : 'Ajouté avec succès')
          if (!initial) form.reset()
          onDone()
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

export default function PalmaresManager({ entries }: { entries: PalmaresRow[] }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h2 className="font-montserrat font-bold text-primary text-lg">Ajouter une entrée</h2>
      <PalmaresForm onDone={() => {}} />

      {entries.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="font-montserrat font-bold text-primary text-lg">Mes résultats</h2>
          {entries.map((entry) => (
            <div key={entry.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
              {editing === entry.id ? (
                <div className="p-4">
                  <PalmaresForm
                    initial={entry}
                    onDone={() => setEditing(null)}
                  />
                </div>
              ) : (
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
                          onClick={() => setEditing(entry.id)}
                          className="text-xs font-medium text-primary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 rounded transition-all"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setConfirming(entry.id)}
                          className="text-xs font-medium text-secondary hover:underline active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary/50 rounded transition-all"
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
