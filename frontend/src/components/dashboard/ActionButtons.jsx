import { useState, useRef } from 'react'

/**
 * The 3 core barber actions.
 * Each button shows a loading state while the API call is in flight.
 * Confirmation is required for Off Duty (destructive — redistributes queue).
 * 
 */

 // instant lock, faster than state

const handleAction = async (action, fn) => {
  if (pendingRef.current) return  // block if already in flight
  pendingRef.current = true
  setLoadingAction(action)
  try {
    await fn()
  } finally {
    setLoadingAction(null)
    pendingRef.current = false
  }
}

export default function ActionButtons({
  barberId,
  hasCurrentCustomer,
  isOffDuty,
  onNext,
  onNoShow,
  onOffDuty,
  onOnDuty,
}) {
  const pendingRef = useRef(false) 
  const [loadingAction, setLoadingAction] = useState(null)
  const [confirmOffDuty, setConfirmOffDuty] = useState(false)

  const handleAction = async (action, fn) => {
    setLoadingAction(action)
    try {
      await fn()
    } finally {
      setLoadingAction(false)
    }
  }

  const isLoading = (action) => loadingAction === action

  // ── OFF DUTY MODE: show a single "I'm Back" button ──────────────────
  if (isOffDuty) {
    return (
      <div className="flex flex-col gap-3">
        <div className="w-full rounded-2xl border border-dashed border-zinc-700
                        bg-zinc-800/20 px-5 py-4 text-center">
          <p className="text-zinc-500 text-sm">You are currently off duty</p>
          <p className="text-zinc-600 text-xs mt-0.5">Uko nje ya zamu</p>
        </div>
        <button
          onClick={() => handleAction('onduty', onOnDuty)}
          disabled={!!loadingAction}
          className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98]
                     disabled:opacity-50 text-white font-bold py-5 rounded-2xl
                     transition-all duration-200 text-base shadow-lg shadow-emerald-500/20"
        >
          {isLoading('onduty') ? '...' : "✅  I'm Back — Niko Tayari"}
        </button>
      </div>
    )
  }

  // ── OFF DUTY CONFIRMATION ────────────────────────────────────────────
  if (confirmOffDuty) {
    return (
      <div className="flex flex-col gap-3">
        <div className="w-full rounded-2xl border border-red-500/30
                        bg-red-500/5 px-5 py-4 text-center">
          <p className="text-red-400 font-semibold">Going off duty?</p>
          <p className="text-zinc-400 text-sm mt-1">
            Your waiting customers will be reassigned to other barbers.
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Wateja wako watahamishiwa kwa kinyozi mwingine.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setConfirmOffDuty(false)}
            className="bg-zinc-700 hover:bg-zinc-600 text-white font-semibold
                       py-4 rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setConfirmOffDuty(false)
              handleAction('offduty', onOffDuty)
            }}
            disabled={!!loadingAction}
            className="bg-red-500 hover:bg-red-400 text-white font-semibold
                       py-4 rounded-2xl transition-all disabled:opacity-50"
          >
            {isLoading('offduty') ? '...' : 'Confirm'}
          </button>
        </div>
      </div>
    )
  }

  // ── NORMAL ACTION BUTTONS ────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* Primary: Next Customer */}
      <button
        onClick={() => handleAction('next', onNext)}
        disabled={!!loadingAction}
        className="w-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98]
                   disabled:opacity-50 text-zinc-900 font-black py-5 rounded-2xl
                   transition-all duration-200 text-lg shadow-lg shadow-amber-400/20"
      >
        {isLoading('next')
          ? 'Calling...'
          : hasCurrentCustomer
            ? '✂️  Next Customer — Mfuatao'
            : '✂️  Call First Customer — Mwanzo'}
      </button>

      {/* Secondary: No Show — only relevant if someone is in the chair */}
      <button
        onClick={() => handleAction('noshow', onNoShow)}
        disabled={!!loadingAction || !hasCurrentCustomer}
        className="w-full bg-zinc-700 hover:bg-zinc-600 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-bold py-4 rounded-2xl
                   transition-all duration-200"
      >
        {isLoading('noshow') ? '...' : '✗  No Show — Hakuja'}
      </button>

      {/* Tertiary: Off Duty */}
      <button
        onClick={() => setConfirmOffDuty(true)}
        disabled={!!loadingAction}
        className="w-full bg-transparent border border-zinc-700
                   hover:border-red-500/50 hover:text-red-400
                   active:scale-[0.98] disabled:opacity-50
                   text-zinc-400 font-medium py-3.5 rounded-2xl
                   transition-all duration-200 text-sm"
      >
        ⏸  Off Duty — Pumzika
      </button>

    </div>
  )
}
