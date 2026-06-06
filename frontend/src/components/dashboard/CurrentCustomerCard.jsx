import { useEffect, useState } from 'react'

/**
 * Shows who the barber is currently serving.
 * Includes a live elapsed timer so the barber can see how long
 * the current cut has been running.
 */
export default function CurrentCustomerCard({ entry }) {
  const [elapsed, setElapsed] = useState(0)  // seconds

  // Tick every second to update the elapsed time display
  useEffect(() => {
    if (!entry?.service_started_at) return

    const startTime = new Date(entry.service_started_at)

    const tick = () => {
      const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000)
      setElapsed(seconds)
    }

    tick()  // run immediately
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [entry?.service_started_at])

  if (!entry) {
    // No one currently being served
    return (
      <div className="w-full rounded-2xl border border-dashed border-zinc-700
                      bg-zinc-800/20 px-5 py-6 text-center">
        <p className="text-3xl mb-2">💤</p>
        <p className="text-zinc-500 font-medium">No one in the chair</p>
        <p className="text-zinc-600 text-sm mt-0.5">Kiti kiko wazi</p>
      </div>
    )
  }

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <div className="w-full rounded-2xl border border-amber-400/40
                    bg-amber-400/5 px-5 py-5">

      {/* Label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest
                         text-amber-400">
          Now Serving / Anahudumika
        </span>
        {/* Live elapsed timer */}
        <span className="text-xs font-mono text-zinc-400 bg-zinc-800
                         px-2 py-0.5 rounded-full">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      {/* Customer name */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center
                        justify-center text-zinc-900 text-xl font-black">
          {entry.customer_name.charAt(0)}
        </div>
        <div>
          <p className="text-white text-lg font-bold">{entry.customer_name}</p>
          <p className="text-zinc-400 text-sm">{entry.customer_phone}</p>
        </div>
      </div>

      {/* Preference tag */}
      <div className="mt-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium
          ${entry.preference === 'specific_barber'
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
          {entry.preference === 'specific_barber'
            ? '🎯 Requested you specifically'
            : '🎲 Anayepatikana — Next Available'}
        </span>
      </div>

    </div>
  )
}
