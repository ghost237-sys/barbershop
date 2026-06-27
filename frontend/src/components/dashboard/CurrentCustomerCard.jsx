import { useEffect, useState, useRef } from 'react'

export default function CurrentCustomerCard({ entry, avgMinutes = 20 }) {
  const [elapsed, setElapsed]   = useState(0)
  const [overtime, setOvertime] = useState(false)
  const alertPlayedRef          = useRef(false)

  useEffect(() => {
    if (!entry?.service_started_at) return

    const startTime = new Date(entry.service_started_at)
    alertPlayedRef.current = false

    const tick = () => {
      const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000)
      setElapsed(seconds)
      const isOver = seconds > avgMinutes * 60
      setOvertime(isOver)
      if (isOver && !alertPlayedRef.current) {
        alertPlayedRef.current = true
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 440
          osc.type = 'sine'
          gain.gain.setValueAtTime(0.4, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
          osc.start(ctx.currentTime)
          osc.stop(ctx.currentTime + 1)
        } catch (e) {}
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [entry?.service_started_at])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  if (!entry) {
    return (
      <div className="w-full rounded-2xl border-2 border-dashed border-zinc-700
                      bg-zinc-800/20 px-5 py-8 text-center">
        <p className="text-4xl mb-3">🌸</p>
        <p className="text-zinc-500 font-semibold text-lg">No one in the chair</p>
        <p className="text-zinc-600 text-sm mt-0.5">Kiti kiko wazi</p>
      </div>
    )
  }

  return (
    <div className={`
      w-full rounded-2xl border-2 px-5 py-5 transition-all duration-500
      ${overtime
        ? 'border-red-400/60 bg-red-400/5 animate-pulse'
        : 'border-pink-500/40 bg-pink-500/5'
      }
    `}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold uppercase tracking-widest
          ${overtime ? 'text-red-400' : 'text-pink-400'}`}>
          Now Serving
          <span className="block normal-case tracking-normal font-normal
                           text-[10px] opacity-50">
            Anahudumika
          </span>
        </span>
        <span className={`text-sm font-mono font-bold px-3 py-1 rounded-full
          ${overtime
            ? 'bg-red-400/20 text-red-400'
            : 'bg-zinc-800 text-zinc-300'
          }`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center
                         text-2xl font-black flex-shrink-0
                         ${overtime
                           ? 'bg-red-400 text-white'
                           : 'bg-pink-500 text-white'}`}>
          {entry.customer_name.charAt(0)}
        </div>
        <div>
          <p className="text-white text-2xl font-black">{entry.customer_name}</p>
          <p className="text-zinc-500">{entry.customer_phone}</p>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                            mt-1 inline-block
            ${entry.preference === 'specific_barber'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
            }`}>
            {entry.preference === 'specific_barber'
              ? '🎯 Requested this technician'
              : '🌸 Next Available'}
          </span>
        </div>
      </div>

      {overtime && (
        <div className="mt-4 bg-red-400/10 rounded-xl px-4 py-2 text-center">
          <p className="text-red-400 text-sm font-semibold">
            This session is running over {avgMinutes} minutes
          </p>
        </div>
      )}
    </div>
  )
}