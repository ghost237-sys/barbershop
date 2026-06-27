import { useState } from 'react'
import { useBarberQueue } from '../../hooks/useBarberQueue'
import { useQueueAlerts } from '../../hooks/useQueueAlerts'
import { barberNext, barberNoShow, barberOffDuty, barberOnDuty } from '../../api/queue'
import BarberHeader from './BarberHeader'
import CurrentCustomerCard from './CurrentCustomerCard'
import ActionButtons from './ActionButtons'
import WaitingList from './WaitingList'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function BarberDashboard({ barberId }) {
  const { barberData, connected, usingFallback } = useBarberQueue(barberId)
  const [actionError, setActionError] = useState(null)

  // Hooks must all be before any conditional return
  useQueueAlerts(barberData)

  // Safe conditional return
  if (!barberData) {
    return <LoadingSpinner message="Loading your dashboard..." />
  }

  // barberData is guaranteed non-null below this line
  const { barber, currentCustomer, waitingList } = barberData

  // needsAttention uses destructured values — safe here
  const needsAttention = (
    !currentCustomer &&
    waitingList.length > 0 &&
    barber.status !== 'off_duty'
  )

  // ... rest of component unchanged

  const handleAction = async (fn) => {
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Try again.'
      setActionError(msg)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      <BarberHeader
        barber={barber}
        connected={connected}
        usingFallback={usingFallback}
      />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            value: barber.waiting_count,
            label: 'Waiting',
            sublabel: 'Wanaosubiri',
            color: 'text-white',
          },
          {
            value: `${barber.estimated_wait_minutes}m`,
            label: 'Est. Wait',
            sublabel: 'Muda wa Kusubiri',
            color: 'text-pink-400',
          },
          {
            value: currentCustomer ? '1' : '0',
            label: 'In Chair',
            sublabel: 'Kichwani',
            color: 'text-emerald-400',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-rose-900/80/60 border border-rose-800/60 rounded-xl
                       px-3 py-3 text-center"
          >
            <p className={`text-2xl font-black tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              {stat.label}
            </p>
            <p className="text-[10px] text-zinc-600">{stat.sublabel}</p>
          </div>
        ))}
      </div>

      <CurrentCustomerCard entry={currentCustomer} />

      {/* Attention banner */}
      {needsAttention && (
        <div className="w-full rounded-2xl bg-pink-400 px-5 py-4
                        text-center animate-bounce">
          <p className="text-zinc-900 font-black text-xl">
            👆 {waitingList.length} customer{waitingList.length > 1 ? 's' : ''} waiting!
          </p>
          <p className="text-zinc-900/70 font-semibold">
            Press Next Customer to call them
          </p>
        </div>
      )}

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl
                        px-4 py-3 text-sm text-red-400 text-center">
          {actionError}
        </div>
      )}

      <ActionButtons
        barberId={barberId}
        hasCurrentCustomer={!!currentCustomer}
        isOffDuty={barber.status === 'off_duty'}
        waitingCount={waitingList.length}
        onNext={() => handleAction(() => barberNext(barberId))}
        onNoShow={() => handleAction(() => barberNoShow(barberId))}
        onOffDuty={() => handleAction(() => barberOffDuty(barberId))}
        onOnDuty={() => handleAction(() => barberOnDuty(barberId))}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-rose-900/80" />
        <p className="text-xs text-zinc-600 uppercase tracking-wider">
          Up Next — Watakaofuata
        </p>
        <div className="flex-1 h-px bg-rose-900/80" />
      </div>

      <WaitingList entries={waitingList} />

    </div>
  )
}