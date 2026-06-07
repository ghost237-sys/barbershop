import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CheckInPage from './pages/CheckInPage'
import BarberDashboardPage from './pages/BarberDashboardPage'
import QRPage from './pages/QRPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CheckInPage />} />
        <Route path="/barber/:barberId" element={<BarberDashboardPage />} />
        <Route path="/qr" element={<QRPage />} />
      </Routes>
    </BrowserRouter>
  )
}