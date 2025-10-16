const express = require('express');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/employees -> list with pagination and optional search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { employeeId: new RegExp(q, 'i') },
        { 'employmentDetails.department': new RegExp(q, 'i') },
        { 'employmentDetails.position': new RegExp(q, 'i') },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Employee.find(filter).populate('user', 'firstName lastName email role').skip(skip).limit(Number(limit)).sort({ 'employmentDetails.joinDate': -1 }),
      Employee.countDocuments(filter),
    ]);
    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/employees/me -> current user's employee profile (if exists)
router.get('/me', async (req, res) => {
  try {
    const emp = await Employee.findOne({ user: req.user.sub }).populate('user', 'firstName lastName email role');
    if (!emp) return res.status(404).json({ message: 'Employee profile not found' });
    return res.json({ item: emp });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id).populate('user', 'firstName lastName email role');
    if (!emp) return res.status(404).json({ message: 'Not found' });
    return res.json({ item: emp });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/employees -> create (admin/manager/hr)
router.post('/', requireRole('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const { userId, userEmail, userPhone, employeeId, employmentDetails, personalInfo, skills, education, documents, status } = req.body;
    if ((!userId && !userEmail && !userPhone) || !employeeId || !employmentDetails?.joinDate || !employmentDetails?.department || !employmentDetails?.position) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    // Resolve user by id (if valid ObjectId) or by email
    let user = null;
    if (userId) {
      const isValid = require('mongoose').Types.ObjectId.isValid(userId);
      if (isValid) {
        user = await User.findById(userId);
      } else {
        // If userId is not ObjectId, decide by pattern: email vs phone
        const idStr = String(userId).trim();
        if (idStr.includes('@')) {
          user = await User.findOne({ email: idStr.toLowerCase() });
        } else {
          user = await User.findOne({ phone: idStr });
        }
      }
    } else if (userEmail) {
      user = await User.findOne({ email: String(userEmail).toLowerCase().trim() });
    } else if (userPhone) {
      user = await User.findOne({ phone: String(userPhone).trim() });
    }
    if (!user) return res.status(400).json({ message: 'Invalid user' });

    const existing = await Employee.findOne({ $or: [{ user: user._id }, { employeeId }] });
    if (existing) return res.status(409).json({ message: 'Employee already exists for this user or employeeId' });
    const emp = new Employee({ user: user._id, employeeId, employmentDetails, personalInfo, skills, education, documents, status });
    await emp.save();
    const populated = await emp.populate('user', 'firstName lastName email role');
    return res.status(201).json({ item: populated });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/employees/:id -> update (admin/manager/hr)
router.put('/:id', requireRole('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const updates = req.body || {};
    const emp = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!emp) return res.status(404).json({ message: 'Not found' });
    const populated = await emp.populate('user', 'firstName lastName email role');
    return res.json({ item: populated });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/employees/:id -> (admin/manager)
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
