const mongoose = require("mongoose");

const adoptionListingSchema = new mongoose.Schema({
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet",
    required: true
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  description: String,

  status: {
    type: String,
    enum: ["available", "adopted"],
    default: "available"
  }

}, { timestamps: true });

module.exports = mongoose.model("AdoptionListing", adoptionListingSchema);