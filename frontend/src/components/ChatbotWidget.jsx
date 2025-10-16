import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

export default function ChatbotWidget() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const listRef = useRef(null);
  const recRef = useRef(null);

  function headers() { return token ? { Authorization: `Bearer ${token}` } : {}; }

  function pushMessage(msg) {
    setMessages((m) => [...m, msg]);
    setTimeout(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, 10);
  }

  async function loadSessions() {
    try {
      const res = await axios.get('/api/chat/sessions', { headers: headers() });
      setSessions(res.data.items || []);
      if ((res.data.items || []).length === 0) {
        const created = await axios.post('/api/chat/sessions', { title: 'Chat Session' }, { headers: headers() });
        setSessionId(created.data.item._id);
        setMessages([{ role: 'bot', text: 'New session created. How can I help you today?' }]);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load sessions');
    }
  }

  async function openSession(id) {
    try {
      const res = await axios.get(`/api/chat/sessions/${id}`, { headers: headers() });
      setSessionId(id);
      setMessages(res.data.item?.messages?.length ? res.data.item.messages : [{ role: 'bot', text: 'Hi! Continue our chat.' }]);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to open session');
    }
  }

  async function newSession() {
    try {
      const created = await axios.post('/api/chat/sessions', { title: 'Chat Session' }, { headers: headers() });
      setSessions((s) => [created.data.item, ...s]);
      setSessionId(created.data.item._id);
      setMessages([{ role: 'bot', text: 'New session created. How can I help you today?' }]);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to create session');
    }
  }

  async function sendMessage(e) {
    e?.preventDefault?.();
    const text = (input || '').trim();
    if (!text || !sessionId) return;
    setInput('');
    pushMessage({ role: 'user', text });
    setLoading(true); setError('');
    try {
      const res = await axios.post(`/api/chat/sessions/${sessionId}/message`, { text }, { headers: headers() });
      const reply = res?.data?.reply || 'Okay.';
      pushMessage({ role: 'bot', text: reply });
      if (speaking) speak(reply);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  }

  // Voice: TTS
  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1; utt.pitch = 1; utt.lang = 'en-US';
      window.speechSynthesis.speak(utt);
    } catch {}
  }

  // Voice: STT
  function toggleListen() {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setError('SpeechRecognition not supported in this browser'); return; }
      if (!recRef.current) {
        const rec = new SR();
        rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
        rec.onresult = (ev) => {
          const transcript = Array.from(ev.results).map(r => r[0].transcript).join(' ');
          setInput(transcript);
        };
        rec.onend = () => setListening(false);
        rec.onerror = () => setListening(false);
        recRef.current = rec;
      }
      if (!listening) { setListening(true); recRef.current.start(); } else { recRef.current.stop(); setListening(false); }
    } catch (e) { setListening(false); }
  }

  useEffect(() => {
    if (open) loadSessions();
  }, [open]);

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 50 }}>
      {open && (
        <div className="card" style={{ width: 340, height: 480, padding: 12, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>AI Chatbot</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={newSession} title="New session">New</button>
              <select value={sessionId} onChange={(e)=>openSession(e.target.value)}>
                <option value="">Select chat</option>
                {sessions.map(s => (
                  <option key={s._id} value={s._id}>{s.title || 'Chat'} · {new Date(s.updatedAt).toLocaleDateString()}</option>
                ))}
              </select>
              <button className="btn-secondary" onClick={()=>setSpeaking(v=>!v)} title="Toggle TTS">{speaking ? '🔊' : '🔈'}</button>
              <button className="btn-secondary" onClick={toggleListen} title="Toggle mic">{listening ? '🎙️…' : '🎙️'}</button>
              <button className="btn-secondary" onClick={() => setOpen(false)} title="Hide chatbot">Cancel</button>
            </div>
          </div>
          <div ref={listRef} style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '8px 10px', borderRadius: 10, background: m.role === 'user' ? 'rgba(99,102,241,0.25)' : 'rgba(2,6,23,0.45)', border: '1px solid rgba(148,163,184,0.2)' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{m.role === 'user' ? 'You' : 'Bot'}</div>
                  <div>{m.text}</div>
                </div>
              </div>
            ))}
            {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
          </div>
          <form onSubmit={sendMessage} className="form-grid" style={{ gridTemplateColumns: '1fr auto', marginTop: 8 }}>
            <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Type a message..." />
            <button disabled={loading || !sessionId} type="submit">{loading ? '...' : 'Send'}</button>
          </form>
        </div>
      )}
      {!open && (
        <button onClick={() => setOpen(true)} title="Open AI Chatbot" style={{ borderRadius: 999, width: 56, height: 56, padding: 0, display: 'grid', placeItems: 'center' }}>
          💬
        </button>
      )}
    </div>
  );
}
