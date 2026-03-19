const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  phone: String,

  password: { type: String, required: true },

  city: String,

  profilePhoto: String,

  hasDog: {
    type: Boolean,
    default: true
  },

  role: {
    type: String,
    enum: ["user", "admin", "caregiver"],
    default: "user"
  },

  skills: {
    type: [String],
    enum: ["walking", "grooming"],
    default: []
  },

  onboardingStatus: {
    type: String,
    enum: [
      "pending_setup",
      "profile_completed",
      "active",
      "suspended"
    ],
    default: "pending_setup"
  },
  bio: String,
serviceRadius: Number,
walkingPrice: Number,
groomingPrice: Number,
dogSizesHandled: [String],


availability: {
  type: [String],
  enum: ["morning","afternoon","evening"],
  default: []
},
mustChangePassword: {
  type: Boolean,
  default: false
},

resetToken: String,
resetTokenExpiry: Date,

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);