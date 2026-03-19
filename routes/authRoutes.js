const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto")
const sendEmail = require("../utils/sendEmail")


const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
res.json({
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    city: user.city,
    skills: user.skills,
    availability: user.availability,
    profilePhoto: user.profilePhoto,
    bio: user.bio,
    serviceRadius: user.serviceRadius,
    dogSizesHandled: user.dogSizesHandled,
    onboardingStatus: user.onboardingStatus,
    mustChangePassword: user.mustChangePassword
  }
});

  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

// Set new password (first login)
router.put("/set-password", async (req, res) => {
  try {

    const { userId, newPassword } = req.body

    const hashed = await bcrypt.hash(newPassword, 10)

    await User.findByIdAndUpdate(userId, {
      password: hashed,
      mustChangePassword: false
    })

    res.json({ message: "Password updated successfully" })

  } catch (error) {
    res.status(500).json({ message: "Error updating password" })
  }
})

router.post("/forgot-password", async (req, res) => {
  try {

    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.json({ message: "If email exists, reset link sent" })
    }

    const token = crypto.randomBytes(32).toString("hex")

    user.resetToken = token
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15 // 15 mins

    await user.save()

    const link = `https://pawpaw-mu.vercel.app/reset-password/${token}`

    const html = `
      <p>Click below to reset your password:</p>
      <a href="${link}">${link}</a>
      <p>This link expires in 15 minutes.</p>
    `

    await sendEmail(user.email, "Reset your PawPaw password", html)

    res.json({ message: "If email exists, reset link sent" })

  } catch {
    res.status(500).json({ message: "Error sending reset link" })
  }
})

router.put("/reset-password/:token", async (req, res) => {
  try {

    const { token } = req.params
    const { newPassword } = req.body

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" })
    }

    const hashed = await bcrypt.hash(newPassword, 10)

    user.password = hashed
    user.resetToken = undefined
    user.resetTokenExpiry = undefined

    await user.save()

    res.json({ message: "Password reset successful" })

  } catch {
    res.status(500).json({ message: "Error resetting password" })
  }
})

module.exports = router;