const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true,
    default: ""
  },
  subject: {
    type: String,
    trim: true,
    default: "General inquiry"
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ["new", "read", "resolved"],
    default: "new"
  },
  adminNote: {
    type: String,
    trim: true,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
