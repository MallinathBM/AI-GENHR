const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  reviewPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  goals: [{
    title: String,
    description: String,
    weight: { type: Number, default: 0 },
    score: { type: Number, min: 0, max: 100 },
  }],
  competencies: [{
    name: String,
    score: { type: Number, min: 0, max: 100 },
  }],
  overallScore: { type: Number, min: 0, max: 100, default: 0 },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: String,
  status: {
    type: String,
    enum: ['Draft', 'In Review', 'Finalized'],
    default: 'Draft',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

PerformanceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if ((!this.overallScore || this.overallScore === 0) && Array.isArray(this.goals) && this.goals.length > 0) {
    const totalWeight = this.goals.reduce((s, g) => s + (g.weight || 0), 0) || 1;
    const weighted = this.goals.reduce((s, g) => s + ((g.score || 0) * (g.weight || 0)), 0);
    this.overallScore = Math.round((weighted / totalWeight) * 100) / 100;
  }
  next();
});

module.exports = mongoose.model('Performance', PerformanceSchema);
// Helpful indexes for dashboards
PerformanceSchema.index({ employee: 1, 'reviewPeriod.startDate': -1 });
PerformanceSchema.index({ createdAt: -1 });
