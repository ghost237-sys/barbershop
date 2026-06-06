import { useState, useEffect } from 'react'
import CheckInForm from '../components/checkin/CheckInForm'
import WaitRoom from '../components/waitroom/WaitRoom'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { getEntry } from '../api/queue'

const STORAGE_KEY = 'barbershop_queue_token'

// Statuses where we should show the wait room
const ACTIVE_STATUSES = ['waiting', 'in_service']

export default function CheckInPage() {
  const [token, setToken]           = useState(null)
  const [checkInData, setCheckInData] = useState(null)
  const [loading, setLoading]       = useState(true)  // checking localStorage

  // On mount: check if there's a saved token and whether it's still active
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      setLoading(false)
      return
    }

    // Token exists — verify the entry is still active before showing wait room
    getEntry(saved)
      .then(entry => {
        if (ACTIVE_STATUSES.includes(entry.status)) {
          // Still in queue — restore the wait room
          setToken(saved)
          setCheckInData(entry)
        } else {
          // Completed or cancelled — clear and show check-in form
          localStorage.removeItem(STORAGE_KEY)
        }
      })
      .catch(() => {
        // Token not found on server (shouldn't happen, but handle gracefully)
        localStorage.removeItem(STORAGE_KEY)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSuccess = (data) => {
    // Save token to localStorage so a refresh restores the wait room
    localStorage.setItem(STORAGE_KEY, data.token)
    setToken(data.token)
    setCheckInData(data)
  }

  const handleLeaveQueue = () => {
    // Called if we add a "Leave queue" button later
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setCheckInData(null)
  }

  const handleRequeue = (newToken) => {
  // Replace the stored token with the new entry's token
  localStorage.setItem(STORAGE_KEY, newToken)
  setToken(newToken)
  setCheckInData(null)  // clear stale check-in data, WebSocket will populate
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <LoadingSpinner message="Checking your spot..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-md mx-auto px-4 py-8">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💈</div>
          <h1 className="text-2xl font-black tracking-tight">The Queue</h1>
          <p className="text-zinc-500 text-sm mt-1">Barbershop Queue System</p>
        </div>

        {!token ? (
          <>
            <h2 className="text-lg font-semibold mb-4 text-center">
              Check In — Jiandikishe
            </h2>
            <CheckInForm onSuccess={handleSuccess} />
          </>
        ) : (
          <WaitRoom
            token={token}
            checkInData={checkInData}
            onLeave={handleLeaveQueue}
            onRequeue={handleRequeue}  
          />
        )}

      </div>
    </div>
  )
}
