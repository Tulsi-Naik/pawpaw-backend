const User = require("../models/User");
const Booking = require("../models/Booking");

exports.getCaregivers = async (req, res) => {
  try {
    const { city, skill, status, search } = req.query;

    let query = { role: "caregiver" };

    if (city) query.city = city;

    if (skill) {
      query.skills = { $in: [skill] };
    }

    if (status) {
      if (status === "Active") query.onboardingStatus = "active";
      if (status === "Pending") query.onboardingStatus = "pending_setup";
      if (status === "Blocked") query.onboardingStatus = "suspended";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const caregivers = await User.find(query).sort({ createdAt: -1 });

    const enriched = await Promise.all(
      caregivers.map(async (cg) => {
        const bookings = await Booking.find({ caregiver: cg._id });

        const totalBookings = bookings.length;

        const completedBookings = bookings.filter(
          b => b.status === "Completed"
        ).length;

        const earnings = bookings.reduce(
          (sum, b) => sum + (b.caregiverEarning || 0),
          0
        );

        return {
          ...cg.toObject(),
          totalBookings,
          completedBookings,
          earnings
        };
      })
    );

    res.json(enriched);

  } catch (err) {
    res.status(500).json({ message: "Error fetching caregivers" });
  }
};

exports.toggleCaregiverStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const caregiver = await User.findById(id);

    if (!caregiver || caregiver.role !== "caregiver") {
      return res.status(404).json({ message: "Caregiver not found" });
    }

    // toggle
    caregiver.onboardingStatus =
      caregiver.onboardingStatus === "suspended"
        ? "active"
        : "suspended";

    await caregiver.save();

    res.json({
      message: "Status updated",
      caregiver
    });

  } catch {
    res.status(500).json({ message: "Error updating status" });
  }
};