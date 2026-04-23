const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const User = require("../models/User")
const protect = require("../middleware/authMiddleware");
const { getCaregivers } = require("../controllers/adminController");
const { toggleCaregiverStatus } = require("../controllers/adminController");
const Blog = require("../models/Blog") // ✅ add at top
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
    const { size, startDate, endDate } = req.query

    const match = {}

    // Filter by size
    if (size) {
      match.size = size
    }

    // Filter by date
    if (startDate || endDate) {
      match.createdAt = {}

      if (startDate) {
        match.createdAt.$gte = new Date(startDate)
      }

      if (endDate) {
        match.createdAt.$lte = new Date(endDate)
      }
    }

    const breedStats = await Pet.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$breed",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    res.json(breedStats)

  } catch (err) {
    res.status(500).json({ message: "Error fetching breed stats" })
  }
})

router.get("/caregiver-stats", async (req, res) => {
  try {

    const stats = await Booking.aggregate([

      // Only bookings with caregiver
      {
        $match: {
          caregiver: { $ne: null }
        }
      },

      // Group
      {
        $group: {
          _id: "$caregiver",

          // ONLY consider rated bookings
          ratings: {
            $push: {
              $cond: [
                { $ne: ["$rating", null] },
                "$rating",
                null
              ]
            }
          },

          totalBookings: { $sum: 1 }
        }
      },

      // Clean ratings array (remove nulls)
      {
        $project: {
          totalBookings: 1,
          ratings: {
            $filter: {
              input: "$ratings",
              as: "r",
              cond: { $ne: ["$$r", null] }
            }
          }
        }
      },

      // Compute stats
      {
        $project: {
          totalBookings: 1,
          totalReviews: { $size: "$ratings" },
          avgRating: {
            $cond: [
              { $gt: [{ $size: "$ratings" }, 0] },
              { $avg: "$ratings" },
              null
            ]
          }
        }
      },

      // Join caregiver
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "caregiver"
        }
      },

      { $unwind: "$caregiver" },

      // Final shape
      {
        $project: {
          name: "$caregiver.name",
          totalBookings: 1,
          totalReviews: 1,
          avgRating: {
            $cond: [
              { $eq: ["$avgRating", null] },
              null,
              { $round: ["$avgRating", 2] }
            ]
          }
        }
      },

      // Sort
      {
        $sort: { avgRating: -1 }
      }

    ])



    res.json(stats)

  } catch (err) {
    res.status(500).json({ message: "Error fetching caregiver stats" })
  }
})
// 🔥 ANALYTICS ROUTE
router.get("/analytics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const bookingMatch = {}

    if (startDate || endDate) {
      bookingMatch.createdAt = {}
      if (startDate) bookingMatch.createdAt.$gte = new Date(startDate)
      if (endDate) bookingMatch.createdAt.$lte = new Date(endDate)
    }

    // 🔹 BOOKINGS
    const bookings = await Booking.find(bookingMatch)

    // 🔹 REVENUE
    const paid = bookings.filter(b => b.paymentStatus === "Paid")

    const revenue = {
      totalRevenue: paid.reduce((s,b)=>s+(b.totalAmount||0),0),
      platformRevenue: paid.reduce((s,b)=>s+(b.platformFee||0),0),
      caregiverPayout: paid.reduce((s,b)=>s+(b.caregiverEarning||0),0)
    }

    // 🔹 FUNNEL
    const funnel = {
      totalBookings: bookings.length,
      paid: paid.length,
      completed: bookings.filter(b=>b.status==="Completed").length,
      rated: bookings.filter(b=>b.rating !== null).length
    }

    // 🔹 BREEDS (NO DATE FILTER for now → avoids crash)
    const breedStats = await Pet.aggregate([
      {
        $group: {
          _id: "$breed",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    // 🔹 USERS
    const userTrendRaw = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])

    const userTrend = userTrendRaw.map(u => ({
      month: `${u._id.month}/${u._id.year}`,
      count: u.count
    }))

    // 🔹 BLOG CATEGORY DISTRIBUTION
const blogCategories = await Blog.aggregate([
  {
    $group: {
      _id: "$category",
      count: { $sum: 1 }
    }
  }
])

// 🔹 BLOG TREND (monthly)
const blogTrendRaw = await Blog.aggregate([
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
])

const blogTrend = blogTrendRaw.map(b => ({
  month: `${b._id.month}/${b._id.year}`,
  count: b.count
}))

// 🔹 USER SEGMENTATION (based on spending)

const users = await User.find({ role: "user" })

const enrichedUsers = await Promise.all(
  users.map(async (u) => {

    const pets = await Pet.find({ owner: u._id }).select("_id")
    const petIds = pets.map(p => p._id)

    const bookings = await Booking.find({
      pet: { $in: petIds }
    })

    const totalSpent = bookings.reduce(
      (sum, b) => sum + (b.totalAmount || 0),
      0
    )

    return {
      userId: u._id,
      totalSpent
    }
  })
)

// sort descending
const sorted = enrichedUsers.sort((a,b)=> b.totalSpent - a.totalSpent)

// top 10%
const topCount = Math.ceil(sorted.length * 0.1)

const topUsers = sorted.slice(0, topCount)
const restUsers = sorted.slice(topCount)

// totals
const topRevenue = topUsers.reduce((s,u)=>s+u.totalSpent,0)
const restRevenue = restUsers.reduce((s,u)=>s+u.totalSpent,0)

const userSegmentation = [
  { name: "Top 10%", value: topRevenue },
  { name: "Other 90%", value: restRevenue }
]

    res.json({
      revenue,
      funnel,
      breedStats,
      userTrend,
      blogCategories,
  blogTrend,
  userSegmentation
    })

  } catch (err) {
    console.log("ANALYTICS ERROR:", err) // 🔥 IMPORTANT
    res.status(500).json({ message: "Error loading analytics" })
  }
})
module.exports = router;