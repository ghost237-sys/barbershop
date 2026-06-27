import { useEffect, useState, useRef } from 'react'
import { getBarbers } from '../../api/queue'
import LoadingSpinner from '../shared/LoadingSpinner'

const STATUS_STYLES = {
  available: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  busy:      'bg-zinc-700 text-zinc-400 border border-zinc-600',
  off_duty:  'bg-zinc-700 text-zinc-500 border border-zinc-600',
}

const STATUS_LABELS = {
  available: 'Available',
  busy:      'With a client',
  off_duty:  'Off Duty',
}

function SlowStartMessage() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 4000)
    return () => clearTimeout(timer)
  }, [])
  if (!show) return null
  return (
    <p className="text-zinc-600 text-xs text-center max-w-xs">
      Taking a moment to wake up the server...
    </p>
  )
}

export default function BarberSelector({ selectedId, onSelect }) {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getBarbers()
      .then(setBarbers)
      .catch(() => setError('Could not load technicians. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-pink-500
                        rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Loading technicians...</p>
        <SlowStartMessage />
      </div>
    )
  }

  if (error) return <p className="text-red-400 text-sm text-center">{error}</p>

  return (
    <div className="flex flex-col gap-3">
      {barbers.map(barber => {
        const isOffDuty  = barber.status === 'off_duty'
        const isSelected = selectedId === barber.id

        return (
          <button
            key={barber.id}
            onClick={() => !isOffDuty && onSelect(barber.id)}
            disabled={isOffDuty}
            className={`
              w-full rounded-2xl border p-4 text-left transition-all duration-200
              ${isOffDuty
                ? 'border-zinc-700 bg-zinc-800/40 opacity-50 cursor-not-allowed'
                : isSelected
                  ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10'
                  : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-500 active:scale-[0.98]'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  text-lg font-bold
                  ${isSelected
                    ? 'bg-pink-500 text-white'
                    : 'bg-zinc-700 text-zinc-300'}
                `}>
                  {barber.name.charAt(0)}
                </div>
                <div>
                  <p className={`font-semibold
                    ${isSelected ? 'text-pink-400' : 'text-white'}`}>
                    {barber.name}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                    ${STATUS_STYLES[barber.status]}`}>
                    {STATUS_LABELS[barber.status]}
                  </span>
                </div>
              </div>

              {!isOffDuty && (
                <div className="text-right">
                  <p className={`text-xl font-bold tabular-nums
                                 ${isSelected ? 'text-pink-400' : 'text-white'}`}>
                    {barber.estimated_wait_minutes}
                    <span className="text-xs font-normal text-zinc-500 ml-0.5">
                      min
                    </span>
                  </p>
                  <p className="text-xs text-zinc-600">
                    {barber.waiting_count} waiting
                  </p>
                </div>
              )}
            </div>

            {barber.current_customer && !isOffDuty && (
              <p className="mt-2 text-xs text-zinc-600">
                Now with: {barber.current_customer.name}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}