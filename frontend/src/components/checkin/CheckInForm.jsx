import { useState } from 'react'
import BarberSelector from './BarberSelector'
import { checkIn } from '../../api/queue'

export default function CheckInForm({ onSuccess }) {
  const [name, setName]             = useState('')
  const [phone, setPhone]           = useState('')
  const [preference, setPreference] = useState('next_available')
  const [barberId, setBarberId]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const handleSubmit = async () => {
    setError(null)
    if (!name.trim()) return setError('Please enter your name.')
    if (!phone.trim()) return setError('Please enter your phone number.')
    if (preference === 'specific_barber' && !barberId) {
      return setError('Please select a nail technician.')
    }
    setLoading(true)
    try {
      const result = await checkIn({
        customer_name:  name.trim(),
        customer_phone: phone.trim(),
        preference,
        barber_id: preference === 'specific_barber' ? barberId : null,
      })
      onSuccess(result)
    } catch (err) {
      if (err.response?.status === 503) {
        setError('The parlour is currently closed. Please come back later.')
      } else {
        setError(
          err.response?.data?.error ||
          err.response?.data?.non_field_errors?.[0] ||
          'Something went wrong. Please try again.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Mary Mwende"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl
                     px-4 py-3 text-white placeholder-zinc-500
                     focus:outline-none focus:border-pink-500 transition-colors"
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
                     focus:outline-none focus:border-pink-500 transition-colors"
        />
        <p className="mt-1 text-xs text-zinc-600">
          We'll notify you when it's almost your turn.
        </p>
      </div>

      {/* Preference Toggle */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Technician Preference
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-800 rounded-xl">
          <button
            onClick={() => { setPreference('next_available'); setBarberId(null) }}
            className={`py-3 rounded-lg text-sm font-medium transition-all duration-200
              ${preference === 'next_available'
                ? 'bg-pink-500 text-white shadow'
                : 'text-zinc-400 hover:text-white'}`}
          >
            <span className="block text-sm font-bold">Next Available</span>
            <span className="block text-[10px] opacity-60 mt-0.5">
              Anayepatikana
            </span>
          </button>
          <button
            onClick={() => setPreference('specific_barber')}
            className={`py-3 rounded-lg text-sm font-medium transition-all duration-200
              ${preference === 'specific_barber'
                ? 'bg-pink-500 text-white shadow'
                : 'text-zinc-400 hover:text-white'}`}
          >
            <span className="block text-sm font-bold">Specific Technician</span>
            <span className="block text-[10px] opacity-60 mt-0.5">Mhusika</span>
          </button>
        </div>
      </div>

      {/* Technician Cards */}
      {preference === 'specific_barber' && (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Choose Your Nail Technician
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
        className="w-full bg-pink-500 hover:bg-pink-400 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-bold py-4 rounded-2xl
                   transition-all duration-200 text-base
                   shadow-lg shadow-pink-500/20"
      >
        {loading ? 'Joining Queue...' : '💅 Join Queue — Ingia Foleni'}
      </button>

    </div>
  )
}