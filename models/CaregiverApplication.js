const mongoose = require("mongoose")

const caregiverApplicationSchema = new mongoose.Schema(
{
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  phone: { type: String, required: true },

  city: { type: String, required: true },

  profilePhoto: {
    type: String
  },

  skills: {
    type: [String],
    enum: ["walking","grooming"],
    required: true
  },

  experienceYears: {
    type: Number,
    required: true
  },

  experienceDetails: String,

  availability: {
    type: [String],
    enum: ["morning","afternoon","evening"],
    required: true
  },

  idProofType: {
    type: String,
enum: ["aadhar","driving_license","pan","other"],
    required: true
  },
otherIdProof: String,
  idProofImage: {
    type: String
  },

  idProofNumber: {
    type: String,
    required: true
  },

  referenceName: String,

  referencePhone: String,

  status: {
    type: String,
    enum: ["pending","approved","rejected"],
    default: "pending"
  },

  
  decisionInfo: {
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    decidedAt: Date,
    rejectionReason: String
  }

},
{ timestamps: true }
)

module.exports = mongoose.model(
  "CaregiverApplication",
  caregiverApplicationSchema
)