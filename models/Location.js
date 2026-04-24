const mongoose = require("mongoose")
//working on loaction
const locationSchema = new mongoose.Schema({

  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true
  },

  caregiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  lat: Number,
  lng: Number

}, { timestamps: true })

module.exports = mongoose.model("Location", locationSchema)