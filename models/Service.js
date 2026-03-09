const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Grooming, Walking
  price: { type: Number, required: true },
  duration: Number, // in minutes
  category: String
}, { timestamps: true });

module.exports = mongoose.model("Service", serviceSchema);