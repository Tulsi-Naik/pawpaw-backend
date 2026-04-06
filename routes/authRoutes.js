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
    const { name, email, password, intent } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      intent: intent || "owner",
      hasDog: intent === "owner" || intent === "both"
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
<div style="font-family:Arial, sans-serif; background:#f4f6f8; padding:40px;">
  <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    
    <div style="background:#4f46e5; color:white; padding:20px; text-align:center;">
      <h2 style="margin:0;">PawPaw 🐾</h2>
    </div>

    <div style="padding:30px;">
      <h3 style="margin-top:0;">Reset Your Password</h3>

      <p>Hi ${user.name || "there"},</p>

      <p>We received a request to reset your password.</p>

      <p>Click the button below to set a new password:</p>

      <div style="text-align:center; margin:25px 0;">
        <a href="${link}"
           style="display:inline-block; background:#4f46e5; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">
           Reset Password
        </a>
      </div>

      <p style="font-size:14px; color:#555;">
        This link will expire in <b>15 minutes</b>.
      </p>

      <p style="font-size:14px; color:#555;">
        If you didn’t request this, you can safely ignore this email.
      </p>

    </div>

    <div style="background:#f4f4f4; padding:15px; text-align:center; font-size:12px;">
      © PawPaw
    </div>

  </div>
</div>
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