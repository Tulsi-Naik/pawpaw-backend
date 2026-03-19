const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Pet = require("../models/Pet");
const upload = require("../middleware/upload")

// Add new pet
router.post("/add", protect, upload.single("profilePhoto"), async (req, res) => {
    try {
const {
  name,
  type,
  breed,
  dateOfBirth,
  energyLevel,
  friendliness,
  anxietyLevel,
  walkSpeed,
  dogFriendly,
  kidFriendly,
  allergies,
  medicalNotes,
  fears,
  favoriteTreat
} = req.body;

 const pet = await Pet.create({
  name,
  type,
  breed,
  dateOfBirth,
  energyLevel,
  friendliness,
  anxietyLevel,
  walkSpeed,
  dogFriendly,
  kidFriendly,
  allergies,
  medicalNotes,
fears: fears ? JSON.parse(fears) : [],
    favoriteTreat,
  profilePhoto: req.file?.path,
  owner: req.user.id
});
    res.status(201).json({
      message: "Pet added successfully",
      pet
    });

  } catch (error) {
    res.status(500).json({ message: "Error adding pet" });
  }
});

// Get all pets of logged-in user
router.get("/my", protect, async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.id });
    res.json(pets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pets" });
  }
});
router.put("/:id", protect, upload.single("profilePhoto"), async (req, res) => {
  try {

    const updateData = {
      ...req.body,
      fears: req.body.fears ? JSON.parse(req.body.fears) : []
    }

    if (req.file) {
      updateData.profilePhoto = req.file.path
    }

    const updatedPet = await Pet.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updateData,
      { returnDocument: "after" }
    )

    res.json(updatedPet)

  } catch (error) {
    res.status(500).json({ message: "Error updating pet" })
  }
})
router.delete("/:id", protect, async (req, res) => {
  await Pet.findOneAndDelete({
    _id: req.params.id,
    owner: req.user.id
  })

  res.json({ message: "Pet deleted" })
})
module.exports = router;