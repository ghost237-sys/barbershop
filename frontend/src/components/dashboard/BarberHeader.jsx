import ConnectionBadge from '../shared/ConnectionBadge'

const STATUS_CONFIG = {
  available: {
    label: 'Available',
    sublabel: 'Napatikana',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
  },
  busy: {
    label: 'With a Client',
    sublabel: 'Nahudumu',
    dot: 'bg-pink-400 animate-pulse',
    text: 'text-pink-400',
  },
  off_duty: {
    label: 'Off Duty',
    sublabel: 'Pumzika',
    dot: 'bg-zinc-500',
    text: 'text-zinc-400',
  },
}

export default function BarberHeader({ barber, connected, usingFallback }) {
  const config = STATUS_CONFIG[barber.status] || STATUS_CONFIG.available

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <h1 className="text-xl font-black text-white">
          💅 {barber.name}
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className={`text-xs font-medium ${config.text}`}>
            {config.label}
            <span className="opacity-40 ml-1 text-[10px]">
              — {config.sublabel}
            </span>
          </span>
        </div>
      </div>
      <ConnectionBadge connected={connected} usingFallback={usingFallback} />
    </div>
  )
}