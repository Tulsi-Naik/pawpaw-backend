const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

const protect = require("../middleware/authMiddleware");
const { getCaregivers } = require("../controllers/adminController");
const { toggleCaregiverStatus } = require("../controllers/adminController");

// Revenue
router.get("/revenue", async (req, res) => {
  try {
    // 🔹 Fetch both Paid and Refunded bookings to show the full financial picture
    const allFinancialBookings = await Booking.find({ 
      paymentStatus: { $in: ["Paid", "Refunded"] } 
    });

    // 🟢 Paid logic (Money currently in the system)
    const paidBookings = allFinancialBookings.filter(b => b.paymentStatus === "Paid");
    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const platformRevenue = paidBookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);
    const caregiverPayout = paidBookings.reduce((sum, b) => sum + (b.caregiverEarning || 0), 0);

    // 🔴 Refunded logic (Money sent back due to Adoptions)
    const refundedBookings = allFinancialBookings.filter(b => b.paymentStatus === "Refunded");
    const totalRefunded = refundedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    res.json({
      totalBookings: paidBookings.length,
      totalRevenue,
      platformRevenue,
      caregiverPayout,
      totalRefunded // 🔥 Added this so your Dashboard can display it
    });

  } catch (err) {
    res.status(500).json({ message: "Error fetching revenue" });
  }
});

// NEW
router.get("/caregivers", protect, getCaregivers);
router.patch("/caregivers/:id/status", protect, toggleCaregiverStatus);

// Breed Analytics
const Pet = require("../models/Pet")

router.get("/breed-stats", async (req, res) => {
  try {

    const breedStats = await Pet.aggregate([
      {
        $group: {
          _id: "$breed",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ])

    res.json(breedStats)

  } catch (err) {
    res.status(500).json({ message: "Error fetching breed stats" })
  }
})

module.exports = router;