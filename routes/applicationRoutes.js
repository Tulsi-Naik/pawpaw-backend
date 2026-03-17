const express = require("express")
const router = express.Router()
const Application = require("../models/CaregiverApplication")
const bcrypt = require("bcryptjs")
const upload = require("../middleware/upload")
const sendEmail = require("../utils/sendEmail")
const crypto = require("crypto")
// create application
router.post(
  "/apply",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idProofImage", maxCount: 1 }
  ]),
  async (req, res) => {
    try {

     

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
      const tempPassword = crypto.randomBytes(4).toString("hex")
const hashed = await bcrypt.hash(tempPassword, 10)
      const html = `
<div style="font-family:Arial, sans-serif; background:#f4f6f8; padding:40px;">
  <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    
    <div style="background:#4f46e5; color:white; padding:20px; text-align:center;">
      <h2 style="margin:0;">PawPaw 🐾</h2>
    </div>

    <div style="padding:30px;">
      <h3 style="margin-top:0;">Application Approved</h3>

      <p>Hi ${app.name},</p>

      <p>Your caregiver application has been <b>approved</b>. You can now log in to PawPaw.</p>

      <div style="background:#f9fafb; padding:15px; border-radius:8px; margin:20px 0;">
        <p style="margin:0;"><b>Email:</b> ${app.email}</p>
<p style="margin:0;"><b>Temporary Password:</b> ${tempPassword}</p>
      </div>

      <p>Please log in and change your password.</p>

      <a href="https://pawpaw-mu.vercel.app/login"
         style="display:inline-block; background:#4f46e5; color:white; padding:12px 20px; border-radius:6px; text-decoration:none;">
         Login to PawPaw
      </a>

      <p style="margin-top:30px;">Welcome to the PawPaw team 🐾</p>
    </div>

    <div style="background:#f4f4f4; padding:15px; text-align:center; font-size:12px;">
      © PawPaw
    </div>

  </div>
</div>
`

    if (app.status !== "pending")
      return res.status(400).json({ message: "Already processed" })

    // create caregiver


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
  onboardingStatus: "pending_setup",
   mustChangePassword: true
})

  
    app.status = "approved"

    app.decisionInfo = {
      decidedAt: new Date()
    }

    await app.save()

    await sendEmail(
  app.email,
  "Your PawPaw Caregiver Application is Approved 🐾",
  html
)

    res.json({ message: "Application approved", user })

  } catch (err) {
    res.status(500).json({ message: "Approval failed" })
  }
})

router.put("/:id/reject", async (req, res) => {
  try {

    const app = await Application.findById(req.params.id)
    if (!app) return res.status(404).json({ message: "Not found" })

    const html = `
<div style="font-family:Arial, sans-serif; background:#f4f6f8; padding:40px;">
  <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">

    <div style="background:#ef4444; color:white; padding:20px; text-align:center;">
      <h2 style="margin:0;">PawPaw 🐾</h2>
    </div>

    <div style="padding:30px;">
      <h3 style="margin-top:0;">Application Update</h3>

      <p>Hi ${app.name},</p>

      <p>Thank you for applying to become a caregiver with PawPaw.</p>

      <p>After reviewing your application, we regret to inform you that we are unable to proceed at this time.</p>

      <p style="margin-top:20px;">
        We appreciate your interest in PawPaw and wish you the best.
      </p>
    </div>

    <div style="background:#f4f4f4; padding:15px; text-align:center; font-size:12px;">
      © PawPaw
    </div>

  </div>
</div>
`

    app.status = "rejected"

    app.decisionInfo = {
      decidedAt: new Date(),
      rejectionReason: req.body.reason
    }

    await app.save()

    await sendEmail(
  app.email,
  "Update on Your PawPaw Caregiver Application",
  html
)

    res.json(app)

  } catch {
    res.status(500).json({ message: "Rejection failed" })
  }
})
module.exports = router