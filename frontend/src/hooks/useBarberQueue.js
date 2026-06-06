import { useMemo } from 'react'
import { useQueueSocket } from './useQueueSocket'

/**
 * Filters the full queue WebSocket data down to one barber's view.
 * Returns that barber's info, their current customer, and their waiting list.
 */
export function useBarberQueue(barberId) {
  const { queueData, connected, usingFallback } = useQueueSocket()

  const barberData = useMemo(() => {
    if (!queueData || !barberId) return null

    // queueData is an array of { barber, queue } — one per barber
    const match = queueData.find(
      item => String(item.barber.id) === String(barberId)
    )
    if (!match) return null

    const allEntries = match.queue  // waiting + in_service entries

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
