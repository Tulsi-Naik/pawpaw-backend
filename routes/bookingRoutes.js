const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const Pet = require("../models/Pet");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const sendSMS = require("../utils/sendSMS")
// Create full booking flow
router.post("/create", protect, async (req, res) => {
  try {
    const {
      petId,
      serviceId,
      date,
      timeSlots,
      duration,
      packageType,
      recurringDays,
      finalPrice
    } = req.body;

    if (!petId || !serviceId || !date || !timeSlots?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const bookingsToCreate = [];

    const startDate = new Date(date);

    // ONE-TIME BOOKING
    if (packageType === "one-time") {

      for (let slot of timeSlots) {
        bookingsToCreate.push({
          pet: petId,
          service: serviceId,
          date: startDate,
          timeSlot: slot,
          duration,
          packageType,
          finalPrice,
          status: "Pending"
        });
      }

    } else {
      // RECURRING (4 weeks)
      const weeks = 4;

      for (let week = 0; week < weeks; week++) {

        for (let day of recurringDays) {

          const dayIndex = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(day);

          const bookingDate = new Date(startDate);
          bookingDate.setDate(
            bookingDate.getDate() +
            (week * 7) +
            ((dayIndex - bookingDate.getDay() + 7) % 7)
          );

          for (let slot of timeSlots) {
            bookingsToCreate.push({
              pet: petId,
              service: serviceId,
              date: bookingDate,
              timeSlot: slot,
              duration,
              packageType,
              finalPrice,
              status: "Pending"
            });
          }
        }
      }
    }
// check for conflicts
for (let booking of bookingsToCreate) {

  const existingBookings = await Booking.find({
    pet: booking.pet,
    date: booking.date,
    status: { $ne: "Cancelled" }
  })


  const convertToMinutes = (time) => {
  const [t, period] = time.split(" ")
  let [hours, minutes] = t.split(":").map(Number)

  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0

  return hours * 60 + minutes
}

const start = convertToMinutes(booking.timeSlot)
const end = start + booking.duration

for (let existing of existingBookings) {

  const existingStart = convertToMinutes(existing.timeSlot)
  const existingEnd = existingStart + existing.duration

  const overlap = start < existingEnd && end > existingStart

  if (overlap) {
    return res.status(400).json({
      message: "Selected time overlaps with another walk"
    })
  }
}

}

    const createdBookings = await Booking.insertMany(bookingsToCreate);

    const user = await User.findById(req.user.id)

// await sendSMS(
//   user.phone,
//   `PawPaw Booking confirmed for ${date}.`
// )
    res.status(201).json({
      message: "Booking(s) created successfully",
      count: createdBookings.length
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating booking" });
  }
});

router.get("/my", protect, async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.id }).select("_id");

    const petIds = pets.map(p => p._id);

    const bookings = await Booking.find({ pet: { $in: petIds } })
      .populate({
  path: "pet",
  populate: {
    path: "owner",
    select: "city phone"
  }
})  
.populate("caregiver", "name phone profilePhoto")
      .populate("service")
      .sort({ date: 1 });

      

    res.json(bookings);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

router.put("/:id/cancel", protect, async (req, res) => {
  try{
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status: "Cancelled" },
    { new: true }
  )

  res.json(booking);
   } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error cancelling bookings" });
  }
  
  
});

router.get("/open", protect, async (req, res) => {
  try{
  if (req.user.role !== "caregiver")
    return res.status(403).json({ message: "Access denied" });

const caregiver = await User.findById(req.user.id);

if (caregiver.onboardingStatus !== "active") {
  return res.json([])
}
const bookings = await Booking.find({ status: "Pending" })
  .populate({
    path: "pet",
    populate: {
      path: "owner",
      select: "city phone"
    }
  })
  .populate("service")
  .sort({ date: 1 });

const filtered = bookings.filter(b => {

  const slot = b.timeSlot.toLowerCase()

  let period = ""

  if (slot.includes("am")) period = "morning"
  else if (slot.includes("pm") && slot.includes("12")) period = "afternoon"
  else if (slot.includes("pm")) period = "evening"

  return caregiver.skills.includes(b.service.category) &&
         caregiver.availability.includes(period)
})


res.json(filtered);
    } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error opening bookings" });
  }
});

