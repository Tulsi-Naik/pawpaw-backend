const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet",
    required: true
  },

  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  timeSlot: {
    type: String,
    required: true
  },

  duration: {
    type: Number, // 30, 45, 60 minutes
    required: true
  },

  packageType: {
    type: String,
    enum: ["one-time", "recurring"],
    default: "one-time"
  },

  finalPrice: {
    type: Number,
    required: true
  },

  caregiver: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

  parentBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  },

status: {
  type: String,
  enum: ["Pending", "Accepted", "InProgress", "Completed", "Cancelled"],
  default: "Pending"
},

  paymentStatus: {
    type: String,
    enum: ["Unpaid", "Paid"],
    default: "Unpaid"
  }

}, { timestamps: true });
bookingSchema.index({ date: 1, timeSlot: 1 });

module.exports = mongoose.model("Booking", bookingSchema);