import { useState, useEffect } from 'react'
import CheckInForm from '../components/checkin/CheckInForm'
import WaitRoom from '../components/waitroom/WaitRoom'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { getEntry } from '../api/queue'

const STORAGE_KEY = 'abaah_queue_token'
const ACTIVE_STATUSES = ['waiting', 'in_service']

export default function CheckInPage() {
  const [token, setToken]                           = useState(null)
  const [checkInData, setCheckInData]               = useState(null)
  const [loading, setLoading]                       = useState(true)
  const [installPrompt, setInstallPrompt]           = useState(null)
  const [showInstallBanner, setShowInstallBanner]   = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) { setLoading(false); return }
    getEntry(saved)
      .then(entry => {
        if (ACTIVE_STATUSES.includes(entry.status)) {
          setToken(saved)
          setCheckInData(entry)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleSuccess = (data) => {
    localStorage.setItem(STORAGE_KEY, data.token)
    setToken(data.token)
    setCheckInData(data)
  }

  const handleLeaveQueue = () => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setCheckInData(null)
  }

  const handleRequeue = (newToken) => {
    localStorage.setItem(STORAGE_KEY, newToken)
    setToken(newToken)
    setCheckInData(null)
  }

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    setShowInstallBanner(false)
    setInstallPrompt(null)
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

        {/* Install banner */}
        {showInstallBanner && !token && (
          <div className="w-full rounded-2xl border border-pink-500/30
                          bg-pink-500/5 px-4 py-3 mb-4
                          flex items-center justify-between gap-3">
            <div>
              <p className="text-pink-400 text-sm font-semibold">
                📲 Add to Home Screen
              </p>
              <p className="text-zinc-500 text-xs">
                Get notified even when browser is closed
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="bg-pink-500 text-white font-bold
                         px-3 py-1.5 rounded-xl text-sm flex-shrink-0"
            >
              Install
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-3">
            <span className="text-xl opacity-50">🌸</span>
            <span className="text-5xl">💅</span>
            <span className="text-xl opacity-50">🌸</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Abaah Nail Parlour
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Beauty & Nail Care</p>
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12 bg-pink-500/30" />
            <span className="text-pink-500/40 text-xs">✦</span>
            <div className="h-px w-12 bg-pink-500/30" />
          </div>
        </div>

        {/* Content */}
        {!token ? (
          <>
            <h2 className="text-base font-semibold mb-4 text-center text-zinc-400">
              Join Our Queue
              <span className="block text-xs font-normal text-zinc-600 mt-0.5">
                Ingia Foleni
              </span>
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