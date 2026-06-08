import { useEffect } from 'react'
import { useEntrySocket } from '../../hooks/useEntrySocket'
import ConnectionBadge from '../shared/ConnectionBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import { usePushNotifications } from '../../hooks/usePushNotifications'

// What to show for each queue status
const STATUS_CONFIG = {
  waiting: {
    emoji: '⏳',
    title: 'You\'re in the queue',
    titleSw: 'Uko foleni',
    color: 'text-amber-400',
  },
  in_service: {
    emoji: '💈',
    title: 'It\'s your turn!',
    titleSw: 'Ni zamu yako!',
    color: 'text-emerald-400',
  },
  completed: {
    emoji: '✅',
    title: 'All done!',
    titleSw: 'Umekamilika!',
    color: 'text-emerald-400',
  },
  no_show: {
    emoji: '🔄',
    title: 'Re-queued',
    titleSw: 'Umewekwa tena',
    color: 'text-amber-400',
  },
  cancelled: {
    emoji: '❌',
    title: 'Cancelled',
    titleSw: 'Imefutwa',
    color: 'text-red-400',
  },
}



export default function WaitRoom({ token, checkInData, onLeave, onRequeue }) {
  console.log('[WaitRoom] token:', token)
  const { entryData, connected, usingFallback } = useEntrySocket(token)
  const { permission, subscribed, subscribe } = usePushNotifications(token)

  const entry = entryData || checkInData
  const config = entry ? STATUS_CONFIG[entry.status] : null

  // Add this inside WaitRoom, after the useEntrySocket line:
  // Watches for terminal statuses — clears token and returns to check-in
useEffect(() => {
  if (!entry) return

  // no_show is only terminal if there's no replacement entry
  // If requeued_as_token exists, the requeue useEffect handles it instead
  const isTerminal = (
    (entry.status === 'completed') ||
    (entry.status === 'cancelled') ||
    (entry.status === 'no_show' && !entry.requeued_as_token)
  )

  if (isTerminal) {
    const timer = setTimeout(() => {
      onLeave?.()
    }, 5000)
    return () => clearTimeout(timer)
  }
}, [entry?.status, entry?.requeued_as_token])

// Watches for re-queue — switches to new token immediately
useEffect(() => {
  if (!entry) return
  if (entry.status === 'no_show' && entry.requeued_as_token) {
    onRequeue?.(entry.requeued_as_token)
  }
}, [entry?.status, entry?.requeued_as_token])


  useEffect(() => {
  if (!entry) return

  // If this entry was marked no_show and has a replacement entry,
  // automatically switch the wait room to track the new entry
  if (entry.status === 'no_show' && entry.requeued_as_token) {
    onRequeue?.(entry.requeued_as_token)
  }
}, [entry?.status, entry?.requeued_as_token])

  if (!entry) {
    return <LoadingSpinner message="Connecting to queue..." />
  }

  const isWaiting    = entry.status === 'waiting'
  const isCalled     = entry.status === 'in_service'
  const isCompleted  = entry.status === 'completed'
  const isCancelled  = ['cancelled', 'no_show'].includes(entry.status)

  

  return (
    <div className="flex flex-col items-center gap-6 py-4">

      {/* Connection status */}
      <div className="self-end">
        <ConnectionBadge connected={connected} usingFallback={usingFallback} />
      </div>

      {/* Main status card */}
      <div className={`
        w-full rounded-3xl border p-8 text-center
        ${isCalled
          ? 'border-emerald-400/50 bg-emerald-400/5 shadow-xl shadow-emerald-400/10'
          : 'border-zinc-700 bg-zinc-800/60'
        }
      `}>
        {/* Emoji */}
        <div className="text-6xl mb-4 animate-bounce-slow">
          {config?.emoji}
        </div>

        {/* Status title */}
        <p className={`text-2xl font-bold ${config?.color}`}>
          {config?.title}
        </p>
        <p className={`text-sm mt-0.5 ${config?.color} opacity-70`}>
          {config?.titleSw}
        </p>

        {/* Position + wait — only shown while waiting */}
        {isWaiting && (
          <div className="mt-6 flex items-center justify-center gap-8">
            {/* Queue position */}
            <div className="text-center">
              <p className="text-5xl font-black text-white tabular-nums">
                {entry.queue_position ?? '—'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Position<br />
                <span className="text-zinc-500">Nafasi</span>
              </p>
            </div>

            <div className="w-px h-12 bg-zinc-700" />

            {/* Estimated wait */}
            <div className="text-center">
              <p className="text-5xl font-black text-amber-400 tabular-nums">
                {entry.estimated_wait_minutes ?? '—'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Minutes<br />
                <span className="text-zinc-500">Dakika</span>
              </p>
            </div>
          </div>
        )}

        {/* Notification permission prompt — shown if not yet decided */}
      {permission === 'default' && (
        <div className="w-full rounded-2xl border border-amber-400/30
                        bg-amber-400/5 px-5 py-4">
          <p className="text-amber-400 font-semibold text-sm">
            🔔 Get notified when it's your turn
          </p>
          <p className="text-zinc-400 text-xs mt-1">
            Pokea arifa ukiwa nje ya duka
          </p>
          <button
            onClick={subscribe}
            className="mt-3 bg-amber-400 text-zinc-900 font-bold
                       px-4 py-2 rounded-xl text-sm w-full"
          >
            Allow Notifications — Ruhusu Arifa
          </button>
        </div>
      )}

      {/* Subscribed confirmation */}
      {subscribed && permission === 'granted' && (
        <div className="w-full rounded-2xl border border-emerald-400/30
                        bg-emerald-400/5 px-5 py-3 text-center">
          <p className="text-emerald-400 text-sm font-medium">
            🔔 Notifications on — we'll buzz you when it's time
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Utapata arifa hata ukiwa nje
          </p>
        </div>
        )}

        {/* Called — big prompt to walk to the chair */}
        {isCalled && (
          <div className="mt-6">
            <p className="text-lg text-white font-semibold">
              Please walk to {entry.barber_name}'s chair!
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Tafadhali nenda kwa kiti cha {entry.barber_name}
            </p>
          </div>
        )}

        {/* Completed */}
        {isCompleted && (
          <div className="mt-6">
            <p className="text-base text-zinc-300">
              Thanks for visiting! See you next time.
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Asante! Tutakuona wakati ujao.
            </p>
          </div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <div className="mt-6">
            <p className="text-base text-zinc-300">
              You were removed from the queue.
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Uliondolewa kwenye foleni.
            </p>
          </div>
        )}
      </div>

      {/* Barber info */}
      {entry.barber_name && isWaiting && (
        <div className="w-full rounded-2xl border border-zinc-700
                        bg-zinc-800/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Your Barber / Kinyozi Wako
              </p>
              <p className="text-white font-semibold mt-0.5">
                {entry.barber_name}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center
                            justify-center text-zinc-900 font-bold text-lg">
              {entry.barber_name.charAt(0)}
            </div>
          </div>
        </div>
      )}

      {/* Freedom note — reassures customer they can leave */}
      {isWaiting && (
        <div className="w-full rounded-2xl bg-zinc-800/40 border border-zinc-700/50
                        px-5 py-4 text-center">
          <p className="text-sm text-zinc-400">
            📱 You'll get an SMS when you're next.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Utapata ujumbe wa SMS utakapokuwa wa pili.
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            You don't have to wait inside the shop.
          </p>
        </div>
      )}

    </div>
  )
}

