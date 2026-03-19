const User = require("../models/User");

exports.setupProfile = async (req, res) => {
  try {

    const {
      bio,
      serviceRadius,
      dogSizesHandled,
      availability,
      phone,
      city,
      upiId
    } = req.body

    const updateData = {
      bio,
      serviceRadius,
      dogSizesHandled: JSON.parse(dogSizesHandled || "[]"),
      availability: JSON.parse(availability || "[]"),
      phone,
      city,
      upiId,
      onboardingStatus: "active"
    }

    if (req.file) {
      updateData.profilePhoto = req.file.path
    }

    const caregiver = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    )

    res.json({
      message: "Profile updated",
      caregiver
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Error updating caregiver profile" })
  }
}