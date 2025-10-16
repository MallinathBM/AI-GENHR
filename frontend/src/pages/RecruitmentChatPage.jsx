import React, { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createRecruitmentClient } from '../api/recruitment';

export default function RecruitmentChatPage() {
  const { token } = useAuth();
  const api = useMemo(() => createRecruitmentClient(() => token), [token]);
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi! Ask me about the hiring process.' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const data = await api.converse({ message: userMsg.content });
      setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: err?.response?.data?.message || err.message || 'Something went wrong' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Recruitment Chat (AI)</h1>
      <div className="card" style={{ padding: 12, minHeight: 280 }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ margin: '8px 0', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <span style={{
              display: 'inline-block',
              padding: '8px 12px',
              borderRadius: 14,
              background: m.role === 'user' ? 'rgba(99,102,241,0.25)' : 'rgba(2,6,23,0.45)',
              border: '1px solid rgba(148,163,184,0.2)'
            }}>{m.content}</span>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="form-grid" style={{ gridTemplateColumns: '1fr auto', marginTop: 12 }}>
        <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Type a message..." />
        <button disabled={loading} type="submit">{loading ? 'Sending...' : 'Send'}</button>
      </form>
    </div>
  );
}
