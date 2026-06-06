import { useParams } from 'react-router-dom'
import BarberDashboard from '../components/dashboard/BarberDashboard'

export default function BarberDashboardPage() {
  const { barberId } = useParams()

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* pb-24 gives breathing room at the bottom on mobile */}
        <BarberDashboard barberId={barberId} />
      </div>
    </div>
  )
}
