const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  resumeUrl: {
    type: String,
    required: true
  },
  resumeText: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['Website', 'LinkedIn', 'Indeed', 'Referral', 'Other'],
    default: 'Website'
  },
  status: {
    type: String,
    enum: ['New', 'Screening', 'Interview', 'Technical Test', 'Offer', 'Hired', 'Rejected'],
    default: 'New'
  },
  aiEvaluation: {
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    skillMatch: {
      type: Number,
      min: 0,
      max: 100
    },
    experienceMatch: {
      type: Number,
      min: 0,
      max: 100
    },
    educationMatch: {
      type: Number,
      min: 0,
      max: 100
    },
    cultureFit: {
      type: Number,
      min: 0,
      max: 100
    },
    recommendedAction: {
      type: String,
      enum: ['Proceed to Interview', 'Technical Assessment', 'Reject', 'Hold for Future']
    },
    keyFindings: [String],
    evaluationDate: {
      type: Date
    }
  },
  interviews: [{
    interviewDate: Date,
    interviewType: {
      type: String,
      enum: ['Phone', 'Video', 'In-person', 'Technical', 'HR', 'Final']
    },
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    feedback: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'No-show']
    }
  }],
  notes: [{ 
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
CandidateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Candidate', CandidateSchema);