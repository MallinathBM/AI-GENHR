import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createPerformanceClient } from '../api/performance';

export default function PerformancePage() {
  const { token } = useAuth();
  const api = useMemo(() => createPerformanceClient(() => token), [token]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ employeeId: '', startDate: '', endDate: '', goals: '' });

  async function fetchList() {
    setLoading(true); setError('');
    try {
      const data = await api.list({ page, limit });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [page, limit]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const goals = (form.goals || '').split(',').map((t) => ({ title: t.trim(), weight: 1, score: 0 })).filter(g => g.title);
      const payload = {
        employeeId: form.employeeId,
        reviewPeriod: { startDate: form.startDate, endDate: form.endDate },
        goals,
        status: 'Draft'
      };
      await api.create(payload);
      setForm({ employeeId: '', startDate: '', endDate: '', goals: '' });
      await fetchList();
      alert('Performance review created');
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1>Performance</h1>

      <section className="card" style={{ marginTop: 12, padding: 12 }}>
        <h3>Create Performance Review</h3>
        <p>Enter an existing `employeeId`, review period, and a comma-separated list of goal titles.</p>
        <form onSubmit={handleCreate} className="form-grid three">
          <label> Employee ID
            <input required value={form.employeeId} onChange={(e)=>setForm(f=>({...f,employeeId:e.target.value}))} />
          </label>
          <label> Start Date
            <input required type="date" value={form.startDate} onChange={(e)=>setForm(f=>({...f,startDate:e.target.value}))} />
          </label>
          <label> End Date
            <input required type="date" value={form.endDate} onChange={(e)=>setForm(f=>({...f,endDate:e.target.value}))} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}> Goals (comma separated)
            <input value={form.goals} onChange={(e)=>setForm(f=>({...f,goals:e.target.value}))} />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button disabled={creating} type="submit">{creating ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </section>

      {error ? <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div> : null}
      <section className="card" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Period</th>
              <th>Overall Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: 12 }}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: 12 }}>No performance reviews.</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p._id}>
                  <td>{p.employee?.user ? `${p.employee.user.firstName} ${p.employee.user.lastName}` : p.employee?._id}</td>
                  <td>{p.reviewPeriod?.startDate ? new Date(p.reviewPeriod.startDate).toLocaleDateString() : ''} - {p.reviewPeriod?.endDate ? new Date(p.reviewPeriod.endDate).toLocaleDateString() : ''}</td>
                  <td>{p.overallScore ?? 0}</td>
                  <td>{p.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
        <span>Page {page}</span>
        <button disabled={(page*limit)>=total} onClick={()=>setPage(p=>p+1)}>Next</button>
        <select value={limit} onChange={(e)=>{setLimit(Number(e.target.value)); setPage(1);}}>
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </div>
    </div>
  );
}
