import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Bloodwork from './pages/Bloodwork'
import Exercise from './pages/Exercise'
import Sleep from './pages/Sleep'
import Emotional from './pages/Emotional'
import Nutrition from './pages/Nutrition'
import Molecules from './pages/Molecules'
import Onboarding from './pages/Onboarding'
import { isOnboardingComplete } from './utils/profile-storage'
import { isDemoMode } from './utils/demo-data'

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  if (!isOnboardingComplete() && !isDemoMode()) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<OnboardingGuard><Layout /></OnboardingGuard>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bloodwork" element={<Bloodwork />} />
        <Route path="/exercise" element={<Exercise />} />
        <Route path="/sleep" element={<Sleep />} />
        <Route path="/emotional" element={<Emotional />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/molecules" element={<Molecules />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
