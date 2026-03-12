const express = require("express")
const router = express.Router()
const protect = require("../middleware/authMiddleware")
const Location = require("../models/Location")

// caregiver updates location
router.post("/update", protect, async (req, res) => {

  try {

const { bookingId, lat, lng } = req.body

const location = await Location.create({
  booking: bookingId,
  caregiver: req.user.id,
  lat,
  lng
})

res.json(location)

  } catch (err) {
    console.log(err)
    // console.log(req.body)
    res.status(500).json({ message: "Location update failed" })
  }

})


// owner fetches caregiver location
router.get("/:bookingId", protect, async (req, res) => {

  try {

 const locations = await Location
  .find({ booking: req.params.bookingId })
  .sort({ createdAt: 1 })

res.json(locations)


  } catch (err) {
    res.status(500).json({ message: "Location fetch failed" })
  }

})

module.exports = router