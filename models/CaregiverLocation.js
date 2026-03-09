const mongoose = require("mongoose")

const caregiverLocationSchema = new mongoose.Schema({

  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true
  },

  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  lat: Number,
  lng: Number,

  updatedAt: {
    type: Date,
    default: Date.now
  }

})

module.exports = mongoose.model(
  "CaregiverLocation",
  caregiverLocationSchema
)