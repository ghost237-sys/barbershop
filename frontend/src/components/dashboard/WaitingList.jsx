/**
 * Shows the ordered queue below the action buttons.
 * Each row shows position, name, phone, and estimated wait.
 */
export default function WaitingList({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-zinc-600 text-sm">No one waiting</p>
        <p className="text-zinc-700 text-xs mt-0.5">Hakuna anayesubiri</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, index) => {
        const position = index + 1
        const isNext   = position === 1

        return (
          <div
            key={entry.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all
              ${isNext
                ? 'bg-zinc-700/80 border border-zinc-600'
                : 'bg-zinc-800/40 border border-zinc-800'
              }
            `}
          >
            {/* Position badge */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center
              text-sm font-bold flex-shrink-0
              ${isNext
                ? 'bg-amber-400 text-zinc-900'
                : 'bg-zinc-700 text-zinc-400'
              }
            `}>
              {position}
            </div>

            {/* Customer info */}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate
                ${isNext ? 'text-white' : 'text-zinc-300'}`}>
                {entry.customer_name}
                {isNext && (
                  <span className="ml-2 text-xs font-normal text-amber-400">
                    — UP NEXT
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {entry.customer_phone}
              </p>
            </div>

            {/* Wait time */}
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-bold tabular-nums
                ${isNext ? 'text-amber-400' : 'text-zinc-400'}`}>
                ~{entry.estimated_wait_minutes}m
              </p>
              <p className="text-xs text-zinc-600">
                {entry.preference === 'specific_barber' ? '🎯' : '🎲'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
