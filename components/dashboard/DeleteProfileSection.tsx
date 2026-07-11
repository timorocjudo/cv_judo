'use client'

import { useState, useRef } from 'react'
import { removeFromManagement, deleteProfile } from '@/app/dashboard/[profileId]/actions'

interface DeleteProfileSectionProps {
  profileId: string
  firstName: string
  userRole: 'owner' | 'manager'
}

export default function DeleteProfileSection({
  profileId,
  firstName,
  userRole,
}: DeleteProfileSectionProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  function openDeleteModal() {
    setConfirmInput('')
    dialogRef.current?.showModal()
  }

  function closeDeleteModal() {
    setConfirmInput('')
    dialogRef.current?.close()
  }

  return (
    <div className="mt-10 border border-red-200 rounded-xl p-5 bg-red-50/40">
      <p className="font-montserrat font-bold text-sm uppercase tracking-wide text-red-700 mb-4">
        Zone dangereuse
      </p>

      {userRole === 'manager' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-on-surface-variant">
            Me retirer de la gestion de ce profil — le profil continuera d&apos;exister, géré par son propriétaire.
          </p>
          {!showRemoveConfirm ? (
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              className="self-start text-sm font-semibold text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
            >
              Me retirer de la gestion
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <form action={removeFromManagement}>
                <input type="hidden" name="profileId" value={profileId} />
                <button
                  type="submit"
                  className="text-sm font-semibold text-white bg-red-600 rounded-lg px-4 py-2 hover:bg-red-700 transition-colors"
                >
                  Confirmer
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                className="text-sm font-medium text-on-surface-variant hover:text-on-surface"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {userRole === 'owner' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-on-surface-variant">
            Supprimer définitivement le profil de {firstName} — palmarès, photos et vidéos inclus. Action irréversible.
          </p>
          <button
            type="button"
            onClick={openDeleteModal}
            className="self-start text-sm font-semibold text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
          >
            Supprimer définitivement le profil de {firstName}
          </button>

          {/* Modale de confirmation */}
          <dialog
            ref={dialogRef}
            className="rounded-2xl border border-outline-variant shadow-xl p-6 max-w-md w-full backdrop:bg-black/40"
            onCancel={closeDeleteModal}
          >
            <p className="font-montserrat font-bold text-primary text-lg mb-2">
              Supprimer le profil de {firstName} ?
            </p>
            <p className="text-sm text-on-surface-variant mb-4">
              Cette action est <strong>irréversible</strong>. Le profil, son palmarès, ses photos et ses vidéos seront définitivement supprimés.
            </p>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Tape <strong>{firstName}</strong> pour confirmer
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={firstName}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 mb-4"
            />
            <div className="flex gap-3">
              <form action={deleteProfile} className="flex-1">
                <input type="hidden" name="profileId" value={profileId} />
                <input type="hidden" name="confirmedName" value={confirmInput} />
                <button
                  type="submit"
                  disabled={confirmInput !== firstName}
                  className="w-full text-sm font-semibold text-white bg-red-600 rounded-lg px-4 py-2.5 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Supprimer définitivement
                </button>
              </form>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="text-sm font-medium text-on-surface-variant border border-outline-variant rounded-lg px-4 py-2.5 hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
            </div>
          </dialog>
        </div>
      )}
    </div>
  )
}
