const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

const router = express.Router();
router.use(authMiddleware);

// POST /api/ai/skills/gap { employeeSkills: [{name,level}], roleSkills: ["react","node"], catalog?: [{name, url}] }
router.post('/skills/gap', async (req, res) => {
  try {
    const { employeeSkills = [], roleSkills = [], catalog = [] } = req.body || {};
    const have = new Set(employeeSkills.map(s => (s.name || '').toLowerCase()));
    const needed = roleSkills.map(s => String(s).toLowerCase().trim()).filter(Boolean);
    const gaps = needed.filter(s => !have.has(s));
    const suggestions = gaps.map(g => ({
      skill: g,
      courses: (catalog || []).filter(c => String(c.name || '').toLowerCase().includes(g)).slice(0, 3)
    }));
    res.json({ gaps, suggestions });

// POST /api/ai/resume/improve { text, jd?, keywords? }
router.post('/resume/improve', async (req, res) => {
  try {
    const { text = '', jd = '', keywords = '' } = req.body || {};
    if (!text) return res.status(400).json({ message: 'text is required' });
    const axios = require('axios');
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const prompt = `You are an ATS resume optimizer for NextGenHR.
Given the current resume text, target job description (optional), and keywords, provide:
1) A prioritized, concise list of improvement suggestions to increase ATS score.
2) An improved resume draft (plain text), preserving truthfulness and structure.

Return in two sections with clear headers: SUGGESTIONS and IMPROVED_RESUME.`;

    let improvedText = '';
    let suggestions = [];

    if (openaiKey) {
      try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const payload = {
          model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `JOB DESCRIPTION:\n${jd}\n\nKEYWORDS: ${keywords}\n\nRESUME:\n${text}` }
          ],
          temperature: 0.4
        };
        const r = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          timeout: 20000
        });
        const msg = r?.data?.choices?.[0]?.message?.content || '';
        const parts = String(msg).split(/IMPROVED_RESUME[:\n]/i);
        if (parts.length >= 2) {
          improvedText = parts[1].trim();
          suggestions = parts[0].replace(/SUGGESTIONS[:\n]*/i, '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 20);
        } else {
          suggestions = msg.split(/\n+/).slice(0, 20);
        }
      } catch (_) { /* fall through */ }
    }

    if (!openaiKey && geminiKey) {
      try {
        const model = process.env.GEMINI_MODEL || 'models/gemini-1.5-flash';
        const payload = {
          contents: [
            { role: 'user', parts: [{ text: prompt }] },
            { role: 'user', parts: [{ text: `JOB DESCRIPTION:\n${jd}\n\nKEYWORDS: ${keywords}\n\nRESUME:\n${text}` }] }
          ]
        };
        const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${geminiKey}`;
        const r = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });
        const cand = r?.data?.candidates?.[0];
        const out = (cand?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n');
        const parts = String(out).split(/IMPROVED_RESUME[:\n]/i);
        if (parts.length >= 2) {
          improvedText = parts[1].trim();
          suggestions = parts[0].replace(/SUGGESTIONS[:\n]*/i, '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 20);
        } else {
          suggestions = out.split(/\n+/).slice(0, 20);
        }
      } catch (_) { /* fall through */ }
    }

    if (!improvedText && suggestions.length === 0) {
      // Fallback minimal heuristic suggestions
      suggestions = [
        'Add missing keywords from the job description into Skills and Experience.',
        'Use bullet points to improve scannability.',
        'Add clear section headings: SKILLS, EXPERIENCE, EDUCATION, CONTACT.',
        'Quantify achievements (numbers, percentages, impact).'
      ];
      improvedText = text;
    }

    res.json({ suggestions, improvedText });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/ai/attendance/anomalies?employeeId=&from=&to=
router.get('/attendance/anomalies', async (req, res) => {
  try {
    const { employeeId, from, to } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const recs = await Attendance.find(filter).sort({ date: 1 });
    let late = 0, absent = 0;
    const details = [];
    for (const r of recs) {
      const inTime = r.checkIn?.time ? new Date(r.checkIn.time) : null;
      if (!inTime) { absent++; details.push({ type: 'absent', date: r.date }); continue; }
      const hour = inTime.getHours();
      if (hour >= 10) { late++; details.push({ type: 'late', date: r.date }); }
    }
    const risk = Math.min(100, Math.round((late * 5 + absent * 15)));
    res.json({ total: recs.length, late, absent, risk, details });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/ai/performance/insights { goals:[{title,score,weight}], comments: string }
router.post('/performance/insights', async (req, res) => {
  try {
    const { goals = [], comments = '' } = req.body || {};
    const totalWeight = goals.reduce((s, g) => s + (g.weight || 0), 0) || 1;
    const weighted = goals.reduce((s, g) => s + ((g.score || 0) * (g.weight || 0)), 0);
    const autoScore = Math.round((weighted / totalWeight) * 100) / 100;
    const tips = [];
    if (/communication|collaborat(e|ion)/i.test(comments)) tips.push('Consider targeted communication training.');
    if (/deadline|delay/i.test(comments)) tips.push('Review time management approaches and set clearer milestones.');
    if (/quality|bug/i.test(comments)) tips.push('Introduce code reviews and automated tests to improve quality.');
    res.json({ autoScore, tips });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/ai/payroll/forecast { base, additions:[{amount}], deductions:[{amount}], months }
router.post('/payroll/forecast', async (req, res) => {
  try {
    const { base = 0, additions = [], deductions = [], months = 12 } = req.body || {};
    const add = additions.reduce((s, a) => s + Number(a.amount || 0), 0);
    const ded = deductions.reduce((s, d) => s + Number(d.amount || 0), 0);
    const monthlyNet = Math.max(0, Number(base) + add - ded);
    const projection = Array.from({ length: Math.max(1, Number(months)) }, (_, i) => ({ month: i + 1, net: monthlyNet }));
    const total = projection.reduce((s, p) => s + p.net, 0);
    res.json({ monthlyNet, projection, total });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/ai/candidates/rank { jd: string, candidates: [{ name, email, phone, resume, skills: [string] }] }
router.post('/candidates/rank', async (req, res) => {
  try {
    const { jd = '', candidates = [] } = req.body || {};
    const text = String(jd || '').toLowerCase();
    const tokens = Array.from(new Set(text.split(/[^a-z0-9+#.]/i).map(t => t.trim()).filter(t => t.length > 1)));
    // heuristics: prioritize common tech/role tokens
    const stop = new Set(['the','and','for','with','from','into','have','has','are','our','you','your','years','experience','responsibilities','requirements','work','team','using','in','on','to','of','a','an']);
    const keywords = tokens.filter(t => !stop.has(t)).slice(0, 100);

    const scored = candidates.map((c, idx) => {
      const skills = (c.skills || []).map(s => String(s).toLowerCase().trim()).filter(Boolean);
      const resume = String(c.resume || '').toLowerCase();
      const hay = new Set([
        ...skills,
        ...resume.split(/[^a-z0-9+#.]/i).map(t => t.trim()).filter(Boolean)
      ]);
      const matched = keywords.filter(k => hay.has(k));
      const missing = keywords.filter(k => !hay.has(k));
      const raw = matched.length / Math.max(1, keywords.length);
      // weight skills a bit higher
      const skillMatches = skills.filter(s => keywords.includes(s));
      const score = Math.min(100, Math.round((raw * 80 + (skillMatches.length > 0 ? 20 : 0)) * 100) / 100);
      return {
        index: idx,
        candidate: { name: c.name, email: c.email, phone: c.phone },
        score,
        matchSkills: Array.from(new Set(skillMatches)).slice(0, 10),
        missingSkills: missing.slice(0, 10),
        reason: `Matched ${matched.length}/${keywords.length} JD keywords; skills matched: ${skillMatches.slice(0,5).join(', ')}`
      };
    }).sort((a, b) => b.score - a.score);

    res.json({ ranked: scored });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// --- Resume ATS Analysis ---
// POST /api/ai/resume/analyze (multipart/form-data)
// fields: file: PDF/DOCX, jd?: string, keywords?: comma-separated
router.post('/resume/analyze', async (req, res) => {
  try {
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }).single('file');
    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
      const file = req.file;
      const { jd = '', keywords = '' } = req.body || {};
      if (!file) return res.status(400).json({ message: 'Please choose a PDF or DOCX file.' });

      const mime = (file.mimetype || '').toLowerCase();
      const name = (file.originalname || '').toLowerCase();
      const isPDF = mime.includes('pdf') || name.endsWith('.pdf');
      const isDOCX = mime.includes('wordprocessingml') || name.endsWith('.docx');
      if (!isPDF && !isDOCX) {
        return res.status(415).json({ message: 'Unsupported file type. Please upload a PDF or DOCX file.' });
      }
      let text = '';
      try {
        if (isPDF) {
          const pdfParse = require('pdf-parse');
          const data = await pdfParse(file.buffer);
          text = data.text || '';
        } else if (isDOCX) {
          const mammoth = require('mammoth');
          // Try raw text first
          const outRaw = await mammoth.extractRawText({ buffer: file.buffer });
          text = outRaw.value || '';
          // Fallback: try HTML then strip tags
          if (!text || text.trim().length < 20) {
            const outHtml = await mammoth.convertToHtml({ buffer: file.buffer });
            const html = outHtml.value || '';
            text = html
              .replace(/<style[\s\S]*?<\/style>/gi, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
        } else {
          // fallback: try to treat as text
          text = file.buffer.toString('utf8');
        }
      } catch (e) {
        return res.status(400).json({ message: 'Could not read the resume content. Please upload a text-based PDF or a DOCX file.' });
      }

      // Detect likely scanned PDFs or unreadable files
      const letters = (text.match(/[A-Za-z]/g) || []).length;
      if (!text || text.trim().length < 20 || letters < 10) {
        return res.status(422).json({
          message: 'Unable to extract text from scanned PDFs. Please upload a text-based resume.',
        });
      }

      // Simple ATS heuristics: tokens, keyword coverage, section presence, formatting cues
      const lower = String(text || '').toLowerCase();
      const tok = lower.split(/[^a-z0-9+#.]/i).filter(t => t && t.length > 1);
      const tokenSet = new Set(tok);
      const jdTokens = String(jd || '').toLowerCase().split(/[^a-z0-9+#.]/i).filter(Boolean);
      const kwList = String(keywords || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const musts = Array.from(new Set([...kwList, ...jdTokens])).slice(0, 100);
      const matched = musts.filter(k => tokenSet.has(k));
      const coverage = matched.length / Math.max(1, musts.length);

      const hasSkills = /skills|technolog|tool/i.test(text);
      const hasExperience = /experience|worked|project|employment/i.test(text);
      const hasEducation = /education|degree|university|college/i.test(text);
      const hasContact = /@|\+?\d{7,}/.test(text);

      // Formatting: bullet usage, consistent headings, length
      const bullets = (text.match(/[•\-\u2022]/g) || []).length;
      const headings = (text.match(/\n[A-Z][A-Z ]{2,}\n/g) || []).length;
      const pagesApprox = Math.ceil(text.length / 2500);

      // Score composition (heuristic ATS)
      const score = Math.round((coverage * 60
        + (hasSkills ? 10 : 0)
        + (hasExperience ? 10 : 0)
        + (hasEducation ? 8 : 0)
        + (hasContact ? 4 : 0)
        + Math.min(8, bullets * 0.5)
      ));

      const missing = musts.filter(k => !tokenSet.has(k)).slice(0, 15);
      const feedback = [
        !hasSkills && 'Add a clear Skills section with role-relevant keywords.',
        !hasExperience && 'Highlight experience with measurable impact and recent projects.',
        !hasEducation && 'Include Education details (degree, institution, year).',
        bullets < 5 && 'Use bullet points to improve scannability.',
        headings < 2 && 'Add clear section headings (e.g., SKILLS, EXPERIENCE, EDUCATION).',
        pagesApprox > 2 && 'Keep resume concise (1–2 pages is recommended).',
        missing.length ? `Optimize keywords: ${missing.slice(0,10).join(', ')}` : null
      ].filter(Boolean);

      // Extract sections (best-effort): name (top lines), skills, education, experience
      function extractSections(fullText) {
        const lines = (fullText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        // Guess name from top 5 lines without email/phone
        const top = lines.slice(0, 6).filter(l => !/@/.test(l) && !/\+?\d{7,}/.test(l));
        const nameGuess = (top.sort((a, b) => b.length - a.length)[0] || '').slice(0, 80);
        const norm = fullText.replace(/\r/g, '\n');
        const sections = {};
        function between(h1, h2) {
          const r1 = new RegExp(`\n\s*${h1}[\n: ]`, 'i');
          const r2 = h2 ? new RegExp(`\n\s*${h2}[\n: ]`, 'i') : null;
          const m1 = r1.exec(norm);
          if (!m1) return '';
          const start = m1.index + 1;
          const rest = norm.slice(start + m1[0].length);
          if (!r2) return rest.slice(0, 2000);
          const m2 = r2.exec(rest);
          return rest.slice(0, m2 ? m2.index : 2000);
        }
        const order = [
          ['skills', ['skills', 'technical skills', 'technologies', 'tools']],
          ['experience', ['experience', 'work experience', 'professional experience', 'employment history']],
          ['education', ['education', 'academics', 'qualifications']]
        ];
        const found = {};
        for (const [key, labels] of order) {
          for (const label of labels) {
            const seg = between(label, null);
            if (seg && seg.trim().length > 10) { found[key] = seg.trim().slice(0, 2000); break; }
          }
        }
        return { name: nameGuess, skills: found.skills || '', education: found.education || '', experience: found.experience || '' };
      }
      const parsedSections = extractSections(text);

      // Contact extraction (emails/phones)
      const emails = Array.from(new Set((text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).slice(0, 5)));
      const phones = Array.from(new Set((text.match(/\+?\d[\d\s().-]{7,}\d/g) || []).slice(0, 5)));

      // Detected skills (crude): intersect JD tokens/keywords with resume token set
      const detectedSkills = matched.slice(0, 50);

      // JD semantic fit using embeddings if available
      async function cosine(a, b) {
        const dot = a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
        const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0)) || 1;
        const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0)) || 1;
        return dot / (na * nb);
      }
      let jdFit = Math.round(coverage * 100);
      try {
        const axios = require('axios');
        if (process.env.OPENAI_API_KEY) {
          const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
          const r = await axios.post('https://api.openai.com/v1/embeddings', {
            input: [String(jd).slice(0, 8000), String(text).slice(0, 8000)],
            model
          }, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });
          const e1 = r?.data?.data?.[0]?.embedding;
          const e2 = r?.data?.data?.[1]?.embedding;
          if (e1 && e2) {
            const sim = await cosine(e1, e2);
            jdFit = Math.round(Math.max(0, Math.min(1, (sim + 1) / 2)) * 100);
          }
        } else if (process.env.GEMINI_API_KEY) {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`;
          const axios = require('axios');
          const [a, b] = await Promise.all([
            axios.post(url, { content: { parts: [{ text: String(jd).slice(0, 8000) }] } }),
            axios.post(url, { content: { parts: [{ text: String(text).slice(0, 8000) }] } })
          ]);
          const e1 = a?.data?.embedding?.values;
          const e2 = b?.data?.embedding?.values;
          if (e1 && e2) {
            const sim = await cosine(e1, e2);
            jdFit = Math.round(Math.max(0, Math.min(1, (sim + 1) / 2)) * 100);
          }
        }
      } catch (_) { /* ignore, keep fallback jdFit */ }

      const finalScore = Math.round(0.5 * score + 0.5 * jdFit);

      res.json({
        score: Math.min(100, Math.max(0, score)),
        jdFit,
        finalScore,
        matchedKeywords: matched.slice(0, 20),
        missingKeywords: missing,
        totalKeywords: musts.length,
        sections: {
          skills: hasSkills,
          experience: hasExperience,
          education: hasEducation,
          contact: hasContact
        },
        formatting: { bullets, headings, pagesApprox },
        feedback,
        extractedText: text,
        parsedSections,
        contact: { name: parsedSections.name || '', emails, phones },
        detectedSkills
      });
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
