import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Bloodwork from './pages/Bloodwork'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bloodwork" element={<Bloodwork />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
