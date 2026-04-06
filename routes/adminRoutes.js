const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

const protect = require("../middleware/authMiddleware");
const { getCaregivers } = require("../controllers/adminController");
const { toggleCaregiverStatus } = require("../controllers/adminController");

// Revenue
router.get("/revenue", async (req, res) => {
  try {
    const bookings = await Booking.find({ paymentStatus: "Paid" });

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const platformRevenue = bookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);
    const caregiverPayout = bookings.reduce((sum, b) => sum + (b.caregiverEarning || 0), 0);

    res.json({
      totalBookings: bookings.length,
      totalRevenue,
      platformRevenue,
      caregiverPayout
    });

  } catch (err) {
    res.status(500).json({ message: "Error fetching revenue" });
  }
});

//  NEW
router.get("/caregivers", protect, getCaregivers);
router.patch("/caregivers/:id/status", protect, toggleCaregiverStatus);
module.exports = router;