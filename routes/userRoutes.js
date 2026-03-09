const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");

// Get logged-in user
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

// Update profile
router.put("/update", protect, async (req, res) => {
  const { phone, city, hasDog } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { phone, city, hasDog },
    { new: true }
  ).select("-password");

  res.json(user);
});

router.get("/", async (req,res)=>{

  const filter = {}

  if (req.query.role) {
    filter.role = req.query.role
  }

  const users = await User.find(filter).select("-password")

  res.json(users)
})

module.exports = router;