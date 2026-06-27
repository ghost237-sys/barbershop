import { useEffect, useState, useRef } from 'react'
import { getBarbers } from '../../api/queue'
import LoadingSpinner from '../shared/LoadingSpinner'

const STATUS_STYLES = {
  available: 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
  busy:      'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  off_duty:  'bg-rose-900/40 text-rose-400/50 border border-rose-800/30',
}

const STATUS_LABELS = {
  available: 'Available 🌸',
  busy:      'With a client 💅',
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
    <p className="text-rose-400/50 text-xs text-center max-w-xs">
      Taking a moment to wake up the server...
      <br />Itachukua sekunde chache.
    </p>
  )
}

export default function BarberSelector({ selectedId, onSelect }) {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getBarbers()
      .then(data => {
        console.log('Barbers API response:', data)
        setBarbers(data)
      })
      .catch(() => setError('Could not load technicians. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="w-10 h-10 border-4 border-rose-700 border-t-pink-400
                        rounded-full animate-spin" />
        <p className="text-rose-300/60 text-sm text-center">
          Loading technicians...
        </p>
        <SlowStartMessage />
      </div>
    )
  }

  if (error) {
    return <p className="text-red-400 text-sm text-center">{error}</p>
  }

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
                ? 'border-rose-800/30 bg-rose-900/20 opacity-50 cursor-not-allowed'
                : isSelected
                  ? 'border-pink-400 bg-pink-400/10 shadow-lg shadow-pink-400/10'
                  : 'border-rose-800/40 bg-rose-900/30 hover:border-pink-400/50 active:scale-[0.98]'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  text-lg font-bold
                  ${isSelected
                    ? 'bg-pink-400 text-white'
                    : 'bg-rose-800/60 text-pink-300'}
                `}>
                  {barber.name.charAt(0)}
                </div>
                <div>
                  <p className={`font-semibold
                    ${isSelected ? 'text-pink-300' : 'text-white'}`}>
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
                                 ${isSelected ? 'text-pink-300' : 'text-white'}`}>
                    {barber.estimated_wait_minutes}
                    <span className="text-xs font-normal text-rose-300/50 ml-0.5">min</span>
                  </p>
                  <p className="text-xs text-rose-300/40">
                    {barber.waiting_count} waiting
                  </p>
                </div>
              )}

              {isOffDuty && (
                <p className="text-xs text-rose-400/40">Unavailable</p>
              )}
            </div>

            {barber.current_customer && !isOffDuty && (
              <p className="mt-2 text-xs text-rose-300/40 pl-13">
                Now serving: {barber.current_customer.name}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}