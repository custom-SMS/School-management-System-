const mongoose = require('mongoose');

const gradeFeeSchema = new mongoose.Schema({
  grade: {
    type: String,
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
  }
});

module.exports = mongoose.model('GradeFee', gradeFeeSchema);