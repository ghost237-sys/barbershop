import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import BarberDashboard from '../components/dashboard/BarberDashboard'

export default function BarberDashboardPage() {
  const { barberId }                    = useParams()
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    setInstallPrompt(null)
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-md mx-auto px-4 py-6 pb-24">

        {installPrompt && (
          <div className="mb-4 w-full rounded-2xl border border-amber-400/30
                          bg-amber-400/5 px-4 py-3
                          flex items-center justify-between gap-3">
            <div>
              <p className="text-amber-400 text-sm font-bold">
                📲 Install dashboard on your phone
              </p>  
                <p className="text-zinc-500 text-xs">
                Faster access — works like a real app
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="bg-amber-400 text-zinc-900 font-bold
                         px-3 py-2 rounded-xl text-sm flex-shrink-0"
            >
              Install
            </button>
          </div>
        )}

        <BarberDashboard barberId={barberId} />
      </div>
    </div>
  )
}