import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '../api/employees';
import { useAuth } from '../auth/AuthContext';

export default function EmployeesPage() {
  const { token } = useAuth();
  const api = useMemo(() => createClient(() => token), [token]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ userId: '', employeeId: '', department: '', position: '', joinDate: '' });

  async function fetchList() {
    setLoading(true); setError('');
    try {
      const data = await api.list({ page, limit, q });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [page, limit]);

  async function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    await fetchList();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        employmentDetails: {
          department: form.department,
          position: form.position,
          joinDate: form.joinDate,
        }
      };
      // interpret userId field as email or phone or Mongo ObjectId
      const idStr = String(form.userId || '').trim();
      if (idStr.includes('@')) payload.userEmail = idStr;
      else if (/^[+\d][\d\-\s()]*$/.test(idStr)) payload.userPhone = idStr.replace(/\s/g,'');
      else payload.userId = idStr;
      await api.create(payload);
      setForm({ userId: '', employeeId: '', department: '', position: '', joinDate: '' });
      await fetchList();
      alert('Employee created');
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1>Employees</h1>
      <form onSubmit={handleSearch} className="form-grid two" style={{ marginTop: 12 }}>
        <input placeholder="Search (id/department/position)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit">Search</button>
      </form>

      <section className="card" style={{ marginTop: 12, padding: 12 }}>
        <h3>Create Employee</h3>
        <p>Enter an existing user identifier: email, phone number, or Mongo ObjectId. The system will resolve the user accordingly.</p>
        <form onSubmit={handleCreate} className="form-grid three">
          <label> User (Email / Phone / ObjectId)
            <input required value={form.userId} onChange={(e)=>setForm(f=>({...f,userId:e.target.value}))} />
          </label>
          <label> Employee ID
            <input required value={form.employeeId} onChange={(e)=>setForm(f=>({...f,employeeId:e.target.value}))} />
          </label>
          <label> Department
            <input required value={form.department} onChange={(e)=>setForm(f=>({...f,department:e.target.value}))} />
          </label>
          <label> Position
            <input required value={form.position} onChange={(e)=>setForm(f=>({...f,position:e.target.value}))} />
          </label>
          <label> Join Date
            <input required type="date" value={form.joinDate} onChange={(e)=>setForm(f=>({...f,joinDate:e.target.value}))} />
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
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Join Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: 12 }}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: 12 }}>No employees found.</td></tr>
            ) : (
              items.map((e) => (
                <tr key={e._id}>
                  <td>{e.employeeId}</td>
                  <td>{e.user ? `${e.user.firstName} ${e.user.lastName}` : '-'}</td>
                  <td>{e.employmentDetails?.department}</td>
                  <td>{e.employmentDetails?.position}</td>
                  <td>{e.employmentDetails?.joinDate ? new Date(e.employmentDetails.joinDate).toLocaleDateString() : '-'}</td>
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