router.put("/:id/accept", protect, async (req, res) => {
  try{
  if (req.user.role !== "caregiver")
    return res.status(403).json({ message: "Access denied" });

const booking = await Booking.findOneAndUpdate(
  {
    _id: req.params.id,
    status: "Pending",
    caregiver: { $exists: false }
  },
  {
    status: "Accepted",
    caregiver: req.user.id
  },
  { new: true }
);

 if (!booking)
  return res.status(400).json({ message: "Not available" });

const populatedBooking = await Booking.findById(booking._id)
  .populate({
    path: "pet",
    populate: { path: "owner" }
  })
  .populate("caregiver")

const dateStr = new Date(populatedBooking.date)
  .toLocaleDateString("en-IN", { day: "numeric", month: "short" })

const timeStr = populatedBooking.timeSlot

// await sendSMS(
//   populatedBooking.pet.owner.phone,
//   `PawPaw: ${populatedBooking.caregiver.name} assigned for ${dateStr}, ${timeStr}.`
// )
booking.paymentStatus = "Unpaid";
await booking.save();
res.json(booking);
     } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error accepting bookings" });
  }
});

router.put("/:id/start", protect, async (req, res) => {
  try {

    if (req.user.role !== "caregiver")
      return res.status(403).json({ message: "Access denied" });

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, caregiver: req.user.id, status: "Accepted" },
      { status: "InProgress" },
      { new: true }
    )

    const populatedBooking = await Booking.findById(booking._id)
  .populate({
    path: "pet",
    populate: { path: "owner" }
  })

// await sendSMS(
//   populatedBooking.pet.owner.phone,
//   `PawPaw: Walk for ${populatedBooking.pet.name} started.`
// )

    res.json(booking)

  } catch (error) {
    res.status(500).json({ message: "Error starting job" })
  }
})

router.put("/:id/complete", protect, async (req, res) => {
  try {

    if (req.user.role !== "caregiver")
      return res.status(403).json({ message: "Access denied" });

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, caregiver: req.user.id, status: "InProgress" },
      { status: "Completed" },
      { new: true }
    )

    const populatedBooking = await Booking.findById(booking._id)
  .populate({
    path: "pet",
    populate: { path: "owner" }
  })

// await sendSMS(
//   populatedBooking.pet.owner.phone,
//   `PawPaw: Walk for ${populatedBooking.pet.name} completed 🐾`
// )

    res.json(booking)

  } catch (error) {
    res.status(500).json({ message: "Error completing job" })
  }
})

router.get("/my-assignments", protect, async (req, res) => {
  try {
    if (req.user.role !== "caregiver") {
      return res.status(403).json({ message: "Access denied" });
    }

    const bookings = await Booking.find({
      caregiver: req.user.id,
      status: { $in: ["Accepted", "InProgress"] }
    })
      .populate({
        path: "pet",
        populate: {
          path: "owner",
          select: "city phone"
        }
      })
      .populate("service")
      .sort({ date: 1 });

const caregiver = await User.findById(req.user.id);

const filtered = bookings.filter(b =>
  caregiver.skills.includes(b.service.category)
);

res.json(filtered);    

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching assignments" });
  }
});


router.get("/", async (req,res)=>{
  try{
    const bookings = await Booking.find()
    res.json(bookings)
  }catch(err){
    res.status(500).json({message:"Error fetching bookings"})
  }
})
router.get("/caregiver", protect, async (req, res) => {
  try {
    if (req.user.role !== "caregiver") {
      return res.status(403).json({ message: "Access denied" });
    }

    const bookings = await Booking.find({ caregiver: req.user.id })
      .populate("pet")
      .sort({ date: -1 });

    res.json(bookings);

  } catch (err) {
    res.status(500).json({ message: "Error fetching caregiver bookings" });
  }
});

module.exports = router;