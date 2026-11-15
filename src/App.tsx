import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AboutDataPage } from './pages/AboutDataPage'
import { AlertsPage } from './pages/AlertsPage'
import { CrewMemberPage } from './pages/CrewMemberPage'
import { OverviewPage } from './pages/OverviewPage'
import { TimelinePage } from './pages/TimelinePage'

// HashRouter keeps routing working on any static host and from the offline
// cache, with no server-side fallback rules needed.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="crew" element={<CrewMemberPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="about" element={<AboutDataPage />} />
          <Route path="*" element={<OverviewPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
