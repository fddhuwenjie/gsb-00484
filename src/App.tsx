import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import ParkingSpots from '@/pages/ParkingSpots'
import VehicleEntry from '@/pages/VehicleEntry'
import BillingRules from '@/pages/BillingRules'
import Guidance from '@/pages/Guidance'
import MonthlyRental from '@/pages/MonthlyRental'
import Statistics from '@/pages/Statistics'
import VisitorManagement from '@/pages/VisitorManagement'
import AlertCenter from '@/pages/AlertCenter'
import DailyReport from '@/pages/DailyReport'
import PlateManagement from '@/pages/PlateManagement'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parking-spots" element={<ParkingSpots />} />
          <Route path="/vehicle-entry" element={<VehicleEntry />} />
          <Route path="/billing-rules" element={<BillingRules />} />
          <Route path="/guidance" element={<Guidance />} />
          <Route path="/monthly-rental" element={<MonthlyRental />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/visitor-management" element={<VisitorManagement />} />
          <Route path="/alert-center" element={<AlertCenter />} />
          <Route path="/daily-report" element={<DailyReport />} />
          <Route path="/plate-management" element={<PlateManagement />} />
        </Route>
      </Routes>
    </Router>
  )
}
