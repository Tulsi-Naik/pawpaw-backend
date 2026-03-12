const cron = require("node-cron")
const Booking = require("../models/Booking")
const sendSMS = require("./sendSMS")

cron.schedule("*/10 * * * *", async () => {

  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

  const bookings = await Booking.find({
    status: "Accepted",
    date: { $gte: now, $lte: oneHourLater }
  }).populate({
    path: "pet",
    populate: { path: "owner" }
  })

  for (let b of bookings) {
    await sendSMS(
      b.pet.owner.phone,
      `PawPaw: Walk for ${b.pet.name} in 1 hour.`
    )
  }

})