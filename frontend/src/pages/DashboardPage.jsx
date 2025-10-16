import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import axios from 'axios';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { useRealtime } from '../hooks/useRealtime';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export default function DashboardPage() {
  const { user, logout, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trends, setTrends] = useState(null);
  const [scope, setScope] = useState('employee'); // 'employee' | 'company'
  const [range, setRange] = useState('30d'); // '7d' | '30d' | '90d'
  const [refreshTick, setRefreshTick] = useState(0);

  // subscribe to realtime events and trigger a refresh
  useRealtime(() => setRefreshTick((t) => t + 1));

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true); setError('');
      try {
        // choose endpoints based on scope
        const base = scope === 'company' ? '/api/stats/company' : '/api/stats/me';
        const res = await axios.get(base, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!ignore) setStats(res.data);
        const trendsUrl = scope === 'company' ? '/api/stats/company/trends' : '/api/stats/me/trends';
        const tr = await axios.get(`${trendsUrl}?range=${encodeURIComponent(range)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!ignore) setTrends(tr.data);
      } catch (e) {
        if (!ignore) setError(e?.response?.data?.message || e.message || 'Failed to load');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, scope, range, refreshTick]);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 24 }}>
      <h1>Dashboard</h1>
      {user ? (
        <p>Welcome, <strong>{user.firstName} {user.lastName}</strong> ({user.role})</p>
      ) : (
        <p>Welcome!</p>
      )}

      {error ? <div style={{ color: 'crimson', margin: '12px 0' }}>{error}</div> : null}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Scope</label><br />
          <select value={scope} onChange={(e)=>setScope(e.target.value)}>
            <option value="employee">Employee</option>
            {user?.role === 'admin' ? <option value="company">Company</option> : null}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Range</label><br />
          <select value={range} onChange={(e)=>setRange(e.target.value)}>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
          </select>
        </div>
      </div>

      {scope === 'company' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
          {['users','employees','attendance','payroll','performance'].map((k) => (
            <div key={k} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#666', fontSize: 12, textTransform: 'uppercase' }}>{k}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? '…' : (stats ? stats[k] : '-')}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
          {['attendance','performance','payroll'].map((k) => (
            <div key={k} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#666', fontSize: 12, textTransform: 'uppercase' }}>{k}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? '…' : (stats && stats[k] !== undefined ? stats[k] : '-')}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Employees (30-day trend)</h3>
          {trends ? (
            <Line
              data={{
                labels: trends.employees.labels,
                datasets: [{
                  label: 'Employees/day',
                  data: trends.employees.data,
                  borderColor: '#6366f1',
                  backgroundColor: 'rgba(99,102,241,0.2)'
                }]
              }}
              options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
            />
          ) : (
            <div>Loading…</div>
          )}
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Attendance (30-day trend)</h3>
          {trends ? (
            <Line
              data={{
                labels: trends.attendance.labels,
                datasets: [{
                  label: 'Attendance/day',
                  data: trends.attendance.data,
                  borderColor: '#22c55e',
                  backgroundColor: 'rgba(34,197,94,0.2)'
                }]
              }}
              options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
            />
          ) : (
            <div>Loading…</div>
          )}
        </div>
      </div>

      {/* Overall feature charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Features Overview (Bar)</h3>
          {stats ? (
            <Bar
              data={{
                labels: ['Users','Employees','Attendance','Payroll','Performance'],
                datasets: [{
                  label: 'Total',
                  data: [stats.users ?? 0, stats.employees ?? 0, stats.attendance ?? 0, stats.payroll ?? 0, stats.performance ?? 0],
                  backgroundColor: ['#38bdf8','#6366f1','#22c55e','#f59e0b','#ef4444']
                }]
              }}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          ) : (
            <div>Loading…</div>
          )}
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Features Composition (Pie)</h3>
          {stats ? (
            <Pie
              data={{
                labels: ['Users','Employees','Attendance','Payroll','Performance'],
                datasets: [{
                  data: [stats.users ?? 0, stats.employees ?? 0, stats.attendance ?? 0, stats.payroll ?? 0, stats.performance ?? 0],
                  backgroundColor: ['#38bdf8','#6366f1','#22c55e','#f59e0b','#ef4444']
                }]
              }}
              options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
            />
          ) : (
            <div>Loading…</div>
          )}
        </div>
      </div>

      <button onClick={logout} style={{ padding: '8px 12px', marginTop: 24 }}>Logout</button>
    </div>
  );
}
