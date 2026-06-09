import { useMemo } from 'react'
import { useQueueSocket } from './useQueueSocket'
import { useMemo, useEffect, useRef } from 'react'

/**
 * Filters the full queue WebSocket data down to one barber's view.
 * Returns that barber's info, their current customer, and their waiting list.
 */
export function useBarberQueue(barberId) {
  const { queueData, connected, usingFallback } = useQueueSocket()

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
          console.log('[WakeLock] Screen will stay on')
        }
      } catch (err) {
        console.warn('[WakeLock] Could not acquire:', err)
      }
    }

    requestWakeLock()

    // Re-acquire wake lock when page becomes visible again
    // (wake lock releases automatically when page is hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // Release when barber closes the dashboard
      wakeLockRef.current?.release()
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


