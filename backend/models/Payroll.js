const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  payPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  baseSalary: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  additions: [{
    type: {
      type: String,
      enum: ['Bonus', 'Overtime', 'Allowance', 'Commission', 'Other'],
      required: true
    },
    description: String,
    amount: {
      type: Number,
      required: true
    }
  }],
  deductions: [{
    type: {
      type: String,
      enum: ['Tax', 'Insurance', 'Loan', 'Absence', 'Other'],
      required: true
    },
    description: String,
    amount: {
      type: Number,
      required: true
    }
  }],
  netSalary: {
    type: Number,
    required: true
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['Bank Transfer', 'Check', 'Cash', 'Digital Wallet'],
      default: 'Bank Transfer'
    },
    accountNumber: String,
    bankName: String,
    transactionId: String,
    paymentDate: Date
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Processed', 'Paid', 'Cancelled'],
    default: 'Draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for employee and pay period to ensure unique payroll records
PayrollSchema.index({ employee: 1, 'payPeriod.startDate': 1, 'payPeriod.endDate': 1 }, { unique: true });

// Calculate net salary before saving
PayrollSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate net salary
  let totalAdditions = 0;
  let totalDeductions = 0;
  
  // Sum all additions
  if (this.additions && this.additions.length > 0) {
    totalAdditions = this.additions.reduce((sum, item) => sum + item.amount, 0);
  }
  
  // Sum all deductions
  if (this.deductions && this.deductions.length > 0) {
    totalDeductions = this.deductions.reduce((sum, item) => sum + item.amount, 0);
  }
  
  // Calculate net salary
  this.netSalary = this.baseSalary.amount + totalAdditions - totalDeductions;
  
  next();
});

// Helpful indexes for dashboards
PayrollSchema.index({ employee: 1, 'payPeriod.startDate': -1 });
PayrollSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payroll', PayrollSchema);