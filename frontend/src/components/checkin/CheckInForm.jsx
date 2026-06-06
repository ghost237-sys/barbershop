import { useState } from 'react'
import BarberSelector from './BarberSelector'
import { checkIn } from '../../api/queue'

export default function CheckInForm({ onSuccess }) {
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [preference, setPreference] = useState('next_available')
  const [barberId, setBarberId]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const handleSubmit = async () => {
    setError(null)

    // Basic validation
    if (!name.trim()) return setError('Please enter your name.')
    if (!phone.trim()) return setError('Please enter your phone number.')
    if (preference === 'specific_barber' && !barberId) {
      return setError('Please select a barber.')
    }

    setLoading(true)
    try {
      const result = await checkIn({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        preference,
        barber_id: preference === 'specific_barber' ? barberId : null,
      })
      // Pass the token and response data up to the page
      onSuccess(result)

    }catch (err) {
  // 503 means all barbers are off duty
  if (err.response?.status === 503) {
    setError(
      'The shop is currently closed — all barbers are off duty. ' +
      'Please come back later. / Duka limefungwa kwa sasa.'
    )
  } else {
    const msg = err.response?.data?.error
      || err.response?.data?.non_field_errors?.[0]
      || 'Something went wrong. Please try again.'
    setError(msg)
  }
}
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. John Kamau"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl
                     px-4 py-3 text-white placeholder-zinc-500
                     focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+254 7XX XXX XXX"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl
                     px-4 py-3 text-white placeholder-zinc-500
                     focus:outline-none focus:border-amber-400 transition-colors"
        />
        <p className="mt-1 text-xs text-zinc-500">
          We'll SMS you when it's almost your turn.
        </p>
      </div>

      {/* Preference Toggle */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Barber Preference
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-800 rounded-xl">
          <button
            onClick={() => { setPreference('next_available'); setBarberId(null) }}
            className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${preference === 'next_available'
                ? 'bg-amber-400 text-zinc-900 shadow'
                : 'text-zinc-400 hover:text-white'}`}
          >
            {/* Swahili + English side by side */}
            <span className="block text-xs font-bold">Anayepatikana</span>
            <span className="block text-[10px] opacity-70">Next Available</span>
          </button>
          <button
            onClick={() => setPreference('specific_barber')}
            className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${preference === 'specific_barber'
                ? 'bg-amber-400 text-zinc-900 shadow'
                : 'text-zinc-400 hover:text-white'}`}
          >
            <span className="block text-xs font-bold">Mhusika</span>
            <span className="block text-[10px] opacity-70">Specific Barber</span>
          </button>
        </div>
      </div>

      {/* Barber Cards — only shown when specific barber is selected */}
      {preference === 'specific_barber' && (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Choose Your Barber
          </label>
          <BarberSelector
            selectedId={barberId}
            onSelect={setBarberId}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl
                        px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-zinc-900 font-bold py-4 rounded-2xl
                   transition-all duration-200 text-base shadow-lg shadow-amber-400/20"
      >
        {loading ? 'Joining Queue...' : 'Join Queue — Ingia Foleni'}
      </button>

    </div>
  )
}
