const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: String,
    required: true,
    unique: true,
  },
  grade: {
    type: String,
    required: true,
  },
  personalDetails: {
    dateOfBirth: { type: Date },
    gender: { type: String },
    phone: { type: String },
    address: { type: String },
    admissionDate: { type: Date, default: Date.now },
  },
  familyBackground: {
    fatherName: { type: String },
    motherName: { type: String },
    guardianName: { type: String },
    occupation: { type: String },
    notes: { type: String },
  },
  guardianContacts: [{
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parent',
    },
    fullName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    relationship: { type: String, default: 'Guardian' },
    address: { type: String },
    primary: { type: Boolean, default: false },
  }],
  guardians: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
  }],
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Student', studentSchema);