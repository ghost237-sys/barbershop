import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CheckInPage from './pages/CheckInPage'
import BarberDashboardPage from './pages/BarberDashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer check-in — the tablet or QR code destination */}
        <Route path="/" element={<CheckInPage />} />

        {/* Each barber opens their own dashboard */}
        {/* e.g. http://localhost:5173/barber/1 */}
        <Route path="/barber/:barberId" element={<BarberDashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}
