const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const ContactMessage = require("../models/ContactMessage");

const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Name, email, and message are required"
      });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message
    });

    res.status(201).json({
      message: "Message sent successfully",
      contactMessage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending contact message" });
  }
});

router.get("/", protect, isAdmin, async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching contact messages" });
  }
});

router.patch("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const update = {};

    if (status) update.status = status;
    if (adminNote !== undefined) update.adminNote = adminNote;

    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Contact message not found" });
    }

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating contact message" });
  }
});

module.exports = router;
