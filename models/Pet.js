const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({

  name: { type: String, required: true },

  type: { type: String, required: true },

  breed: String,

  size: {
  type: String,
  enum: ["Small", "Medium", "Large"]
},

  dateOfBirth: Date,

  profilePhoto: String,

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
// Add to petSchema
lastAdoptionDate: Date,
previousOwners: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
transferStatus: { type: String, enum: ["Permanent", "Trial"], default: "Permanent" },
  // personality

  energyLevel: { type: Number, min: 1, max: 5 },

  friendliness: { type: Number, min: 1, max: 5 },

  anxietyLevel: { type: Number, min: 1, max: 5 },

  walkSpeed: { type: Number, min: 1, max: 5 },

  dogFriendly: Boolean,

  kidFriendly: Boolean,

  // health

  allergies: String,

  medicalNotes: String,

  // behaviour

  fears: [String],

  favoriteTreat: String

}, { timestamps: true });

module.exports = mongoose.model("Pet", petSchema);