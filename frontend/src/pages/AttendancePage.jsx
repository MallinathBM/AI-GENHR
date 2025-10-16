import React, { useEffect, useMemo, useState } from 'react';
import { createAttendanceClient } from '../api/attendance';
import { useAuth } from '../auth/AuthContext';

export default function AttendancePage() {
  const { token } = useAuth();
  const api = useMemo(() => createAttendanceClient(() => token), [token]);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchList() {
    setLoading(true); setError('');
    try {
      const params = { page, limit };
      if (from) params.from = from;
      if (to) params.to = to;
      const data = await api.list(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [page, limit]);

  async function handleClock(action) {
    try {
      setError('');
      if (action === 'in') await api.clockIn({});
      else await api.clockOut({});
      await fetchList();
      alert(`Clocked ${action}`);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Action failed');
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    await fetchList();
  }

  async function handleSummary(range) {
    try {
      const params = range === 'today' ? api.todayRange() : api.thisMonthRange();
      const data = await api.summary(params);
      alert(`Days: ${data.count}, Hours: ${data.totalHours}`);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Summary failed');
    }
  }

  return (
    <div>
      <h1>Attendance</h1>

      <section className="card" style={{ marginTop: 12, padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => handleClock('in')}>Clock In</button>
          <button onClick={() => handleClock('out')}>Clock Out</button>
          <button onClick={() => handleSummary('today')}>Today Summary</button>
          <button onClick={() => handleSummary('month')}>This Month Summary</button>
        </div>
        <form onSubmit={handleSearch} className="form-grid two" style={{ marginTop: 12 }}>
          <label> From
            <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
          </label>
          <label> To
            <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit">Filter</button>
          </div>
        </form>
      </section>

      {error ? <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div> : null}
      <section className="card" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: 12 }}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: 12 }}>No attendance records.</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r._id}>
                  <td>{r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
                  <td>{r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString() : '-'}</td>
                  <td>{r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString() : '-'}</td>
                  <td>{r.workHours ?? 0}</td>
                  <td>{r.status ?? 'Present'}</td>
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
