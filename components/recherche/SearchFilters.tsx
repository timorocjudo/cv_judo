'use client'

import { useState, useEffect } from 'react'
import ClubAutocomplete from '@/components/ClubAutocomplete'
import { GRADE_FILTER_OPTIONS, AGE_CATEGORY_GROUPS, WEIGHT_FILTER_OPTIONS } from '@/lib/searchFilterConfig'

export interface SearchFiltersProps {
  q: string
  onQChange: (q: string) => void
  clubId: string | null
  clubName: string | null
  onClubChange: (id: string | null, name: string | null, slug?: string | null) => void
  selectedCategories: string[]
  onCategoryToggle: (slug: string) => void
  selectedGrades: string[]
  onGradeToggle: (slug: string) => void
  selectedPoids: string[]
  onPoidsToggle: (slug: string) => void
  hasActiveFilters: boolean
  onReset: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-outline-variant pb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-sm font-semibold text-on-surface"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-outline transition-transform ${open ? '' : '-rotate-90'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-2 space-y-1">{children}</div>}
    </div>
  )
}

function CheckItem({
  label, checked, onToggle, color,
}: { label: string; checked: boolean; onToggle: () => void; color?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
      />
      {color && (
        <span
          className="w-4 h-1 rounded-sm border border-outline-variant/60 flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      <span className="text-sm text-on-surface group-hover:text-primary transition-colors">{label}</span>
    </label>
  )
}

export default function SearchFilters({
  q, onQChange,
  clubId, clubName, onClubChange,
  selectedCategories, onCategoryToggle,
  selectedGrades, onGradeToggle,
  selectedPoids, onPoidsToggle,
  hasActiveFilters, onReset,
}: SearchFiltersProps) {
  const [localQ, setLocalQ] = useState(q)
  useEffect(() => { setLocalQ(q) }, [q])

  function handleQChange(value: string) {
    setLocalQ(value)
    onQChange(value)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-montserrat font-bold text-primary text-base uppercase tracking-wide">Filtres</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-secondary hover:text-secondary-container transition-colors font-medium"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Text search */}
      <Section title="Recherche par nom">
        <input
          type="text"
          value={localQ}
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Prénom ou nom…"
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-outline bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </Section>

      {/* Club */}
      <Section title="Club">
        <ClubAutocomplete
          value={clubId}
          valueName={clubName}
          onChange={onClubChange}
          placeholder="Recherche un club…"
          disableCreate
        />
      </Section>

      {/* Age category */}
      <Section title="Catégorie d'âge">
        {AGE_CATEGORY_GROUPS.map((group) => (
          <CheckItem
            key={group.slug}
            label={group.label}
            checked={selectedCategories.includes(group.slug)}
            onToggle={() => onCategoryToggle(group.slug)}
          />
        ))}
      </Section>

      {/* Grade */}
      <Section title="Grade / Ceinture">
        {GRADE_FILTER_OPTIONS.map((g) => (
          <CheckItem
            key={g.slug}
            label={g.label}
            checked={selectedGrades.includes(g.slug)}
            onToggle={() => onGradeToggle(g.slug)}
            color={g.color}
          />
        ))}
      </Section>

      {/* Poids */}
      <Section title="Catégorie de poids">
        <div className="grid grid-cols-2 gap-x-2">
          {WEIGHT_FILTER_OPTIONS.map((w) => (
            <CheckItem
              key={w}
              label={w}
              checked={selectedPoids.includes(w)}
              onToggle={() => onPoidsToggle(w)}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}
