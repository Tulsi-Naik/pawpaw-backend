const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Pet = require("../models/Pet");

// Get logged-in user
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

// Update profile
router.put("/update", protect, async (req, res) => {
  const { phone, city, hasDog, bio } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { phone, city, hasDog, bio },
    { new: true }
  ).select("-password");

  res.json(user);
});



router.get("/", async (req,res)=>{

  const users = await User.find({ role: "user" })
    .select("-password")
    .sort({ createdAt: -1 });

  const enriched = await Promise.all(
    users.map(async (u) => {

      const pets = await Pet.find({ owner: u._id }).select("_id");
      const petIds = pets.map(p => p._id);

      const bookings = await Booking.find({
        pet: { $in: petIds }
      });

      const totalBookings = bookings.length;

      const totalSpent = bookings.reduce(
        (sum, b) => sum + (b.totalAmount || 0),
        0
      );

      return {
        ...u.toObject(),
        totalBookings,
        totalSpent
      };
    })
  );

  res.json(enriched);
});

module.exports = router;