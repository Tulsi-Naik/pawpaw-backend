const express = require("express")
const router = express.Router()
const Application = require("../models/CaregiverApplication")
const bcrypt = require("bcryptjs")
const upload = require("../middleware/upload")
// create application
router.post(
  "/apply",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idProofImage", maxCount: 1 }
  ]),
  async (req, res) => {
    try {

      console.log("BODY:", req.body)
      console.log("FILES:", req.files)

      const app = await Application.create({
        ...req.body,
        skills: JSON.parse(req.body.skills),
        availability: JSON.parse(req.body.availability),
        profilePhoto: req.files?.profilePhoto?.[0]?.path,
        idProofImage: req.files?.idProofImage?.[0]?.path
      })

      res.status(201).json(app)

    } catch (err) {
      console.log("ERROR:", err)
      res.status(500).json({ message: err.message })
    }
  }
)

router.get("/", async (req, res) => {
  try {

    const status = req.query.status || "pending"

    const apps = await Application.find({ status })
      .sort({ createdAt: -1 })

    res.json(apps)

  } catch (err) {
    res.status(500).json({ message: "Error fetching applications" })
  }
})


const User = require("../models/User")

router.put("/:id/approve", async (req, res) => {
  try {

    const app = await Application.findById(req.params.id)

    if (!app) return res.status(404).json({ message: "Not found" })

    if (app.status !== "pending")
      return res.status(400).json({ message: "Already processed" })

    // create caregiver
    const hashed = await bcrypt.hash("temp123", 10)

const user = await User.create({
  name: app.name,
  email: app.email,
  phone: app.phone,
  city: app.city,
  role: "caregiver",
  skills: app.skills,
  availability: app.availability,
  profilePhoto: app.profilePhoto,
  experienceYears: app.experienceYears,
  experienceDetails: app.experienceDetails,
  password: hashed,
  onboardingStatus: "pending_setup"
})

  
    app.status = "approved"

    app.decisionInfo = {
      decidedAt: new Date()
    }

    await app.save()

    res.json({ message: "Application approved", user })

  } catch (err) {
    res.status(500).json({ message: "Approval failed" })
  }
})

router.put("/:id/reject", async (req, res) => {
  try {

    const app = await Application.findById(req.params.id)

    app.status = "rejected"

    app.decisionInfo = {
      decidedAt: new Date(),
      rejectionReason: req.body.reason
    }

    await app.save()

    res.json(app)

  } catch {
    res.status(500).json({ message: "Rejection failed" })
  }
})
module.exports = router