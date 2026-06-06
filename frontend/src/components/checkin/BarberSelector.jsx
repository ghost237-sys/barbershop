import { useEffect, useState, useRef } from 'react'
import { getBarbers } from '../../api/queue'
import LoadingSpinner from '../shared/LoadingSpinner'



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
      <br />Itachukua sekunde chache.
    </p>
  )
}

// Status pill colours
const STATUS_STYLES = {
  available: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  busy:      'bg-amber-500/20  text-amber-400  border border-amber-500/30',
  off_duty:  'bg-zinc-700      text-zinc-400   border border-zinc-600',
}

const STATUS_LABELS = {
  available: 'Available',
  busy:      'With a client',
  off_duty:  'Off Duty',
}

export default function BarberSelector({ selectedId, onSelect }) {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getBarbers()
      .then(data => {
	    console.log('Barbers API response:',data)
      setBarbers(data)
	})
      .catch(() => setError('Could not load barbers. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="w-10 h-10 border-4 border-zinc-700 border-t-amber-400
                      rounded-full animate-spin" />
      <p className="text-zinc-400 text-sm text-center">Loading barbers...</p>
      {/* Show this message after 4 seconds so user knows it's a slow start */}
      <SlowStartMessage />
    </div>
  )
}

  if (error)   return <p className="text-red-400 text-sm text-center">{error}</p>

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
                  ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10'
                  : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-500 active:scale-[0.98]'
              }
            `}
          >
            <div className="flex items-center justify-between">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  text-lg font-bold
                  ${isSelected ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-700 text-zinc-300'}
                `}>
                  {barber.name.charAt(0)}
                </div>
                <div>
                  <p className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                    {barber.name}
                  </p>
                  {/* Status pill */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                    ${STATUS_STYLES[barber.status]}`}>
                    {STATUS_LABELS[barber.status]}
                  </span>
                </div>
              </div>

              {/* Wait time */}
              {!isOffDuty && (
                <div className="text-right">
                  <p className={`text-xl font-bold tabular-nums
                                 ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                    {barber.estimated_wait_minutes}
                    <span className="text-xs font-normal text-zinc-400 ml-0.5">min</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {barber.waiting_count} waiting
                  </p>
                </div>
              )}

              {isOffDuty && (
                <p className="text-xs text-zinc-500">Unavailable</p>
              )}
            </div>

            {/* Currently serving */}
            {barber.current_customer && !isOffDuty && (
              <p className="mt-2 text-xs text-zinc-500 pl-13">
                Now serving: {barber.current_customer.name}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
