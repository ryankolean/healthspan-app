import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Future routes for the full healthspan app */}
        {/* <Route path="/exercise" element={<Exercise />} /> */}
        {/* <Route path="/nutrition" element={<Nutrition />} /> */}
        {/* <Route path="/sleep" element={<Sleep />} /> */}
        {/* <Route path="/emotional" element={<Emotional />} /> */}
        {/* <Route path="/molecules" element={<Molecules />} /> */}
        {/* <Route path="/bloodwork" element={<Bloodwork />} /> */}
      </Route>
    </Routes>
  )
}
