import { useEffect, useState, useRef } from 'react'

export default function CurrentCustomerCard({ entry, avgMinutes = 20 }) {
  const [elapsed, setElapsed]     = useState(0)
  const [overtime, setOvertime]   = useState(false)
  const alertPlayedRef            = useRef(false)

  useEffect(() => {
    if (!entry?.service_started_at) return

    const startTime = new Date(entry.service_started_at)

    const tick = () => {
      const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000)
      setElapsed(seconds)

      // Flag as overtime if over average duration
      const isOver = seconds > avgMinutes * 60
      setOvertime(isOver)

      // Play alert once when overtime begins
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

    // Reset alert flag for new customer
    alertPlayedRef.current = false
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [entry?.service_started_at])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  if (!entry) {
    return (
      <div className="w-full rounded-2xl border-2 border-dashed border-rose-800/60
                      bg-rose-900/80/20 px-5 py-8 text-center">
        <p className="text-4xl mb-3">🌸</p>
        <p className="text-rose-300/50 font-semibold text-lg">No one in the chair</p>
        <p className="text-rose-400/40 text-sm mt-1">Kiti kiko wazi</p>
      </div>
    )
  }

  return (
    <div className={`
      w-full rounded-2xl border-2 px-5 py-5 transition-all duration-500
      ${overtime
        ? 'border-red-400/60 bg-red-400/5 animate-pulse'
        : 'border-pink-400/40 bg-pink-400/5'
      }
    `}>
      {/* Label + timer */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-pink-300">
            Now Serving / Anahudumika
        </span>
        <span className={`text-sm font-mono font-bold px-3 py-1 rounded-full
          ${overtime
            ? 'bg-red-400/20 text-red-400'
            : 'bg-rose-900/80 text-zinc-300'
          }`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      {/* Customer info — bigger */}
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center
                         text-2xl font-black flex-shrink-0
                         ${overtime ? 'bg-red-400 text-white' : 'bg-pink-400 text-zinc-900'}`}>
          {entry.customer_name.charAt(0)}
        </div>
        <div>
          <p className="text-white text-2xl font-black">{entry.customer_name}</p>
          <p className="text-zinc-400">{entry.customer_phone}</p>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium mt-1 inline-block
            ${entry.preference === 'specific_barber'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
            {entry.preference === 'specific_barber'
              ? '🎯 Requested this technician'
              : '🌸 Anayepatikana — Next Available'}
          </span>
        </div>
      </div>

      {/* Overtime message */}
      {overtime && (
        <div className="mt-4 bg-red-400/10 rounded-xl px-4 py-2 text-center">
          <p className="text-red-400 text-sm font-semibold">
            This Nail work is running over {avgMinutes} minutes
          </p>
          <p className="text-red-400/70 text-xs">
            {barberData?.waitingList?.length || 0} people still waiting
          </p>
        </div>
      )}
    </div>
  )
}