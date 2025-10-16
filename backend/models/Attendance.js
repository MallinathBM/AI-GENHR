const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  checkOut: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  workHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Half-day', 'Work from home'],
    default: 'Present'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for employee and date to ensure unique attendance records per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
// For faster time-series and recent records queries
AttendanceSchema.index({ createdAt: -1 });

// Calculate work hours before saving
AttendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate work hours if both check-in and check-out times exist
  if (this.checkIn && this.checkIn.time && this.checkOut && this.checkOut.time) {
    const checkInTime = new Date(this.checkIn.time).getTime();
    const checkOutTime = new Date(this.checkOut.time).getTime();
    
    // Calculate hours difference
    this.workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    
    // Round to 2 decimal places
    this.workHours = Math.round(this.workHours * 100) / 100;
  }
  
  next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);