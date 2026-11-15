import { Navigate, Route, Routes } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Developers from './pages/Developers.jsx';
import AddDeveloper from './pages/AddDeveloper.jsx';
import DeveloperDetail from './pages/DeveloperDetail.jsx';
import KnowledgeGaps from './pages/KnowledgeGaps.jsx';
import Team from './pages/Team.jsx';
import AuditLog from './pages/AuditLog.jsx';
import { rolesFor } from './nav.js';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything inside here requires a logged-in user and uses the sidebar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/developers/:id" element={<DeveloperDetail />} />

          {/* Pages only some roles may open (same roles as the sidebar links) */}
          <Route element={<ProtectedRoute roles={rolesFor('/developers/new')} />}>
            <Route path="/developers/new" element={<AddDeveloper />} />
          </Route>
          <Route element={<ProtectedRoute roles={rolesFor('/knowledge-gaps')} />}>
            <Route path="/knowledge-gaps" element={<KnowledgeGaps />} />
          </Route>
          <Route element={<ProtectedRoute roles={rolesFor('/team')} />}>
            <Route path="/team" element={<Team />} />
          </Route>
          <Route element={<ProtectedRoute roles={rolesFor('/audit')} />}>
            <Route path="/audit" element={<AuditLog />} />
          </Route>
          {/* Old address from earlier phases */}
          <Route path="/audit-log" element={<Navigate to="/audit" replace />} />
        </Route>
      </Route>

      {/* Any other URL goes to the overview (which itself redirects to /login if needed) */}
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
