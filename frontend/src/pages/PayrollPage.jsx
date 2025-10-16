import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createPayrollClient } from '../api/payroll';

export default function PayrollPage() {
  const { token } = useAuth();
  const api = useMemo(() => createPayrollClient(() => token), [token]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ employeeId: '', startDate: '', endDate: '', baseAmount: '' });

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
      const payload = {
        employeeId: form.employeeId,
        payPeriod: { startDate: form.startDate, endDate: form.endDate },
        baseSalary: { amount: Number(form.baseAmount), currency: 'USD' }
      };
      await api.create(payload);
      setForm({ employeeId: '', startDate: '', endDate: '', baseAmount: '' });
      await fetchList();
      alert('Payroll record created');
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1>Payroll</h1>

      <section className="card" style={{ marginTop: 12, padding: 12 }}>
        <h3>Create Payroll</h3>
        <p>Enter an existing `employeeId` and pay period with base amount.</p>
        <form onSubmit={handleCreate} className="form-grid four">
          <label> Employee ID
            <input required value={form.employeeId} onChange={(e)=>setForm(f=>({...f,employeeId:e.target.value}))} />
          </label>
          <label> Start Date
            <input required type="date" value={form.startDate} onChange={(e)=>setForm(f=>({...f,startDate:e.target.value}))} />
          </label>
          <label> End Date
            <input required type="date" value={form.endDate} onChange={(e)=>setForm(f=>({...f,endDate:e.target.value}))} />
          </label>
          <label> Base Amount
            <input required type="number" min="0" value={form.baseAmount} onChange={(e)=>setForm(f=>({...f,baseAmount:e.target.value}))} />
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
              <th>Base</th>
              <th>Net</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: 12 }}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: 12 }}>No payroll records.</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p._id}>
                  <td>{p.employee?.user ? `${p.employee.user.firstName} ${p.employee.user.lastName}` : p.employee?._id}</td>
                  <td>{p.payPeriod?.startDate ? new Date(p.payPeriod.startDate).toLocaleDateString() : ''} - {p.payPeriod?.endDate ? new Date(p.payPeriod.endDate).toLocaleDateString() : ''}</td>
                  <td>{p.baseSalary?.amount} {p.baseSalary?.currency}</td>
                  <td>{p.netSalary}</td>
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
