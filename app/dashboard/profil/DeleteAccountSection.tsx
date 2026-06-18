'use client'

import { useState, useTransition } from 'react'
import { deleteAccount } from './actions'

export default function DeleteAccountSection() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteAccount()
    })
  }

  function handleClose() {
    setIsOpen(false)
    setConfirmText('')
  }

  return (
    <>
      <div className="mt-12 pt-8 border-t-2 border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-red-500 rounded-full flex-shrink-0" />
          <h2 className="font-montserrat text-headline-md font-bold text-red-600 uppercase">
            Zone dangereuse
          </h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-4 max-w-md">
          Supprime définitivement ton compte, toutes tes données et tes fichiers.
          Cette action est irréversible.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="border border-red-500 text-red-600 font-semibold px-6 py-2.5 rounded-lg hover:bg-red-50 transition-colors text-sm"
        >
          Supprimer mon compte
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-montserrat font-bold text-primary text-lg">
              Supprimer mon compte ?
            </h3>
            <p className="text-sm text-on-surface-variant">
              Cette action est <strong>irréversible</strong>. Toutes tes données,
              photos et palmarès seront supprimés définitivement.
            </p>
            <div>
              <label
                htmlFor="confirm-delete-input"
                className="block text-sm font-medium text-on-surface mb-1"
              >
                Pour confirmer, tape <strong>SUPPRIMER</strong> ci-dessous
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                disabled={isPending}
                className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 border border-outline-variant text-on-surface font-medium px-4 py-2.5 rounded-lg hover:bg-surface-container transition-colors text-sm disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== 'SUPPRIMER' || isPending}
                className="flex-1 bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
