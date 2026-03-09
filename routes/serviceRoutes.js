const express = require("express");
const router = express.Router();
const Service = require("../models/Service");

// Get all services
router.get("/", async (req, res) => {
  try {
    const { category } = req.query

    const filter = category ? { category } : {}

    const services = await Service.find(filter)

    res.json(services)
  } catch (error) {
    res.status(500).json({ message: "Error fetching services" })
  }
})

module.exports = router;