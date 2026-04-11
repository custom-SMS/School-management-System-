const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  marks: {
    test: { type: Number, default: 0 },
    midterm: { type: Number, default: 0 },
    final: { type: Number, default: 0 }
  },
  maxTotal: {
    type: Number,
    default: 100
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

// Auto-calculate total marks dynamically via a Mongoose Virtual
gradeSchema.virtual('total').get(function() {
  return (this.marks.test || 0) + (this.marks.midterm || 0) + (this.marks.final || 0);
});

// Auto-calculate percentage dynamically
gradeSchema.virtual('percentage').get(function() {
  const totalMarks = (this.marks.test || 0) + (this.marks.midterm || 0) + (this.marks.final || 0);
  return this.maxTotal > 0 ? ((totalMarks / this.maxTotal) * 100).toFixed(2) : 0;
});

module.exports = mongoose.model('Grade', gradeSchema);