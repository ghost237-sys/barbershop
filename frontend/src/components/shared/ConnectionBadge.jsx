// Shows in the corner of the wait room so the customer
// knows if they're getting live updates or HTTP fallback
export default function ConnectionBadge({ connected, usingFallback }) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs
                       text-emerald-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    )
  }

  if (usingFallback) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs
                       text-amber-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        Syncing...
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs
                     text-red-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-red-400" />
      Reconnecting
    </span>
  )
}
