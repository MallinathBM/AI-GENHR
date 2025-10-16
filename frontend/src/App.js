import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import PayrollPage from './pages/PayrollPage.jsx';
import PerformancePage from './pages/PerformancePage.jsx';
import RecruitmentScreeningPage from './pages/RecruitmentScreeningPage.jsx';
import RecruitmentChatPage from './pages/RecruitmentChatPage.jsx';
import AIToolsPage from './pages/AIToolsPage.jsx';
import { useAuth } from './auth/AuthContext';
// ChatbotWidget removed per request

function App() {
  const { token, logout } = useAuth();
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <header className="app-header" style={{ padding: '12px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link to="/" className="brand nav-link" style={{ textDecoration: 'none' }}><strong>NextGenHR</strong></Link>
        <nav className="nav">
          <Link className="nav-link" to="/">Dashboard</Link>
          <Link className="nav-link" to="/employees">Employees</Link>
          <Link className="nav-link" to="/attendance">Attendance</Link>
          <Link className="nav-link" to="/payroll">Payroll</Link>
          <Link className="nav-link" to="/performance">Performance</Link>
          <Link className="nav-link" to="/recruitment/screening">Screening</Link>
          <Link className="nav-link" to="/recruitment/chat">Recruitment Chat</Link>
          <Link className="nav-link" to="/ai/tools">AI Tools</Link>
          {token ? (
            <button className="nav-link" onClick={logout} style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>Logout</button>
          ) : (
            <Link className="nav-link" to="/login">Login</Link>
          )}
        </nav>
      </header>
      <main style={{ padding: 24 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <ProtectedRoute>
                <PayrollPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <PerformancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitment/screening"
            element={
              <ProtectedRoute>
                <RecruitmentScreeningPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitment/chat"
            element={
              <ProtectedRoute>
                <RecruitmentChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai/tools"
            element={
              <ProtectedRoute>
                <AIToolsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
