import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Bloodwork from './pages/Bloodwork'
import Exercise from './pages/Exercise'
import Sleep from './pages/Sleep'
import Emotional from './pages/Emotional'
import Nutrition from './pages/Nutrition'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bloodwork" element={<Bloodwork />} />
        <Route path="/exercise" element={<Exercise />} />
        <Route path="/sleep" element={<Sleep />} />
        <Route path="/emotional" element={<Emotional />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
