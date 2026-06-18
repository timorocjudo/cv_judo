'use client'

import { useState } from 'react'
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
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (initial) {
      await updatePalmares(fd)
    } else {
      await addPalmares(fd)
      e.currentTarget.reset()
    }
    onDone()
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
          className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-primary-container transition-colors"
        >
          {initial ? 'Mettre à jour' : 'Ajouter'}
        </button>
        {initial && (
          <button
            type="button"
            onClick={onDone}
            className="border border-outline-variant text-on-surface-variant font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-surface-container transition-colors"
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
                          onClick={async () => { await deletePalmares(entry.id); setConfirming(null) }}
                          className="text-xs font-semibold text-secondary hover:underline"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          className="text-xs text-on-surface-variant hover:underline"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditing(entry.id)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setConfirming(entry.id)}
                          className="text-xs font-medium text-secondary hover:underline"
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
