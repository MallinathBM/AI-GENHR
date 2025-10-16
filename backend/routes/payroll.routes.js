const express = require('express');
const dayjs = require('dayjs');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/payroll -> list with pagination and optional filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, employeeId, from, to, status } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    if (from || to) {
      filter['payPeriod.startDate'] = {};
      if (from) filter['payPeriod.startDate'].$gte = dayjs(from).startOf('day').toDate();
      if (to) filter['payPeriod.startDate'].$lte = dayjs(to).endOf('day').toDate();
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Payroll.find(filter).populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName email' } }).sort({ 'payPeriod.startDate': -1 }).skip(skip).limit(Number(limit)),
      Payroll.countDocuments(filter),
    ]);
    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/payroll/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await Payroll.findById(req.params.id).populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName email' } });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    return res.json({ item: doc });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payroll -> create payroll record (admin/manager)
router.post('/', requireRole('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const { employeeId, payPeriod, baseSalary, additions, deductions, paymentDetails, status, notes } = req.body;
    if (!employeeId || !payPeriod?.startDate || !payPeriod?.endDate || !baseSalary?.amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(400).json({ message: 'Invalid employee' });
    const doc = new Payroll({
      employee: employeeId,
      payPeriod,
      baseSalary,
      additions: additions || [],
      deductions: deductions || [],
      paymentDetails,
      status: status || 'Draft',
      notes,
      netSalary: 0, // will be computed in pre-save
    });
    await doc.save();
    const populated = await doc.populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName email' } });
    // realtime
    try { const io = req.app.get('io'); io && io.emit('payroll:update', { id: doc._id, action: 'create', at: Date.now() }); } catch {}
    return res.status(201).json({ item: populated });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Duplicate payroll for period/employee' });
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/payroll/:id -> update (admin/manager)
router.put('/:id', requireRole('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const updates = req.body || {};
    const doc = await Payroll.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const populated = await doc.populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName email' } });
    // realtime
    try { const io = req.app.get('io'); io && io.emit('payroll:update', { id: doc._id, action: 'update', at: Date.now() }); } catch {}
    return res.json({ item: populated });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/payroll/:id -> (admin/manager)
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const doc = await Payroll.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    // realtime
    try { const io = req.app.get('io'); io && io.emit('payroll:update', { id: req.params.id, action: 'delete', at: Date.now() }); } catch {}
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
