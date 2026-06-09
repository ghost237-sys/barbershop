import { useState, useRef } from 'react'

export default function ActionButtons({
  barberId,
  hasCurrentCustomer,
  isOffDuty,
  onNext,
  onNoShow,
  onOffDuty,
  onOnDuty,
  waitingCount = 0,
}) {
  const [loadingAction, setLoadingAction] = useState(null)
  const [confirmOffDuty, setConfirmOffDuty] = useState(false)
  const pendingRef = useRef(false)

  const handleAction = async (action, fn) => {
    if (pendingRef.current) return
    pendingRef.current = true
    setLoadingAction(action)
    try {
      await fn()
    } finally {
      setLoadingAction(null)
      pendingRef.current = false
    }
  }

  const isLoading = (action) => loadingAction === action

  if (isOffDuty) {
    return (
      <div className="flex flex-col gap-3">
        <div className="w-full rounded-2xl border border-dashed border-zinc-700
                        bg-zinc-800/20 px-5 py-5 text-center">
          <p className="text-zinc-400 font-semibold">You are off duty</p>
          <p className="text-zinc-600 text-sm mt-1">Uko nje ya zamu</p>
        </div>
        <button
          onClick={() => handleAction('onduty', onOnDuty)}
          disabled={!!loadingAction}
          className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97]
                     disabled:opacity-50 text-white font-black py-7 rounded-2xl
                     transition-all duration-200 text-xl shadow-lg shadow-emerald-500/20"
        >
          {isLoading('onduty') ? '...' : "✅  I'm Back — Niko Tayari"}
        </button>
      </div>
    )
  }

  if (confirmOffDuty) {
    return (
      <div className="flex flex-col gap-3">
        <div className="w-full rounded-2xl border border-red-500/30
                        bg-red-500/5 px-5 py-5 text-center">
          <p className="text-red-400 font-bold text-lg">Going off duty?</p>
          <p className="text-zinc-400 text-sm mt-2">
            Your {waitingCount} waiting customers will be reassigned.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setConfirmOffDuty(false)}
            className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold
                       py-5 rounded-2xl transition-all text-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setConfirmOffDuty(false)
              handleAction('offduty', onOffDuty)
            }}
            className="bg-red-500 hover:bg-red-400 text-white font-bold
                       py-5 rounded-2xl transition-all text-lg"
          >
            Confirm
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* NEXT CUSTOMER — huge, impossible to miss */}
      <button
        onClick={() => handleAction('next', onNext)}
        disabled={!!loadingAction}
        className="w-full bg-amber-400 hover:bg-amber-300 active:scale-[0.97]
                   disabled:opacity-50 text-zinc-900 font-black
                   py-8 rounded-2xl transition-all duration-200
                   text-2xl shadow-xl shadow-amber-400/30
                   border-b-4 border-amber-600"
      >
        {isLoading('next') ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-6 h-6 border-3 border-zinc-900/30 border-t-zinc-900
                             rounded-full animate-spin" />
            Calling...
          </span>
        ) : (
          <>
            <span className="block text-3xl mb-1">✂️</span>
            <span className="block">
              {hasCurrentCustomer ? 'Next Customer' : 'Call First Customer'}
            </span>
            <span className="block text-lg font-bold opacity-70">
              {hasCurrentCustomer ? 'Mfuatao' : 'Mwanzo'}
            </span>
            {waitingCount > 0 && (
              <span className="block text-base font-semibold mt-1 opacity-80">
                {waitingCount} waiting · {waitingCount} wanaosubiri
              </span>
            )}
          </>
        )}
      </button>

      {/* NO SHOW */}
      <button
        onClick={() => handleAction('noshow', onNoShow)}
        disabled={!!loadingAction || !hasCurrentCustomer}
        className="w-full bg-zinc-700 hover:bg-zinc-600 active:scale-[0.97]
                   disabled:opacity-40 disabled:cursor-not-allowed
                   text-white font-bold py-6 rounded-2xl
                   transition-all duration-200 text-xl
                   border-b-4 border-zinc-800"
      >
        <span className="block text-2xl mb-1">✗</span>
        <span className="block">No Show — Hakuja</span>
      </button>

      {/* OFF DUTY */}
      <button
        onClick={() => setConfirmOffDuty(true)}
        disabled={!!loadingAction}
        className="w-full bg-transparent border-2 border-zinc-700
                   hover:border-red-500/50 hover:text-red-400
                   active:scale-[0.97] disabled:opacity-50
                   text-zinc-500 font-semibold py-5 rounded-2xl
                   transition-all duration-200 text-base"
      >
        ⏸  Off Duty — Pumzika
      </button>

    </div>
  )
}