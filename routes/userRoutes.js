const express = require("express")
const router = express.Router()
const protect = require("../middleware/authMiddleware")
const User = require("../models/User")
const Booking = require("../models/Booking")
const Pet = require("../models/Pet")
const multer = require("multer")
const cloudinary = require("../config/cloudinary") // 👈 your file

// multer setup
const storage = multer.memoryStorage()
const upload = multer({ storage })

// Get logged-in user
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password")
  res.json(user)
})


// 🔥 UPDATE PROFILE (FINAL FIX)
router.put("/update", protect, upload.single("profilePhoto"), async (req, res) => {
  try {
    const { phone, city, address, hasDog, bio } = req.body

    let updateData = {
      phone,
      city,
      address,
      hasDog,
      bio
    }

    // ✅ if image uploaded
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "profiles" },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        stream.end(req.file.buffer)
      })

      updateData.profilePhoto = result.secure_url
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("-password")

    res.json(user)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Update failed" })
  }
})


// Get all users (unchanged)
router.get("/", async (req,res)=>{

  const users = await User.find({ role: "user" })
    .select("-password")
    .sort({ createdAt: -1 })

  const enriched = await Promise.all(
    users.map(async (u) => {

      const pets = await Pet.find({ owner: u._id }).select("_id")
      const petIds = pets.map(p => p._id)

      const bookings = await Booking.find({
        pet: { $in: petIds }
      })

      const totalBookings = bookings.length

      const totalSpent = bookings.reduce(
        (sum, b) => sum + (b.totalAmount || 0),
        0
      )

      return {
        ...u.toObject(),
        totalBookings,
        totalSpent
      }
    })
  )

  res.json(enriched)
})

module.exports = router