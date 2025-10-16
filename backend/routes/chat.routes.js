const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const ChatSession = require('../models/ChatSession');

const router = express.Router();
router.use(authMiddleware);

// GET /api/chat/sessions -> list user's sessions (latest first)
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await ChatSession.find({ user: req.user.sub }).sort({ updatedAt: -1 }).select('title updatedAt');
    res.json({ items: sessions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chat/sessions -> create new session
router.post('/sessions', async (req, res) => {
  try {
    const { title } = req.body || {};
    const doc = new ChatSession({ user: req.user.sub, title: title || 'Chat Session', messages: [] });
    await doc.save();
    res.status(201).json({ item: doc });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chat/sessions/:id -> get a session
router.get('/sessions/:id', async (req, res) => {
  try {
    const doc = await ChatSession.findOne({ _id: req.params.id, user: req.user.sub });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ item: doc });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/chat/sessions/:id -> discard session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const del = await ChatSession.findOneAndDelete({ _id: req.params.id, user: req.user.sub });
    if (!del) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chat/sessions/:id/message -> append user message, call recruiter converse, append bot reply
router.post('/sessions/:id/message', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ message: 'text required' });
    const doc = await ChatSession.findOne({ _id: req.params.id, user: req.user.sub });
    if (!doc) return res.status(404).json({ message: 'Not found' });

    // append user message
    doc.messages.push({ role: 'user', text });

    // Prefer OpenAI if configured; otherwise Google Gemini; otherwise fall back to internal recruiter endpoint
    const axios = require('axios');
    let reply = 'Okay.';
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (openaiKey) {
      try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        // Build conversation context from last 10 messages
        const history = doc.messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
        const systemPrompt = process.env.RECRUITER_SYSTEM_PROMPT || 'You are NextGenHR Recruiter Assistant. Be concise, helpful, and ask follow-up questions when screening candidates. Focus on skills, experience, cultural fit, and availability.';
        const payload = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: text }
          ],
          temperature: 0.3
        };
        const r = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          timeout: 15000
        });
        const msg = r?.data?.choices?.[0]?.message?.content?.trim();
        if (msg) reply = msg;
      } catch (e) {
        // ignore and try Gemini
      }
    }
    if (!openaiKey && geminiKey) {
      try {
        const model = process.env.GEMINI_MODEL || 'models/gemini-1.5-flash';
        // Build conversation context from last 10 messages
        const history = doc.messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
        const systemPrompt = process.env.RECRUITER_SYSTEM_PROMPT || 'You are NextGenHR Recruiter Assistant. Be concise, helpful, and ask follow-up questions when screening candidates. Focus on skills, experience, cultural fit, and availability.';
        const payload = {
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...history,
            { role: 'user', parts: [{ text }] }
          ]
        };
        const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${geminiKey}`;
        const r = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
        const cand = r?.data?.candidates?.[0];
        const parts = cand?.content?.parts || [];
        const textOut = parts.map(p => p.text).filter(Boolean).join('\n').trim();
        if (textOut) reply = textOut;
      } catch (e) {
        // ignore, will fall back below
      }
    }
    if ((!openaiKey && !geminiKey) || reply === 'Okay.') {
      const base = process.env.SELF_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      try {
        const r = await axios.post(`${base}/api/recruitment/converse`, { message: text }, { headers: { Authorization: req.headers.authorization || '' } });
        reply = r?.data?.reply || reply;
      } catch (_) {}
    }

    // append bot reply
    doc.messages.push({ role: 'bot', text: reply });
    await doc.save();
    res.json({ item: doc, reply });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
