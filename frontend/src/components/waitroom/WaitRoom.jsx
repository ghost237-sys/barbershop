import { useEffect } from 'react'
import { useEntrySocket } from '../../hooks/useEntrySocket'
import ConnectionBadge from '../shared/ConnectionBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import { usePushNotifications } from '../../hooks/usePushNotifications'

const STATUS_CONFIG = {
  waiting: {
    emoji: '⏳',
    title: "You're in the queue",
    titleSw: 'Uko foleni',
    color: 'text-pink-400',
  },
  in_service: {
    emoji: '💅',
    title: "It's your turn!",
    titleSw: 'Ni zamu yako!',
    color: 'text-emerald-400',
  },
  completed: {
    emoji: '🌸',
    title: 'All done! Thank you!',
    titleSw: 'Umekamilika! Asante!',
    color: 'text-pink-400',
  },
  no_show: {
    emoji: '🔄',
    title: 'Re-queued',
    titleSw: 'Umewekwa tena',
    color: 'text-pink-400',
  },
  cancelled: {
    emoji: '❌',
    title: 'Cancelled',
    titleSw: 'Imefutwa',
    color: 'text-red-400',
  },
}

export default function WaitRoom({ token, checkInData, onLeave, onRequeue }) {
  const { entryData, connected, usingFallback } = useEntrySocket(token)
  const { permission, subscribed, subscribe }   = usePushNotifications(token)

  console.log('[WaitRoom] token:', token)

  const entry  = entryData || checkInData
  const config = entry ? STATUS_CONFIG[entry.status] : null

  // Clear token on terminal statuses
  useEffect(() => {
    if (!entry) return
    const isTerminal = (
      entry.status === 'completed' ||
      entry.status === 'cancelled' ||
      (entry.status === 'no_show' && !entry.requeued_as_token)
    )
    if (isTerminal) {
      const timer = setTimeout(() => onLeave?.(), 5000)
      return () => clearTimeout(timer)
    }
  }, [entry?.status, entry?.requeued_as_token])

  // Follow re-queue to new token
  useEffect(() => {
    if (!entry) return
    if (entry.status === 'no_show' && entry.requeued_as_token) {
      onRequeue?.(entry.requeued_as_token)
    }
  }, [entry?.status, entry?.requeued_as_token])

  if (!entry) return <LoadingSpinner message="Connecting to queue..." />

  const isWaiting   = entry.status === 'waiting'
  const isCalled    = entry.status === 'in_service'
  const isCompleted = entry.status === 'completed'
  const isCancelled = ['cancelled', 'no_show'].includes(entry.status)

  return (
    <div className="flex flex-col items-center gap-5 py-4">

      {/* Connection status */}
      <div className="self-end">
        <ConnectionBadge connected={connected} usingFallback={usingFallback} />
      </div>

      {/* Notification prompt */}
      {permission === 'default' && (
        <div className="w-full rounded-2xl border border-pink-500/30
                        bg-pink-500/5 px-5 py-4">
          <p className="text-pink-400 font-semibold text-sm">
            🔔 Get notified when it's your turn
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            We'll send you a notification so you don't have to watch the screen.
          </p>
          <button
            onClick={subscribe}
            className="mt-3 bg-pink-500 text-white font-bold
                       px-4 py-2 rounded-xl text-sm w-full"
          >
            Allow Notifications
          </button>
        </div>
      )}

      {subscribed && permission === 'granted' && (
        <div className="w-full rounded-2xl border border-emerald-500/20
                        bg-emerald-500/5 px-5 py-3 text-center">
          <p className="text-emerald-400 text-sm font-medium">
            🔔 Notifications on — we'll alert you when it's time
          </p>
        </div>
      )}

      {/* Main status card */}
      <div className={`
        w-full rounded-3xl border p-8 text-center
        ${isCalled
          ? 'border-emerald-500/50 bg-emerald-500/5 shadow-xl shadow-emerald-500/10'
          : 'border-zinc-700 bg-zinc-800/60'
        }
      `}>
        <div className="text-6xl mb-4">{config?.emoji}</div>

        <p className={`text-2xl font-bold ${config?.color}`}>
          {config?.title}
        </p>
        <p className={`text-xs mt-1 ${config?.color} opacity-50`}>
          {config?.titleSw}
        </p>

        {/* Position + wait */}
        {isWaiting && (
          <div className="mt-6 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-5xl font-black text-white tabular-nums">
                {entry.queue_position ?? '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Position
                <span className="block text-[10px] text-zinc-600">Nafasi</span>
              </p>
            </div>

            <div className="w-px h-12 bg-zinc-700" />

            <div className="text-center">
              <p className="text-5xl font-black text-pink-400 tabular-nums">
                {entry.estimated_wait_minutes ?? '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Minutes
                <span className="block text-[10px] text-zinc-600">Dakika</span>
              </p>
            </div>
          </div>
        )}

        {/* Called */}
        {isCalled && (
          <div className="mt-6">
            <p className="text-lg text-white font-semibold">
              Please come to {entry.barber_name}'s station! 💅
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Tafadhali nenda kwa kituo cha {entry.barber_name}
            </p>
          </div>
        )}

        {/* Completed */}
        {isCompleted && (
          <div className="mt-6">
            <p className="text-base text-zinc-300">
              Thank you for visiting Abaah Nail Parlour! 🌸
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Asante kwa kutembelea Abaah Nail Parlour!
            </p>
          </div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <div className="mt-6">
            <p className="text-base text-zinc-400">
              You were removed from the queue.
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Uliondolewa kwenye foleni.
            </p>
          </div>
        )}
      </div>

      {/* Technician info */}
      {entry.barber_name && isWaiting && (
        <div className="w-full rounded-2xl border border-zinc-700
                        bg-zinc-800/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Your Technician
                <span className="block normal-case tracking-normal text-[10px]
                                 text-zinc-600">
                  Teknisia Wako
                </span>
              </p>
              <p className="text-white font-semibold mt-1">
                {entry.barber_name}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center
                            justify-center text-white font-bold text-lg">
              {entry.barber_name.charAt(0)}
            </div>
          </div>
        </div>
      )}

      {/* Freedom note */}
      {isWaiting && (
        <div className="w-full rounded-2xl bg-zinc-800/40 border border-zinc-700/50
                        px-5 py-4 text-center">
          <p className="text-sm text-zinc-400">
            🔔 You will be notified when it is your turn.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Utajulishwa ukifika zamu yako.
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            You don't have to wait inside the parlour.
          </p>
        </div>
      )}

    </div>
  )
}