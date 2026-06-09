import { useMemo, useEffect, useRef } from 'react'
import { useQueueSocket } from './useQueueSocket'

export function useBarberQueue(barberId) {
  const { queueData, connected, usingFallback } = useQueueSocket()
  const wakeLockRef = useRef(null)

  useEffect(() => {
    let released = false

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && !released) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
          console.log('[WakeLock] Screen will stay on')
        }
      } catch (err) {
        console.warn('[WakeLock] Could not acquire:', err.message)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    requestWakeLock()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      released = true
      wakeLockRef.current?.release()
      wakeLockRef.current = null
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const barberData = useMemo(() => {
    if (!queueData || !barberId) return null

    const match = queueData.find(
      item => String(item.barber.id) === String(barberId)
    )
    if (!match) return null

    const allEntries = match.queue

    return {
      barber: match.barber,
      currentCustomer: allEntries.find(e => e.status === 'in_service') || null,
      waitingList: allEntries
        .filter(e => e.status === 'waiting')
        .sort((a, b) => new Date(a.checked_in_at) - new Date(b.checked_in_at)),
    }
  }, [queueData, barberId])

  return { barberData, connected, usingFallback }
}