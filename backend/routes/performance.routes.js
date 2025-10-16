const express = require('express');
const dayjs = require('dayjs');
const Performance = require('../models/Performance');
const Employee = require('../models/Employee');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/performance -> list
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, employeeId, status } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Performance.find(filter).populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName email' } }).sort({ 'reviewPeriod.startDate': -1 }).skip(skip).limit(Number(limit)),
      Performance.countDocuments(filter),
    ]);
    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/performance/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await Performance.findById(req.params.id).populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName email' } });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    return res.json({ item: doc });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/performance
router.post('/', requireRole('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const { employeeId, reviewPeriod, goals, competencies, reviewer, comments, status } = req.body;
    if (!employeeId || !reviewPeriod?.startDate || !reviewPeriod?.endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(400).json({ message: 'Invalid employee' });
    const doc = new Performance({
      employee: employeeId,
      reviewPeriod,
      goals: goals || [],
      competencies: competencies || [],
      reviewer,
      comments,
      status: status || 'Draft',
    });
    await doc.save();
    const populated = await doc.populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName email' } });
    // realtime
    try { const io = req.app.get('io'); io && io.emit('performance:update', { id: doc._id, action: 'create', at: Date.now() }); } catch {}
    return res.status(201).json({ item: populated });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/performance/:id
router.put('/:id', requireRole('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const updates = req.body || {};
    const doc = await Performance.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const populated = await doc.populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName email' } });
    // realtime
    try { const io = req.app.get('io'); io && io.emit('performance:update', { id: doc._id, action: 'update', at: Date.now() }); } catch {}
    return res.json({ item: populated });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/performance/:id
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const doc = await Performance.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    // realtime
    try { const io = req.app.get('io'); io && io.emit('performance:update', { id: req.params.id, action: 'delete', at: Date.now() }); } catch {}
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
